import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { initializeTeamForNewUser } from '@/actions/team'
import type { Notification } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user is a team member
  let { data: teamMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // If not a team member and no pending invites, auto-initialize as first user (admin)
  if (!teamMember) {
    const { count } = await supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })

    // If this is the first user, initialize them as admin
    if (count === 0) {
      try {
        await initializeTeamForNewUser(user.id, user.email || '', user.user_metadata?.name)
        // Refetch to confirm
        const { data: newTeamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', user.id)
          .single()
        teamMember = newTeamMember
      } catch (err) {
        console.error('Failed to initialize team:', err)
      }
    }
  }

  // If still not a team member, show pending invite page
  if (!teamMember) {
    redirect('/pending-invite')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  return <AppShell initialNotifications={(notifications ?? []) as Notification[]}>{children}</AppShell>
}
