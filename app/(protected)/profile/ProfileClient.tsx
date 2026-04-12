'use client'

import { useState, useTransition, useOptimistic } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Edit2, X, Check, Mail, Phone, Linkedin,
  Briefcase, ExternalLink, CheckSquare, TrendingUp,
  Building2, Activity, Users, Clock, AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { updateProfile } from '@/actions/profile'
import type { TeamMember } from '@/lib/types'

type Tab = 'tasks' | 'pipeline' | 'portfolio' | 'activity' | 'team'

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const STATUS_STYLES: Record<string, string> = {
  'To do': 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  'In progress': 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  'Waiting': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function InitialsAvatar({ name, initials, color, size = 'lg' }: {
  name: string
  initials: string | null
  color: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const letters = initials || name.slice(0, 2).toUpperCase()
  const sizeClass = size === 'lg'
    ? 'w-20 h-20 text-2xl'
    : size === 'md'
    ? 'w-10 h-10 text-sm'
    : 'w-8 h-8 text-xs'

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ring-4 ring-white dark:ring-neutral-900`}
      style={{ backgroundColor: color || '#5a7fa8' }}
    >
      {letters}
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-600">
      <Icon size={40} className="mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface Props {
  profile: TeamMember
  tasks: any[]
  deals: any[]
  companies: any[]
  activities: any[]
  teamMembers: any[]
  isWelcome?: boolean
}

export default function ProfileClient({ profile, tasks, deals, companies, activities, teamMembers, isWelcome }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('tasks')
  const [editing, setEditing] = useState(!!isWelcome)

  const [optimisticProfile, setOptimisticProfile] = useOptimistic(
    profile,
    (curr, updates: Partial<TeamMember>) => ({ ...curr, ...updates })
  )

  const [form, setForm] = useState({
    name: profile.name,
    job_title: profile.job_title ?? '',
    phone: profile.phone ?? '',
    linkedin_url: profile.linkedin_url ?? '',
  })
  const [formError, setFormError] = useState('')

  function openEdit() {
    setForm({
      name: optimisticProfile.name,
      job_title: optimisticProfile.job_title ?? '',
      phone: optimisticProfile.phone ?? '',
      linkedin_url: optimisticProfile.linkedin_url ?? '',
    })
    setFormError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setFormError('')
  }

  function validateForm() {
    if (!form.name.trim()) return 'Name is required'
    if (form.linkedin_url && !form.linkedin_url.startsWith('http')) {
      return 'LinkedIn URL must start with http:// or https://'
    }
    return ''
  }

  function handleSave() {
    const err = validateForm()
    if (err) { setFormError(err); return }

    startTransition(async () => {
      const updates = {
        name: form.name.trim(),
        job_title: form.job_title.trim() || null,
        phone: form.phone.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
      }

      // Derive optimistic initials
      const nameParts = updates.name.split(/\s+/)
      const newInitials = nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : updates.name.slice(0, 2).toUpperCase()

      setOptimisticProfile({ ...updates, initials: newInitials })

      const result = await updateProfile(updates)
      if (result.error) {
        toast.error('Failed to save', { description: result.error })
      } else {
        toast.success('Profile updated')
        setEditing(false)
        if (isWelcome) {
          router.push('/dashboard')
        }
      }
    })
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'pipeline', label: 'My Pipeline', icon: TrendingUp, count: deals.length },
    { id: 'portfolio', label: 'My Portfolio', icon: Building2, count: companies.length },
    { id: 'activity', label: 'Recent Activity', icon: Activity, count: activities.length },
    { id: 'team', label: 'Team', icon: Users },
  ]

  const inputClass =
    'w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 ' +
    'rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all'

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back button — hidden on welcome flow */}
      {!isWelcome && (
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
      )}

      {/* Welcome banner */}
      {isWelcome && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Welcome to Menomadin Portfolio</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">
            Fill in your details below to complete your profile. You can update this anytime.
          </p>
        </div>
      )}

      {/* ── Profile Header Card ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
        {!editing ? (
          <div className="flex items-start gap-5">
            <InitialsAvatar
              name={optimisticProfile.name}
              initials={optimisticProfile.initials}
              color={optimisticProfile.color}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
                    {optimisticProfile.name}
                  </h1>
                  {optimisticProfile.job_title && (
                    <p className="text-sm font-medium text-primary-500 mt-0.5">{optimisticProfile.job_title}</p>
                  )}
                </div>
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex-shrink-0"
                >
                  <Edit2 size={13} />
                  Edit
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                <span className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  <Mail size={13} className="flex-shrink-0" />
                  {optimisticProfile.email}
                </span>
                {optimisticProfile.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    <Phone size={13} className="flex-shrink-0" />
                    {optimisticProfile.phone}
                  </span>
                )}
                {optimisticProfile.linkedin_url && (
                  <a
                    href={optimisticProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary-500 hover:underline"
                  >
                    <Linkedin size={13} className="flex-shrink-0" />
                    LinkedIn
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize">
                  {optimisticProfile.role}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Inline Edit Form ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Edit profile</h2>
              <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Display name *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Job title</label>
                <input
                  className={inputClass}
                  value={form.job_title}
                  onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                  placeholder="e.g. Investment Associate"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
                <input
                  className={inputClass + ' opacity-60 cursor-not-allowed'}
                  value={optimisticProfile.email}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Phone</label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                  type="tel"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">LinkedIn URL</label>
                <input
                  className={inputClass}
                  value={form.linkedin_url}
                  onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourname"
                  type="url"
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                <Check size={14} />
                {isPending ? 'Saving…' : isWelcome ? 'Save & continue' : 'Save changes'}
              </button>
              {!isWelcome && (
                <button
                  onClick={cancelEdit}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                tab === t.id
                  ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white dark:bg-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <t.icon size={13} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="p-5">

          {/* ── Tab 1: My Tasks ── */}
          {tab === 'tasks' && (
            tasks.length === 0
              ? <EmptyState icon={CheckSquare} message="No active tasks assigned to you" />
              : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {task.company && (
                            <Link href={`/companies/${task.company.id}`} className="text-xs text-neutral-400 hover:text-primary-500 transition-colors">
                              {task.company.name}
                            </Link>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-xs text-neutral-400">
                              <Clock size={10} />
                              {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${PRIORITY_STYLES[task.priority] || ''}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${STATUS_STYLES[task.status] || ''}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ── Tab 2: My Pipeline ── */}
          {tab === 'pipeline' && (
            deals.length === 0
              ? <EmptyState icon={TrendingUp} message="No pipeline deals assigned to you yet" />
              : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {deals.map((deal: any) => (
                    <Link key={deal.id} href={`/pipeline`} className="py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-5 px-5 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-primary-500 transition-colors truncate">{deal.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{deal.sector} · {deal.stage}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {deal.fundraising_ask && (
                          <span className="text-xs text-neutral-500">${(deal.fundraising_ask / 1e6).toFixed(1)}M</span>
                        )}
                        <span className="text-xs text-neutral-400">{formatDate(deal.updated_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
          )}

          {/* ── Tab 3: My Portfolio ── */}
          {tab === 'portfolio' && (
            companies.length === 0
              ? <EmptyState icon={Building2} message="No portfolio companies assigned to you yet" />
              : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {companies.map((co: any) => (
                    <Link key={co.id} href={`/companies/${co.id}`} className="py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-5 px-5 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-primary-500 transition-colors truncate">{co.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{co.sector} · {co.strategy}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0 ${
                        co.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : co.status === 'exited' ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {co.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )
          )}

          {/* ── Tab 4: Recent Activity ── */}
          {tab === 'activity' && (
            activities.length === 0
              ? <EmptyState icon={Activity} message="No activity recorded yet" />
              : (
                <div className="space-y-1">
                  {activities.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="font-medium capitalize">{act.action}</span>
                          {' '}<span className="text-neutral-500">{act.entity_type}</span>
                          {act.field_changed && (
                            <span className="text-neutral-400"> · {act.field_changed}</span>
                          )}
                        </p>
                        {act.old_value && act.new_value && (
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {act.old_value} → {act.new_value}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 flex-shrink-0 mt-0.5">{timeAgo(act.created_at)}</span>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ── Tab 5: Team ── */}
          {tab === 'team' && (
            teamMembers.length === 0
              ? <EmptyState icon={Users} message="No team members found" />
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teamMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <InitialsAvatar
                        name={member.name}
                        initials={member.initials}
                        color={member.color || '#5a7fa8'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{member.name}</p>
                        {member.job_title && (
                          <p className="text-xs text-primary-500 truncate">{member.job_title}</p>
                        )}
                        <p className="text-xs text-neutral-400 truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

        </div>
      </div>
    </div>
  )
}
