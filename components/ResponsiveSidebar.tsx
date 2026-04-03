'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  section?: string
}

interface ResponsiveSidebarProps {
  items: SidebarItem[]
}

export function ResponsiveSidebar({ items }: ResponsiveSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // Group items by section
  const sections = new Map<string, SidebarItem[]>()
  items.forEach((item) => {
    const section = item.section || 'main'
    if (!sections.has(section)) {
      sections.set(section, [])
    }
    sections.get(section)!.push(item)
  })

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex-col transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        } z-40`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-700">
          {!isCollapsed && (
            <div className="text-xl font-bold text-amber-700 dark:text-amber-600">
              Portfolio
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg ml-auto"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="text-neutral-700 dark:text-neutral-500" />
            ) : (
              <ChevronLeft size={18} className="text-neutral-700 dark:text-neutral-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {Array.from(sections.entries()).map(([section, sectionItems]) => (
            <div key={section}>
              {!isCollapsed && section !== 'main' && (
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase px-2 mb-2">
                  {section}
                </p>
              )}
              <div className="space-y-1">
                {sectionItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors relative group ${
                        isActive
                          ? 'bg-amber-700 text-white'
                          : 'text-neutral-800 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.label}
                          {item.badge && ` (${item.badge})`}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
          <div className={`text-xs text-neutral-600 dark:text-neutral-500 ${isCollapsed ? 'text-center' : ''}`}>
            {!isCollapsed && (
              <p>© 2024 Menomadin Portfolio</p>
            )}
          </div>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className={`hidden md:block transition-all duration-200 ${isCollapsed ? 'w-20' : 'w-64'}`} />
    </>
  )
}
