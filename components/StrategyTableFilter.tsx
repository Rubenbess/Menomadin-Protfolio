'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const OPTIONS = [
  { value: '', label: 'All' },
  { value: 'impact', label: 'Impact' },
  { value: 'venture', label: 'Ventures' },
]

export default function StrategyTableFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('strategy') ?? ''

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('strategy', value)
    } else {
      params.delete('strategy')
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            current === opt.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
