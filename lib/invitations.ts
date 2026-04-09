import { createClient } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { UserRole } from '@/lib/types'
import { nanoid } from 'nanoid'

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
    const supabase = createClient()

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
      })
      .select()
      .single()

    if (error) {
      // Check if invitation already exists for this email
      if (error.code === '23505') {
        return { success: false, error: `An invitation is already pending for ${email}` }
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
 * Send invitation email (implement with your email service)
 * This is a placeholder - integrate with SendGrid, Resend, etc.
 */
async function sendInvitationEmail(
  email: string,
  invitationLink: string,
  role: UserRole
): Promise<void> {
  // TODO: Implement email sending with your email service
  // Example with Resend:
  // const result = await resend.emails.send({
  //   from: 'invites@menomadin.com',
  //   to: email,
  //   subject: `Join Menomadin as ${role}`,
  //   html: `
  //     <p>You've been invited to join Menomadin as a ${role}.</p>
  //     <p><a href="${invitationLink}">Accept invitation</a></p>
  //   `
  // })

  console.log(`[Email] Invitation sent to ${email}:`, invitationLink)
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
