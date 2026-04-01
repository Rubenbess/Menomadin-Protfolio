'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Building2, GitMerge, Upload, FileDown, LogOut, Network, Bell, Users, Activity, ShieldCheck, Mail, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Suspense, useEffect, useState } from 'react'
import StrategyFilter from './StrategyFilter'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/companies',      label: 'Companies',    icon: Building2 },
  { href: '/portfolio-kpis', label: 'Portfolio KPIs', icon: Activity },
  { href: '/pipeline',   label: 'Pipeline',     icon: GitMerge },
  { href: '/contacts',   label: 'Contacts',     icon: Users },
  { href: '/documents',  label: 'Documents',    icon: FolderOpen },
  { href: '/network',    label: 'Co-investors', icon: Network },
  { href: '/reminders',  label: 'Reminders',    icon: Bell },
  { href: '/import',              label: 'Import Data',  icon: Upload },
  { href: '/reports',             label: 'Reports',      icon: FileDown },
  { href: '/settings/security',       label: 'Security',       icon: ShieldCheck },
  { href: '/settings/email-scanner',  label: 'Email Scanner',  icon: Mail },
]

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

function NavLinks() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const strategy = searchParams.get('strategy') ?? ''

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        const to = strategy ? `${href}?strategy=${strategy}` : href
        return (
          <Link
            key={href}
            href={to}
            className={`
              group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${active
                ? 'bg-violet-500/15 text-violet-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }
            `}
          >
            <Icon
              size={16}
              className={active ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}
            />
            {label}
            {href === '/reminders' && !active && <ReminderBadge />}
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06] dark:border-slate-700 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950"
      style={{
        background: 'linear-gradient(180deg, #0f0f1e 0%, #0d0d1a 100%)',
      }}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-violet-500/30">
            <img
              src="/menomadin-icon.svg"
              alt="Menomadin Group"
              className="h-4 w-4 invert"
            />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-sm tracking-tight leading-none">
              Menomadin
            </p>
            <p className="text-slate-500 text-[10px] tracking-widest uppercase leading-none mt-1">
              Portfolio
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <Suspense fallback={
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500">
              <Icon size={16} />{label}
            </Link>
          ))}
        </nav>
      }>
        <NavLinks />
      </Suspense>

      {/* Strategy filter */}
      <div className="border-t border-white/[0.06] pt-3">
        <Suspense fallback={null}>
          <StrategyFilter />
        </Suspense>
      </div>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
