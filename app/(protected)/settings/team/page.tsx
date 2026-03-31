import { getTeamMembers, getTeamInvites } from '@/actions/team'
import TeamSettingsClient from './TeamSettingsClient'

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  const members = await getTeamMembers()
  const invites = await getTeamInvites()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
        <p className="text-slate-600 mt-2">Manage team members and invitations</p>
      </div>

      <TeamSettingsClient initialMembers={members} initialInvites={invites} />
    </div>
  )
}
