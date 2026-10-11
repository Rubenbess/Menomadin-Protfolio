import type { CompanyHealth } from '@/lib/types'

const healthColors: Record<CompanyHealth, string> = {
  Critical:   'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800',
  Watch:      'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
  'On track': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
  Closing:    'bg-neutral-100 text-neutral-700 ring-1 ring-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
}

interface HealthBadgeProps {
  health?: CompanyHealth | null
  note?: string | null
}

/**
 * Portfolio health set by the daily refresh (see app/api/sync/portfolio).
 * Renders nothing until a company has a health value.
 */
export default function HealthBadge({ health, note }: HealthBadgeProps) {
  if (!health) return null
  const colors = healthColors[health] ?? healthColors.Closing
  return (
    <span
      title={note ?? undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
      {health}
    </span>
  )
}
