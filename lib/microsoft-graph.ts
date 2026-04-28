/**
 * Shared Microsoft Graph helpers for the platform's Outlook integration.
 *
 * Used by:
 *   • app/api/cron/scan-emails (inbox scanning)
 *   • app/api/outlook/search-messages (picker search)
 *   • app/api/outlook/messages/[id] (full message fetch)
 *   • actions/task-emails (server actions that attach Outlook emails to tasks)
 *
 * Tokens are stored in the email_integrations table (one row per user).
 * Use a service-role Supabase client when calling these helpers from RLS-restricted
 * contexts (server actions/components) so the token row is reachable.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface EmailIntegration {
  id: string
  user_id: string
  email: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string
  last_scanned_at: string | null
}

export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Refresh the access token for a user's Outlook integration via Microsoft's
 * refresh-token grant. Persists the new tokens back to email_integrations.
 * Returns the new access token, or null if refresh failed.
 */
export async function refreshAccessToken(
  integration: EmailIntegration,
  supabase: SupabaseClient
): Promise<string | null> {
  if (!integration.refresh_token) return null

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token,
      scope: 'offline_access Mail.Read User.Read',
    }),
  })

  const tokens = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!tokens.access_token) return null

  await supabase
    .from('email_integrations')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? integration.refresh_token,
      token_expires_at: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', integration.id)

  return tokens.access_token
}

/** Returns a non-expired access token, refreshing 5 min before expiry. */
export async function getValidAccessToken(
  integration: EmailIntegration,
  supabase: SupabaseClient
): Promise<string | null> {
  const expiresAt = new Date(integration.token_expires_at).getTime()
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshAccessToken(integration, supabase)
  }
  return integration.access_token
}

/**
 * Convenience: load the integration for `userId` and return a valid access token.
 * Returns null when the user hasn't connected Outlook or refresh failed.
 */
export async function getAccessTokenForUser(
  userId: string
): Promise<{ token: string; integration: EmailIntegration } | null> {
  const supabase = createServiceRoleClient()
  const { data: integration } = await supabase
    .from('email_integrations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!integration) return null
  const token = await getValidAccessToken(integration as EmailIntegration, supabase)
  return token ? { token, integration: integration as EmailIntegration } : null
}

// ─── Graph API wrappers ─────────────────────────────────────────────────────

export interface GraphRecipient {
  emailAddress: { name?: string; address?: string }
}

export interface GraphMessageSummary {
  id: string
  subject: string | null
  bodyPreview: string
  from: GraphRecipient | null
  receivedDateTime: string
  hasAttachments: boolean
  webLink?: string
}

export interface GraphMessage extends GraphMessageSummary {
  toRecipients: GraphRecipient[]
  ccRecipients: GraphRecipient[]
  body: { contentType: 'html' | 'text'; content: string }
}

/** Search the user's mailbox. `query` is a Graph $search string (free text). */
export async function searchMessages(
  accessToken: string,
  query: string,
  limit = 25
): Promise<GraphMessageSummary[]> {
  const params = new URLSearchParams({
    $top: String(Math.min(Math.max(limit, 1), 50)),
    $select: 'id,subject,bodyPreview,from,receivedDateTime,hasAttachments,webLink',
  })
  if (query.trim()) {
    params.set('$search', `"${query.replace(/"/g, '\\"')}"`)
  } else {
    params.set('$orderby', 'receivedDateTime desc')
  }

  const url = `https://graph.microsoft.com/v1.0/me/messages?${params}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // $search requires this header per Graph docs
      ConsistencyLevel: 'eventual',
    },
  })

  if (!res.ok) return []
  const data = (await res.json()) as { value?: GraphMessageSummary[] }
  return data.value ?? []
}

/** Fetch a single message with full body. Used when snapshotting. */
export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GraphMessage | null> {
  const params = new URLSearchParams({
    $select:
      'id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,webLink,body',
  })
  const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(
    messageId
  )}?${params}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return (await res.json()) as GraphMessage
}
