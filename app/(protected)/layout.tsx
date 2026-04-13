import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

  // Fetch team_member row — auto-create on first login
  let { data: member } = await supabase
    .from('team_members')
    .select('id, name, color, initials, job_title')
    .eq('id', user.id)
    .maybeSingle()

  const isNewUser = !member

  if (!member && user.email) {
    const name = user.email.split('@')[0]
    const initials = name.slice(0, 2).toUpperCase()
    const { data: created } = await supabase
      .from('team_members')
      .insert({ id: user.id, name, email: user.email, role: 'admin', color: '#5a7fa8', initials })
      .select('id, name, color, initials, job_title')
      .single()
    member = created
  }

  // Redirect new users (or those who haven't completed their profile) to /profile.
  // Skip if already on /profile, /mfa, or /settings to prevent redirect loops.
  const headersList = await headers()
  const currentPath = headersList.get('x-pathname') || ''
  const profileIncomplete = isNewUser || !member?.job_title
  const isSafeToRedirect =
    currentPath !== '' &&
    !currentPath.startsWith('/profile') &&
    !currentPath.startsWith('/mfa') &&
    !currentPath.startsWith('/settings')
  if (profileIncomplete && isSafeToRedirect) {
    redirect('/profile?welcome=1')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <AppShell
      initialNotifications={(notifications ?? []) as Notification[]}
      userProfile={member ? { name: member.name, color: member.color, initials: member.initials } : null}
    >
      {children}
    </AppShell>
  )
}
