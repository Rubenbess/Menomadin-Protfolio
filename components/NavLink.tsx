'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

interface NavLinkProps {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: number
  onClick?: () => void
  className?: string
  isCollapsed?: boolean
}

export function NavLink({
  href,
  label,
  icon,
  badge,
  onClick,
  className = '',
  isCollapsed = false,
}: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors relative group ${
        isActive
          ? 'bg-amber-700 text-white'
          : 'text-neutral-800 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      } ${className}`}
    >
      {icon && <span className="w-5 h-5 flex-shrink-0">{icon}</span>}
      {!isCollapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
          {badge && ` (${badge})`}
        </div>
      )}
    </Link>
  )
}
