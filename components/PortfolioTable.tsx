'use client'

import { useState } from 'react'
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="w-8 px-3 py-3" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Company</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Entry Stage</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Invested to Date</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ownership</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Planned Reserves</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Deployed Reserves</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Initial Investment</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((co) => {
            const isExpanded = expandedId === co.id
            const coInvestments = investments.filter(i => i.company_id === co.id)
            const coSafes = safes.filter(s => s.company_id === co.id)
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
              <>
                <tr
                  key={co.id}
                  className={`border-t border-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}
                >
                  {/* Expand toggle */}
                  <td className="px-3 py-3">
                    {hasItems ? (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : co.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isExpanded
                            ? 'bg-violet-100 text-violet-600'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'
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
                        <img src={co.logo_url} alt={co.name} className="w-7 h-7 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-violet-600">{co.name[0]}</span>
                        </div>
                      )}
                      <div>
                        <Link href={`/companies/${co.id}`} className="font-semibold text-slate-900 hover:text-violet-600 transition-colors">
                          {co.name}
                        </Link>
                        {co.sector && <p className="text-xs text-slate-400">{co.sector}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge value={co.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{co.entry_stage ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{co.totalInvested > 0 ? fmt$$(co.totalInvested) : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{co.ownershipPct > 0 ? fmtPct(co.ownershipPct) : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{co.plannedReserves > 0 ? fmt$$(co.plannedReserves) : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{co.deployedReserves > 0 ? fmt$$(co.deployedReserves) : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{co.initialInvestment > 0 ? fmt$$(co.initialInvestment) : <span className="text-slate-300">—</span>}</td>
                </tr>

                {/* Expanded investment rows */}
                {isExpanded && timeline.length > 0 && (
                  <tr key={`${co.id}-expanded`} className="border-t border-violet-100">
                    <td colSpan={9} className="px-0 py-0">
                      <div className="bg-slate-50/60 border-b border-slate-100">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="w-8" />
                              <th className="text-left px-4 py-2 font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                              <th className="text-right px-4 py-2 font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {timeline.map((item, i) => {
                              if (item.kind === 'investment') {
                                const inv = item.data
                                return (
                                  <tr key={`inv-${inv.id}`} className="hover:bg-white/60 transition-colors">
                                    <td className="w-8 pl-8">
                                      <span className="w-1 h-1 rounded-full bg-violet-400 block mx-auto" />
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">{fmtDate(inv.date)}</td>
                                    <td className="px-4 py-2">
                                      <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 font-medium">
                                        {inv.instrument}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmt$$(inv.amount)}</td>
                                    <td className="px-4 py-2 text-slate-500">
                                      {inv.valuation_cap ? `Cap: ${fmt$$(inv.valuation_cap)}` : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-emerald-600 font-medium">Invested</span>
                                    </td>
                                  </tr>
                                )
                              }

                              const safe = item.data
                              return (
                                <tr key={`safe-${safe.id}`} className="hover:bg-white/60 transition-colors">
                                  <td className="w-8 pl-8">
                                    <span className="w-1 h-1 rounded-full bg-amber-400 block mx-auto" />
                                  </td>
                                  <td className="px-4 py-2 text-slate-500">{fmtDate(safe.date)}</td>
                                  <td className="px-4 py-2">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-medium">
                                      SAFE
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmt$$(safe.investment_amount)}</td>
                                  <td className="px-4 py-2 text-slate-500">
                                    {[
                                      safe.valuation_cap && `Cap: ${fmt$$(safe.valuation_cap)}`,
                                      safe.discount_rate && `${safe.discount_rate}% disc.`,
                                    ].filter(Boolean).join(' · ') || '—'}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={`font-medium ${safe.status === 'converted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {safe.status === 'converted' ? 'Converted' : 'Unconverted'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {/* Total row */}
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-100/50">
                              <td colSpan={3} className="px-4 py-2 font-semibold text-slate-500 uppercase tracking-wider text-xs">
                                Total
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800 text-xs">
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
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
