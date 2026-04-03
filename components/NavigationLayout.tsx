'use client'

import { ResponsiveSidebar } from './ResponsiveSidebar'
import { MobileNav } from './MobileNav'
import { getMainNavItems } from '@/lib/nav-config'

interface NavigationLayoutProps {
  children: React.ReactNode
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const navItems = getMainNavItems()

  return (
    <div className="flex">
      {/* Mobile Navigation */}
      <MobileNav items={navItems} />

      {/* Desktop Sidebar */}
      <ResponsiveSidebar items={navItems} />

      {/* Main Content */}
      <main className="flex-1 w-full">
        {/* Mobile Top Margin */}
        <div className="h-16 md:h-0" />

        {/* Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
