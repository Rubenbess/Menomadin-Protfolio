'use server'

import { createClient } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { UserRole } from '@/lib/types'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'

export interface Invitation {
    id: string
    email: string
    invited_role: UserRole
    code: string
    status: 'pending' | 'accepted' | 'expired'
    invited_by: string
    created_at: string
    expires_at: string
    accepted_at?: string
}

/**
 * Send invitation to a new team member by email
 */
export async function sendInvitation(
    email: string,
    role: UserRole,
    siteUrl: string
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
          const supabase = await createServerSupabaseClient()

      // Get current user
      const {
              data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
              return { success: false, error: 'You must be logged in to send invitations' }
      }

      // Generate unique code
      const code = nanoid(32)

      // Create invitation
      const { data, error } = await supabase
            .from('invitations')
            .insert({
                      email: email.toLowerCase(),
                      invited_role: role,
                      code,
                      status: 'pending',
                      invited_by: user.id,
            })
            .select()
            .single()

      if (error) {
              // Check if invitation already exists for this email
            if (error.code === '23505' || error.message?.includes('unique')) {
                      return {
                                  success: false,
                                  error: `An invitation is already pending for ${email}. Revoke it first or use a different email.`,
                      }
            }
              return { success: false, error: error.message }
      }

      // Generate invitation link
      const invitationLink = `${siteUrl}/auth/invite?code=${code}`

      // Send email — now properly awaited and errors surfaced
      const emailResult = await sendInvitationEmail(email, invitationLink, role)

      if (!emailResult.success) {
              // Roll back the invitation record so the user can retry after fixing the config
            await supabase.from('invitations').delete().eq('code', code)
              return {
                        success: false,
                        error: `Invitation created but email failed to send: ${emailResult.error}. Please check your Resend configuration.`,
              }
      }

      return { success: true, code }
    } catch (error) {
          return { success: false, error: String(error) }
    }
}

/**
 * Get invitation by code
 */
export async function getInvitationByCode(code: string): Promise<Invitation | null> {
    try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('code', code)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .single()

      if (error || !data) return null
          return data as Invitation
    } catch (error) {
          console.error('Error getting invitation:', error)
          return null
    }
}

/**
 * Accept invitation - called after user logs in
 */
export async function acceptInvitation(
    code: string,
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
          const supabase = createClient()

      // Call the accept_invitation function
      const { data, error } = await supabase.rpc('accept_invitation', {
              p_code: code,
              p_user_id: userId,
              p_user_name: userName,
              p_user_email: userEmail.toLowerCase(),
      })

      if (error) {
              return { success: false, error: error.message }
      }

      if (!data) {
              return { success: false, error: 'Invalid or expired invitation' }
      }

      return { success: true }
    } catch (error) {
          return { success: false, error: String(error) }
    }
}

/**
 * List pending invitations (admin only)
 */
export async function getPendingInvitations(): Promise<Invitation[]> {
    try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })

      if (error || !data) return []
            return data as Invitation[]
    } catch (error) {
          console.error('Error getting pending invitations:', error)
          return []
    }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
    invitationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
          const supabase = createClient()
          const { error } = await supabase
            .from('invitations')
            .update({ status: 'expired' })
            .eq('id', invitationId)

      if (error) {
              return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
          return { success: false, error: String(error) }
    }
}

/**
 * Send invitation email using Resend.
 *
 * ROOT CAUSE FIX NOTES:
 * ─────────────────────────────────────────────────────────────────
 * 1. onboarding@resend.dev can ONLY deliver to the single email
 *    address that is verified on your Resend account (your own
 *    account email).  It will silently reject all other recipients.
 *    → Add & verify your own domain at https://resend.com/domains
 *      and change `from` to e.g. "noreply@yourdomain.com".
 *
 * 2. The previous version caught all errors silently, so the
 *    server action always returned { success: true } even when
 *    Resend rejected the call.
 *    → Now the function returns { success, error } and the caller
 *      rolls back the DB row and surfaces the error to the UI.
 * ─────────────────────────────────────────────────────────────────
 */
async function sendInvitationEmail(
    email: string,
    invitationLink: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    // ── 1. Validate environment ───────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
          const msg = 'RESEND_API_KEY environment variable is not set.'
          console.error('[Email] ✗', msg)
          return { success: false, error: msg }
    }

  // Log key prefix so you can confirm it matches what's in Resend dashboard
  console.log('[Email] API key prefix:', apiKey.substring(0, 7))

  // ── 2. Sender address ─────────────────────────────────────────
  // IMPORTANT: While you have no verified domain, onboarding@resend.dev
  // only works when `to` is YOUR OWN Resend account email.
  // Set RESEND_FROM_EMAIL in Vercel once you verify a domain, e.g.:
  //   RESEND_FROM_EMAIL=noreply@yourdomain.com
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    console.log(`[Email] From: ${fromEmail}  →  To: ${email}`)

  // ── 3. Send ───────────────────────────────────────────────────
  const resend = new Resend(apiKey)

  const roleDescriptions: Record<UserRole, string> = {
        admin: 'full access with permission management',
        associate: 'create and edit permissions',
        viewer: 'read-only access',
  }

  const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Join Menomadin',
        html: generateInvitationEmailHTML(invitationLink, role, roleDescriptions[role]),
  })

  // ── 4. Surface ALL errors ─────────────────────────────────────
  if (error) {
        console.error('[Email] ✗ Resend API error:', JSON.stringify(error, null, 2))
        return {
                success: false,
                error: `Resend error ${(error as any).statusCode ?? ''}: ${(error as any).message ?? JSON.stringify(error)}`,
        }
  }

  if (!data?.id) {
        const msg = 'Resend returned no email ID and no error — unexpected response.'
        console.warn('[Email] ⚠', msg, data)
        return { success: false, error: msg }
  }

  console.log(`[Email] ✓ Sent successfully to ${email} (Resend ID: ${data.id})`)
    return { success: true }
}

/**
 * Generate HTML for invitation email
 */
function generateInvitationEmailHTML(
    invitationLink: string,
    role: UserRole,
    roleDescription: string
  ): string {
    return `
        <!DOCTYPE html>
            <html>
                  <head>
                          <meta charset="utf-8">
                                  <style>
                                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; line-height: 1.6; }
                                                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                                                .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 40px 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
                                                                          .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
                                                                                    .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
                                                                                              .content h2 { margin-top: 0; color: #111827; font-size: 20px; }
                                                                                                        .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 6px; font-weight: 600; margin: 20px 0; text-transform: capitalize; }
                                                                                                                  .description { color: #6b7280; font-size: 14px; margin: 15px 0; }
                                                                                                                            .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
                                                                                                                                      .footer { color: #9ca3af; font-size: 12px; text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; }
                                                                                                                                                .permissions-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3b82f6; }
                                                                                                                                                          .permissions-list ul { margin: 10px 0; padding-left: 20px; }
                                                                                                                                                                    .permissions-list li { margin: 8px 0; color: #374151; }
                                                                                                                                                                            </style>
                                                                                                                                                                                  </head>
                                                                                                                                                                                        <body>
                                                                                                                                                                                                <div class="container">
                                                                                                                                                                                                          <div class="header">
                                                                                                                                                                                                                      <h1>Welcome to Menomadin</h1>
                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                          <div class="content">
                                                                                                                                                                                                                                                      <h2>You've been invited to join our team!</h2>
                                                                                                                                                                                                                                                                  <p>We're excited to have you on board. You've been invited to join Menomadin with the following role:</p>
                                                                                                                                                                                                                                                                              <div class="role-badge">${role}</div>
                                                                                                                                                                                                                                                                                          <p class="description">This role gives you ${roleDescription}.</p>
                                                                                                                                                                                                                                                                                                      <div class="permissions-list">
                                                                                                                                                                                                                                                                                                                    <strong>What you can do:</strong>
                                                                                                                                                                                                                                                                                                                                  <ul>
                                                                                                                                                                                                                                                                                                                                                  <li>View all company and portfolio data</li>
                                                                                                                                                                                                                                                                                                                                                                  ${role !== 'viewer' ? '<li>&#10003; Create and edit records</li>' : ''}
                                                                                                                                                                                                                                                                                                                                                                                  ${role === 'admin' ? '<li>&#10003; Delete records</li><li>&#10003; Manage team permissions</li>' : ''}
                                                                                                                                                                                                                                                                                                                                                                                                </ul>
                                                                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                                                                        <p style="margin-bottom: 30px;">Click the button below to accept your invitation and get started:</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                    <div style="text-align: center;">
                                                                                                                                                                                                                                                                                                                                                                                                                                                  <a href="${invitationLink}" class="cta-button">Accept Invitation</a>
                                                                                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <p style="color: #9ca3af; font-size: 12px;">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <strong>Link expires in 7 days</strong><br>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      If you have any questions, please contact your team administrator.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <div class="footer">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <p>&copy; 2026 Menomadin. All rights reserved.</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              <p>This is an automated message, please do not reply to this email.</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </body>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          </html>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            `
}

/**
 * Check if user has any pending invitations
 */
export async function getUserInvitation(email: string): Promise<Invitation | null> {
    try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

      if (error || !data) return null
          return data as Invitation
    } catch (error) {
          return null
    }
}
