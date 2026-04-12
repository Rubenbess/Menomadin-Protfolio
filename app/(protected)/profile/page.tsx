import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'
import { getMyTasks, getMyPipeline, getMyCompanies, getMyActivity, getAllTeamMembers } from '@/actions/profile'
import type { TeamMember } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [
    { tasks },
    { deals },
    { companies },
    { activities },
    { members },
  ] = await Promise.all([
    getMyTasks(),
    getMyPipeline(),
    getMyCompanies(),
    getMyActivity(),
    getAllTeamMembers(),
  ])

  return (
    <ProfileClient
      profile={profile as TeamMember}
      tasks={tasks as any[]}
      deals={deals as any[]}
      companies={companies as any[]}
      activities={activities as any[]}
      teamMembers={members as any[]}
      isWelcome={welcome === '1'}
    />
  )
}
