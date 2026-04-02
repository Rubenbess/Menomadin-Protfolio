'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const FILTERS = [
  { value: '', label: 'All strategies' },
  { value: 'impact', label: 'Impact' },
  { value: 'venture', label: 'Ventures' },
]

export default function StrategyFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('strategy') ?? ''

  const setStrategy = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('strategy', value)
      } else {
        params.delete('strategy')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="px-3 pb-3">
      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2 px-1">
        Strategy
      </p>
      <div className="space-y-0.5">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStrategy(value)}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              current === value
                ? 'bg-primary-500/15 text-primary-200'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {value === '' ? (
              label
            ) : (
              <span className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    value === 'impact' ? 'bg-emerald-400' : 'bg-blue-400'
                  }`}
                />
                {label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
