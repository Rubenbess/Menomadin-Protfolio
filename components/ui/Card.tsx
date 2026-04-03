interface MetricCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'violet' | 'emerald' | 'blue' | 'amber'
}

const accentBorder: Record<string, string> = {
  violet:  'border-t-primary-500',
  emerald: 'border-t-emerald-500',
  blue:    'border-t-blue-500',
  amber:   'border-t-amber-500',
}

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div className={`
      bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md
      border border-neutral-200 dark:border-neutral-700 p-6
      hover:shadow-md dark:hover:shadow-lg transition-shadow duration-200
      ${accent ? `border-t-2 ${accentBorder[accent]}` : ''}
    `}>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="mt-3 text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">{value}</p>
      {sub && <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </div>
  )
}

interface CardProps {
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function Card({ title, children, action, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          {title && <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
