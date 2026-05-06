'use client'

import { useMemo, useState, Fragment } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { fmt$$, fmtPct, fmtDate } from '@/lib/calculations'
import type { CompanyWithMetrics, Investment, Safe } from '@/lib/types'

interface Props {
  companies: CompanyWithMetrics[]
  investments: Investment[]
  safes: Safe[]
}

export default function PortfolioTable({ companies, investments, safes }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Pre-group once instead of running .filter() per row on every render.
  const investmentsByCompany = useMemo(() => {
    const m = new Map<string, Investment[]>()
    for (const i of investments) {
      const arr = m.get(i.company_id)
      if (arr) arr.push(i); else m.set(i.company_id, [i])
    }
    return m
  }, [investments])
  const safesByCompany = useMemo(() => {
    const m = new Map<string, Safe[]>()
    for (const s of safes) {
      const arr = m.get(s.company_id)
      if (arr) arr.push(s); else m.set(s.company_id, [s])
    }
    return m
  }, [safes])

  return (
    <div className="overflow-x-auto">
      {/* min-w-[900px] keeps the table from collapsing into illegible wraps on narrow screens; users get a swipe affordance instead. */}
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/70">
            <th className="w-8 px-3 py-3" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Company</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
            <th className="hidden lg:table-cell text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Entry Stage</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Invested to Date</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Ownership</th>
            <th className="hidden xl:table-cell text-right px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Planned Reserves</th>
            <th className="hidden xl:table-cell text-right px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Deployed Reserves</th>
            <th className="hidden md:table-cell text-right px-5 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Initial Investment</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((co) => {
            const isExpanded = expandedId === co.id
            const coInvestments = investmentsByCompany.get(co.id) ?? []
            const coSafes = safesByCompany.get(co.id) ?? []
            const hasItems = coInvestments.length > 0 || coSafes.length > 0

            // Unified timeline sorted by date
            type Item =
              | { kind: 'investment'; date: string; data: Investment }
              | { kind: 'safe'; date: string; data: Safe }
            const timeline: Item[] = [
              ...coInvestments.map(i => ({ kind: 'investment' as const, date: i.date, data: i })),
              ...coSafes.map(s => ({ kind: 'safe' as const, date: s.date, data: s })),
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            return (
              <Fragment key={co.id}>
                <tr
                  className={`border-t border-slate-50 dark:border-neutral-800 transition-colors ${isExpanded ? 'bg-neutral-50/80 dark:bg-neutral-800/80' : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60'}`}
                >
                  {/* Expand toggle */}
                  <td className="px-3 py-3">
                    {hasItems ? (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : co.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isExpanded
                            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-500 dark:text-primary-300'
                            : 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200'
                        }`}
                        title={isExpanded ? 'Collapse' : 'View investments'}
                      >
                        {isExpanded
                          ? <ChevronDown size={12} />
                          : <ChevronRight size={12} />
                        }
                      </button>
                    ) : (
                      <span className="w-5 h-5 block" />
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {co.logo_url ? (
                        <img src={co.logo_url} alt={co.name} className="w-7 h-7 rounded-lg object-contain bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-500 dark:text-primary-300">{co.name[0]}</span>
                        </div>
                      )}
                      <div>
                        <Link href={`/companies/${co.id}`} className="font-semibold text-neutral-900 dark:text-neutral-50 hover:text-primary-500 dark:hover:text-primary-300 transition-colors">
                          {co.name}
                        </Link>
                        {co.sector && <p className="text-xs text-neutral-500 dark:text-neutral-400">{co.sector}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge value={co.status} /></td>
                  <td className="hidden lg:table-cell px-4 py-3 text-neutral-600 dark:text-neutral-400 text-xs">{co.entry_stage ?? <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                  <td className="px-4 py-3 text-right font-medium text-neutral-800 dark:text-neutral-200">{co.totalInvested > 0 ? fmt$$(co.totalInvested) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{co.ownershipPct > 0 ? fmtPct(co.ownershipPct) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                  <td className="hidden xl:table-cell px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{co.plannedReserves > 0 ? fmt$$(co.plannedReserves) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                  <td className="hidden xl:table-cell px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{co.deployedReserves > 0 ? fmt$$(co.deployedReserves) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                  <td className="hidden md:table-cell px-5 py-3 text-right text-neutral-700 dark:text-neutral-300">{co.initialInvestment > 0 ? fmt$$(co.initialInvestment) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                </tr>

                {/* Expanded investment rows */}
                {isExpanded && timeline.length > 0 && (
                  <tr key={`${co.id}-expanded`} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td colSpan={9} className="px-0 py-0">
                      <div className="bg-neutral-50/60 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                              <th className="w-8" />
                              <th className="text-left px-4 py-2 font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                              <th className="text-left px-4 py-2 font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                              <th className="text-right px-4 py-2 font-semibold text-neutral-500 uppercase tracking-wider">Amount</th>
                              <th className="text-left px-4 py-2 font-semibold text-neutral-500 uppercase tracking-wider">Details</th>
                              <th className="text-left px-4 py-2 font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {timeline.map((item, i) => {
                              if (item.kind === 'investment') {
                                const inv = item.data
                                return (
                                  <tr key={`inv-${inv.id}`} className="hover:bg-white/60 dark:hover:bg-neutral-900/40 transition-colors">
                                    <td className="w-8 pl-8">
                                      <span className="w-1 h-1 rounded-full bg-primary-300 block mx-auto" />
                                    </td>
                                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{fmtDate(inv.date)}</td>
                                    <td className="px-4 py-2">
                                      <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800/60 font-medium">
                                        {inv.instrument}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-neutral-800 dark:text-neutral-200">{fmt$$(inv.amount)}</td>
                                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                                      {inv.valuation_cap ? `Cap: ${fmt$$(inv.valuation_cap)}` : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Invested</span>
                                    </td>
                                  </tr>
                                )
                              }

                              const safe = item.data
                              return (
                                <tr key={`safe-${safe.id}`} className="hover:bg-white/60 dark:hover:bg-neutral-900/40 transition-colors">
                                  <td className="w-8 pl-8">
                                    <span className="w-1 h-1 rounded-full bg-amber-400 block mx-auto" />
                                  </td>
                                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{fmtDate(safe.date)}</td>
                                  <td className="px-4 py-2">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/60 font-medium">
                                      SAFE
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-neutral-800 dark:text-neutral-200">{fmt$$(safe.investment_amount)}</td>
                                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                                    {[
                                      safe.valuation_cap && `Cap: ${fmt$$(safe.valuation_cap)}`,
                                      safe.discount_rate && `${safe.discount_rate}% disc.`,
                                    ].filter(Boolean).join(' · ') || '—'}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={`font-medium ${safe.status === 'converted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}`}>
                                      {safe.status === 'converted' ? 'Converted' : 'Unconverted'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {/* Total row */}
                          <tfoot>
                            <tr className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-800/50">
                              <td colSpan={3} className="px-4 py-2 font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs">
                                Total
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-neutral-800 dark:text-neutral-200 text-xs">
                                {fmt$$(
                                  coInvestments.reduce((s, i) => s + i.amount, 0) +
                                  coSafes.reduce((s, s2) => s + s2.investment_amount, 0)
                                )}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
