'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'
import type { Notification } from '@/lib/types'

interface UserProfile {
  name: string
  color: string
  initials: string | null
}

interface Props {
  children: React.ReactNode
  initialNotifications: Notification[]
  userProfile: UserProfile | null
}

function AvatarButton({ profile }: { profile: UserProfile }) {
  const letters = profile.initials || profile.name.slice(0, 2).toUpperCase()
  return (
    <Link
      href="/profile"
      title="My profile"
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-neutral-800 hover:ring-primary-300 transition-all flex-shrink-0"
      style={{ backgroundColor: profile.color || '#5a7fa8' }}
    >
      {letters}
    </Link>
  )
}

export default function AppShell({ children, initialNotifications, userProfile }: Props) {
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed')
      if (stored !== null) setSidebarCollapsed(stored === 'true')
    } catch {}
  }, [])

  function toggleCollapsed() {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
      return next
    })
  }

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900">

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleCollapsed} />
      </div>

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex md:hidden transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar collapsed={false} onToggle={() => {}} />
        <button
          onClick={() => setMobileOpen(false)}
          className="mt-4 ml-2 w-9 h-9 flex-shrink-0 bg-white rounded-lg shadow-lg flex items-center justify-center text-neutral-700 self-start"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md bg-primary-500/20 flex items-center justify-center ring-1 ring-primary-400/30">
              <Image src="/menomadin-icon.svg" alt="" width={12} height={12} className="h-3 w-3 invert" />
            </div>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">Menomadin</span>
          </div>
          <ThemeToggle />
          <NotificationBell initialNotifications={initialNotifications} />
          <GlobalSearch />
          {userProfile && <AvatarButton profile={userProfile} />}
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between h-14 px-6 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex-shrink-0">
          <Breadcrumb />
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
            <NotificationBell initialNotifications={initialNotifications} />
            {userProfile && <AvatarButton profile={userProfile} />}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
          {children}
        </main>
      </div>
    </div>
  )
}
