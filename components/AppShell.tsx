'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'

export default function AppShell({ children }: { children: React.ReactNode }) {
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
    <div className="flex h-screen overflow-hidden bg-slate-50">

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
          className="mt-4 ml-2 w-9 h-9 flex-shrink-0 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-600 self-start"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center ring-1 ring-violet-500/30">
              <img src="/menomadin-icon.svg" alt="" className="h-3 w-3 invert" />
            </div>
            <span className="text-sm font-bold text-slate-900">Menomadin</span>
          </div>
          <GlobalSearch />
        </div>

        {/* Desktop search bar */}
        <div className="hidden md:flex items-center justify-end px-6 py-2 border-b border-slate-100 bg-white/50 flex-shrink-0">
          <GlobalSearch />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
