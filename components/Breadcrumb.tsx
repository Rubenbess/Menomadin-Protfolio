'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const LABELS: Record<string, string> = {
  dashboard:        'Overview',
  companies:        'Companies',
  'portfolio-kpis': 'Portfolio KPIs',
  pipeline:         'Pipeline',
  tasks:            'Tasks',
  contacts:         'Contacts',
  documents:        'Documents',
  network:          'Co-investors',
  reminders:        'Reminders',
  import:           'Import Data',
  reports:          'Reports',
  analytics:        'Analytics',
  settings:         'Settings',
  security:         'Security',
  'email-scanner':  'Email Scanner',
  profile:          'Profile',
  help:             'Help Center',
  documentation:    'Documentation',
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((seg, i) => ({
    href:  '/' + segments.slice(0, i + 1).join('/'),
    label: LABELS[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1)),
  }))

  return (
    <nav className="flex items-center gap-1 text-sm select-none">
      <span className="text-neutral-400 dark:text-neutral-500 font-medium">Dashboard</span>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
          {i === crumbs.length - 1 ? (
            <span className="text-neutral-700 dark:text-neutral-200 font-semibold">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
