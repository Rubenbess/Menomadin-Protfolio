'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'
import type { Notification } from '@/lib/types'

interface Props {
  children: React.ReactNode
  initialNotifications: Notification[]
}

export default function AppShell({ children, initialNotifications }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-800">

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex md:hidden transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
        <button
          onClick={() => setOpen(false)}
          className="mt-4 ml-2 w-9 h-9 flex-shrink-0 bg-white rounded-lg shadow-lg flex items-center justify-center text-neutral-700 self-start"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-700 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md bg-primary-500/20 flex items-center justify-center ring-1 ring-gold-500/30">
              <img src="/menomadin-icon.svg" alt="" className="h-3 w-3 invert" />
            </div>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">Menomadin</span>
          </div>
          <ThemeToggle />
          <NotificationBell initialNotifications={initialNotifications} />
          <GlobalSearch />
        </div>

        {/* Desktop search bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/30 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
            <NotificationBell initialNotifications={initialNotifications} />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-800">
          <div className={pathname === '/tasks' ? '' : 'p-4 md:p-8'}>{children}</div>
        </main>
      </div>
    </div>
  )
}
