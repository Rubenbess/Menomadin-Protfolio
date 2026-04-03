const strategyColors: Record<string, string> = {
  impact:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  venture: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
}

const strategyLabels: Record<string, string> = {
  impact:  'Menomadin Impact',
  venture: 'Menomadin Ventures',
}

const statusColors: Record<string, string> = {
  active:            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  exited:            'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'written-off':     'bg-red-50 text-red-600 ring-1 ring-red-200',
  watchlist:         'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  prospecting:       'bg-neutral-100 text-neutral-700 ring-1 ring-slate-200',
  'initial-meeting': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'due-diligence':   'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  'term-sheet':      'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  closed:            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  passed:            'bg-red-50 text-red-600 ring-1 ring-red-200',
}

interface BadgeProps {
  value: string
  type?: 'status' | 'strategy'
}

export default function Badge({ value, type = 'status' }: BadgeProps) {
  const colorMap = type === 'strategy' ? strategyColors : statusColors
  const colors = colorMap[value] ?? 'bg-neutral-100 text-neutral-700 ring-1 ring-slate-200'

  const label =
    type === 'strategy'
      ? (strategyLabels[value] ?? value)
      : value.replace(/-/g, ' ')

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors}`}
    >
      {label}
    </span>
  )
}
