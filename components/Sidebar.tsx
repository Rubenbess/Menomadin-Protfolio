'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, Building2, GitMerge, Upload, FileDown, LogOut,
  Network, Bell, Users, Activity, ShieldCheck, Mail, FolderOpen,
  CheckSquare, ChevronLeft, BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Suspense, useEffect, useState } from 'react'
import StrategyFilter from './StrategyFilter'

export interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type NavItemDef = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: 'reminder' | 'tasks'
}

const MAIN_MENU: NavItemDef[] = [
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/companies',      label: 'Companies',      icon: Building2 },
  { href: '/portfolio-kpis', label: 'Portfolio KPIs', icon: Activity },
  { href: '/pipeline',       label: 'Pipeline',       icon: GitMerge },
  { href: '/tasks',          label: 'Tasks',          icon: CheckSquare, badge: 'tasks' },
  { href: '/contacts',       label: 'Contacts',       icon: Users },
  { href: '/documents',      label: 'Documents',      icon: FolderOpen },
  { href: '/reports',        label: 'Reports',        icon: FileDown },
]

const TOOLS: NavItemDef[] = [
  { href: '/analytics', label: 'Analytics',    icon: BarChart3 },
  { href: '/network',   label: 'Co-investors', icon: Network },
  { href: '/reminders', label: 'Reminders',    icon: Bell, badge: 'reminder' },
  { href: '/import',    label: 'Import Data',  icon: Upload },
]

const SETTINGS_NAV: NavItemDef[] = [
  { href: '/settings/security',      label: 'Security',      icon: ShieldCheck },
  { href: '/settings/email-scanner', label: 'Email Scanner', icon: Mail },
]

const SUPPORT: NavItemDef[] = []

const ALL_ITEMS = [...MAIN_MENU, ...TOOLS, ...SETTINGS_NAV, ...SUPPORT]

// ── Badges ─────────────────────────────────────────────────────────────────────

function ReminderBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('completed', false)
      .lte('due_date', today)
      .then(({ count: n }) => setCount(n ?? 0))
  }, [])

  if (!count) return null
  return (
    <span className="ml-auto flex-shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function TasksBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayString = today.toISOString().split('T')[0]
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'Done')
      .neq('status', 'Cancelled')
      .lt('due_date', todayString)
      .then(({ count: n }) => setCount(n ?? 0))
  }, [])

  if (!count) return null
  return (
    <span className="ml-auto flex-shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}

// ── Single nav link ────────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  to,
  collapsed,
}: {
  item: NavItemDef
  active: boolean
  to: string
  collapsed: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={to}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center rounded-lg text-sm font-medium transition-all duration-150
        ${collapsed ? 'px-0 py-2 justify-center w-full' : 'gap-3 px-3 py-2.5'}
        ${active
          ? 'bg-primary-500/15 text-blue-200'
          : 'text-neutral-500 hover:text-slate-200 hover:bg-white/5'}
      `}
    >
      <Icon
        size={16}
        className={`flex-shrink-0 transition-colors ${
          active ? 'text-primary-300' : 'text-neutral-600 group-hover:text-slate-300'
        }`}
      />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.label}</span>
          {item.badge === 'reminder' && !active && <ReminderBadge />}
          {item.badge === 'tasks'    && !active && <TasksBadge />}
          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-300 flex-shrink-0" />}
        </>
      )}
    </Link>
  )
}

// ── Nav section group ──────────────────────────────────────────────────────────

function NavSection({
  label,
  items,
  pathname,
  strategy,
  collapsed,
}: {
  label: string
  items: NavItemDef[]
  pathname: string
  strategy: string
  collapsed: boolean
}) {
  return (
    <div>
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[9px] font-bold text-neutral-700 uppercase tracking-[0.12em]">
          {label}
        </p>
      )}
      {collapsed && <div className="mx-auto w-4 h-px bg-white/10 mb-2" />}
      <div className="space-y-0.5">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const to = strategy ? `${item.href}?strategy=${strategy}` : item.href
          return (
            <NavLink key={item.href} item={item} active={active} to={to} collapsed={collapsed} />
          )
        })}
      </div>
    </div>
  )
}

// ── Nav links (needs Suspense for useSearchParams) ─────────────────────────────

function NavLinks({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const strategy = searchParams.get('strategy') ?? ''

  const sections = [
    { label: 'MAIN MENU', items: MAIN_MENU },
    { label: 'TOOLS',     items: TOOLS },
    { label: 'SETTINGS',  items: SETTINGS_NAV },
  ]

  return (
    <nav className={`flex-1 py-4 overflow-y-auto space-y-5 ${collapsed ? 'px-2' : 'px-3'}`}>
      {sections.map(s => (
        <NavSection
          key={s.label}
          label={s.label}
          items={s.items}
          pathname={pathname}
          strategy={strategy}
          collapsed={collapsed}
        />
      ))}
    </nav>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={`
        flex-shrink-0 flex flex-col border-r border-white/[0.06]
        transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-14' : 'w-56'}
      `}
      style={{ background: 'linear-gradient(180deg, #0f0f1e 0%, #0d0d1a 100%)' }}
    >
      {/* Brand header */}
      <div className="h-16 border-b border-white/[0.06] flex-shrink-0">
        {collapsed ? (
          /* Collapsed: clicking the icon expands */
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="w-full h-full flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center ring-1 ring-primary-400/30">
              <img src="/menomadin-icon.svg" alt="Menomadin" className="h-4 w-4 invert" />
            </div>
          </button>
        ) : (
          /* Expanded: logo + text + collapse button */
          <div className="h-full flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-primary-400/30">
              <img src="/menomadin-icon.svg" alt="Menomadin" className="h-4 w-4 invert" />
            </div>
            <div className="leading-tight flex-1 min-w-0">
              <p className="text-white font-bold text-sm tracking-tight leading-none truncate">
                Menomadin
              </p>
              <p className="text-neutral-600 text-[10px] tracking-widest uppercase leading-none mt-1">
                Portfolio
              </p>
            </div>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-600 hover:text-slate-300 hover:bg-white/5 transition-all flex-shrink-0"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Nav links */}
      <Suspense
        fallback={
          <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
            {ALL_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center rounded-lg text-sm font-medium text-neutral-600 ${
                  collapsed ? 'py-2 justify-center' : 'gap-3 px-3 py-2.5'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && label}
              </Link>
            ))}
          </nav>
        }
      >
        <NavLinks collapsed={collapsed} />
      </Suspense>

      {/* Strategy filter (expanded only) */}
      {!collapsed && (
        <div className="border-t border-white/[0.06] pt-3">
          <Suspense fallback={null}>
            <StrategyFilter />
          </Suspense>
        </div>
      )}

      {/* Sign out */}
      <div className={`pb-4 border-t border-white/[0.06] pt-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={`
            w-full flex items-center rounded-lg text-sm font-medium
            text-neutral-600 hover:text-slate-200 hover:bg-white/5 transition-all
            ${collapsed ? 'py-2 justify-center' : 'gap-3 px-3 py-2.5'}
          `}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
