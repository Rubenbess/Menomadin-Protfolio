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
    <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            current === opt.value
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
