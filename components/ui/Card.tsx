interface MetricCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'violet' | 'emerald' | 'blue' | 'amber'
}

const accentBorder: Record<string, string> = {
  violet:  'border-t-violet-500',
  emerald: 'border-t-emerald-500',
  blue:    'border-t-blue-500',
  amber:   'border-t-amber-500',
}

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div className={`
      bg-white rounded-2xl shadow-card p-5 ring-1 ring-black/[0.04]
      ${accent ? `border-t-2 ${accentBorder[accent]}` : ''}
    `}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
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
    <div className={`bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
