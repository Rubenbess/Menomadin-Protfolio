import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Notification } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Auto-create team_member row if this user has never been registered
  // Runs on every page load but the SELECT is fast and the INSERT is no-op after first time
  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingMember && user.email) {
    await supabase.from('team_members').insert({
      user_id: user.id,
      name: user.email.split('@')[0],
      email: user.email,
      role: 'admin',
      color: '#6366f1',
    })
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  return <AppShell initialNotifications={(notifications ?? []) as Notification[]}>{children}</AppShell>
}
