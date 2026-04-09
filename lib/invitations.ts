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
        return { success: false, error: `An invitation is already pending for ${email}. Revoke it first or use a different email.` }
      }
      return { success: false, error: error.message }
    }

    // Generate invitation link
    const invitationLink = `${siteUrl}/auth/invite?code=${code}`

    // Send email (implement based on your email service)
    await sendInvitationEmail(email, invitationLink, role)

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
    const supabase = await createServerSupabaseClient()

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
export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
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
 * Send invitation email using Resend
 */
async function sendInvitationEmail(
  email: string,
  invitationLink: string,
  role: UserRole
): Promise<void> {
  try {
    // Check if API key is configured
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('[Email] RESEND_API_KEY not configured. Email not sent.')
      console.log(`[Email Test] Would send to ${email}:`, invitationLink)
      return
    }

    const resend = new Resend(apiKey)

    const roleDescriptions: Record<UserRole, string> = {
      admin: 'full access with permission management',
      associate: 'create and edit permissions',
      viewer: 'read-only access',
    }

    console.log(`[Email] Attempting to send invitation to ${email}...`)

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Join Menomadin',
      html: generateInvitationEmailHTML(invitationLink, role, roleDescriptions[role]),
    })

    if (result.error) {
      console.error('[Email] Failed to send:', {
        error: result.error,
        to: email,
      })
    } else if (result.data?.id) {
      console.log(`[Email] ✓ Sent successfully to ${email} (ID: ${result.data.id})`)
    } else {
      console.log(`[Email] Email queued to ${email}`)
    }
  } catch (error) {
    console.error('[Email] Exception:', {
      message: error instanceof Error ? error.message : String(error),
      email,
    })
  }
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
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #1f2937;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 700;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .content h2 {
            margin-top: 0;
            color: #111827;
            font-size: 20px;
          }
          .role-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-transform: capitalize;
          }
          .description {
            color: #6b7280;
            font-size: 14px;
            margin: 15px 0;
          }
          .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
          }
          .cta-button:hover {
            background: #1e40af;
          }
          .footer {
            color: #9ca3af;
            font-size: 12px;
            text-align: center;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
          }
          .permissions-list {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #3b82f6;
          }
          .permissions-list ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .permissions-list li {
            margin: 8px 0;
            color: #374151;
          }
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
                ${role !== 'viewer' ? '<li>✓ Create and edit records</li>' : ''}
                ${role === 'admin' ? '<li>✓ Delete records</li><li>✓ Manage team permissions</li>' : ''}
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
            <p>© 2026 Menomadin. All rights reserved.</p>
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
