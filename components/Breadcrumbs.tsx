'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbs = items || generateBreadcrumbs(pathname)

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-neutral-700 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-slate-200 transition-colors"
      >
        <Home size={16} />
        <span>Dashboard</span>
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={`breadcrumb-${index}`} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-slate-300 dark:text-neutral-800" />

          {item.href ? (
            <Link
              href={item.href}
              className="text-neutral-700 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-slate-200 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

// Helper function to generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1) // Skip 'protected' segment

  if (segments.length === 0) {
    return []
  }

  const routeNames: Record<string, string> = {
    companies: 'Companies',
    contacts: 'Contacts',
    pipeline: 'Pipeline',
    tasks: 'Tasks',
    documents: 'Documents',
    network: 'Network',
    reminders: 'Reminders',
    'portfolio-kpis': 'Portfolio KPIs',
    reports: 'Reports',
    reserves: 'Reserves',
    settings: 'Settings',
    import: 'Import',
    analytics: 'Analytics',
  }

  return segments.map((segment, index) => {
    const label = routeNames[segment] || capitalizeSegment(segment)
    const isLast = index === segments.length - 1

    return {
      label,
      href: isLast ? undefined : `/dashboard/${segments.slice(0, index + 1).join('/')}`,
    }
  })
}

function capitalizeSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
