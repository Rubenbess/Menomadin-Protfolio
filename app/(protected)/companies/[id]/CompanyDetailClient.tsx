'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import CompanyForm from '@/components/forms/CompanyForm'
import RoundForm from '@/components/forms/RoundForm'
import InvestmentForm from '@/components/forms/InvestmentForm'
import CapTableForm from '@/components/forms/CapTableForm'
import KPIForm from '@/components/forms/KPIForm'
import UpdateForm from '@/components/forms/UpdateForm'
import { CATEGORY_COLORS } from '@/components/forms/UpdateForm'
import DocumentUpload from '@/components/documents/DocumentUpload'
import UpdateLinkButton from '@/components/UpdateLinkButton'
import { KPITrendChart, ValuationChart } from '@/components/CompanyCharts'
import CompanyTasks from '@/components/CompanyTasks'
import { deleteInvestment } from '@/actions/investments'
import { deleteCapTableEntry } from '@/actions/cap-table'
import { deleteKPI } from '@/actions/kpis'
import { deleteUpdate } from '@/actions/updates'
import { deleteSafe } from '@/actions/safes'
import SafeForm from '@/components/forms/SafeForm'
import SafeScenarioModal from '@/components/SafeScenarioModal'
import OwnershipTable from '@/components/OwnershipTable'
import WaterfallScenarioPanel from '@/components/WaterfallScenarioPanel'
import { HealthScoreBreakdown } from '@/components/HealthScoreBadge'
import {
  calcCurrentValue,
  calcMOIC,
  calcSafeEstimatedOwnership,
  calcFullyDilutedShares,
  calcFullyDilutedOwnershipPct,
  calcHealthScore,
  getFundOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  fmt$$,
  fmtMultiple,
  fmtPct,
  fmtDate,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Document, CompanyKPI, CompanyUpdate, Safe, ShareSeries, OptionPool, WaterfallScenario, TaskWithRelations, LegalEntity } from '@/lib/types'

type Tab = 'overview' | 'history' | 'kpis' | 'updates' | 'investments' | 'captable' | 'documents' | 'safes' | 'ownership' | 'waterfall' | 'tasks'

interface Props {
  company: Company
  rounds: Round[]
  investments: Investment[]
  capTable: CapTableEntry[]
  documents: Document[]
  kpis: CompanyKPI[]
  updates: CompanyUpdate[]
  safes: Safe[]
  shareSeries: ShareSeries[]
  optionPools: OptionPool[]
  waterfallScenarios: WaterfallScenario[]
  tasks: TaskWithRelations[]
  legalEntities: LegalEntity[]
}

export default function CompanyDetailClient({ company, rounds, investments, capTable, documents, kpis, updates, safes, shareSeries, optionPools, waterfallScenarios, tasks, legalEntities }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddRound, setShowAddRound] = useState(false)
  const [showAddInvestment, setShowAddInvestment] = useState(false)
  const [showAddCapTable, setShowAddCapTable] = useState(false)
  const [showAddKPI, setShowAddKPI] = useState(false)
  const [showAddUpdate, setShowAddUpdate] = useState(false)
  const [showAddSafe, setShowAddSafe] = useState(false)
  const [editingSafe, setEditingSafe] = useState<Safe | null>(null)
  const [scenarioSafe, setScenarioSafe] = useState<Safe | null>(null)

  const totalInvested = totalInvestedInCompany(investments)
  const latestRound   = getLatestRound(rounds)
  const ownershipPct  = getFundOwnershipPct(capTable)
  const currentValue  = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
  const moic          = calcMOIC(currentValue, totalInvested)

  async function handleDeleteInvestment(id: string) {
    if (!confirm('Delete this investment?')) return
    await deleteInvestment(id)
    router.refresh()
  }

  async function handleDeleteCapTable(id: string) {
    if (!confirm('Delete this cap table entry?')) return
    await deleteCapTableEntry(id)
    router.refresh()
  }

  const unconvertedSafes = safes.filter(s => s.status === 'unconverted')
  const totalSafeInvested = safes.reduce((s, safe) => s + safe.investment_amount, 0)

  // Institutional ownership (from share_series if available)
  const fundSeries = shareSeries.filter(s =>
    s.holder_name.toLowerCase().includes('menomadin') ||
    s.holder_name.toLowerCase().includes('fund')
  )
  const totalIssuedShares = shareSeries.reduce((s, h) => s + h.shares, 0)
  const totalFDShares = calcFullyDilutedShares(totalIssuedShares, optionPools)
  const fundFDShares = fundSeries.reduce((s, h) => s + h.shares, 0)
  const fundFDPct = fundFDShares > 0 ? calcFullyDilutedOwnershipPct(fundFDShares, totalFDShares) : 0

  const healthScore = calcHealthScore(kpis, updates, investments, rounds, capTable)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'ownership',   label: 'Ownership', count: shareSeries.length + optionPools.length },
    { id: 'waterfall',   label: 'Waterfall' },
    { id: 'history',     label: 'Investment History', count: rounds.length + safes.length },
    { id: 'kpis',        label: 'KPIs',          count: kpis.length },
    { id: 'updates',     label: 'Updates',        count: updates.length },
    { id: 'captable',    label: 'Cap Table',     count: capTable.length },
    { id: 'documents',   label: 'Documents',     count: documents.length },
    { id: 'tasks',       label: 'Tasks',         count: tasks.length },
  ]

  const th = 'px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-left'
  const td = 'px-5 py-3.5'

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Back + header */}
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex-1">
          <Link
            href="/companies"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-300 transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Companies
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="page-title">{company.name}</h1>
                <Badge value={company.status} />
                <Badge value={company.strategy} type="strategy" />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-2">
                {company.sector}{company.hq ? ` · ${company.hq}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UpdateLinkButton companyId={company.id} existingToken={company.update_token ?? null} />
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil size={13} /> Edit
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: 'Total Invested', value: fmt$$(totalInvested + totalSafeInvested),        accent: 'violet' },
          { label: 'Current Value',  value: currentValue > 0 ? fmt$$(currentValue) : '—',   accent: 'emerald' },
          { label: 'MOIC',           value: moic > 0 ? fmtMultiple(moic) : '—',             accent: 'blue' },
          {
            label: fundFDPct > 0 ? 'Ownership (FD)' : 'Ownership',
            value: fundFDPct > 0 ? fmtPct(fundFDPct) : ownershipPct > 0 ? fmtPct(ownershipPct) : '—',
            accent: 'amber',
          },
          ...(unconvertedSafes.length > 0 ? [{
            label: 'SAFE Est. Ownership',
            value: fmtPct(unconvertedSafes.reduce((s, safe) => s + calcSafeEstimatedOwnership(safe.investment_amount, safe.valuation_cap), 0)),
            accent: 'orange' as const,
          }] : []),
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={`card p-4 border-t-2 ${
              accent === 'violet'  ? 'border-t-gold-500'  :
              accent === 'emerald' ? 'border-t-emerald-500' :
              accent === 'blue'    ? 'border-t-blue-500'    :
              accent === 'orange'  ? 'border-t-orange-400'  :
                                     'border-t-amber-500'
            }`}
          >
            <p className="section-title">{label}</p>
            <p className="mt-1.5 text-xl font-bold text-neutral-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="flex gap-0.5 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:border-neutral-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-xs bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="card">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {company.description && (
              <div className="pb-5 border-b border-neutral-200">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-neutral-800 leading-relaxed">{company.description}</p>
              </div>
            )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900">Company Details</h3>
              {[
                { label: 'Name',     value: company.name },
                { label: 'Sector',   value: company.sector },
                { label: 'Strategy', value: company.strategy },
                { label: 'HQ',       value: company.hq || '—' },
                { label: 'Status',   value: company.status },
                { label: 'Entry Stage', value: company.entry_stage || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-neutral-900 capitalize">{value}</p>
                </div>
              ))}

              {/* Menomadin ownership info */}
              <div className="pt-4 border-t border-neutral-200 space-y-4">
                <h3 className="text-sm font-semibold text-neutral-900">Menomadin</h3>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Investment Owner</p>
                  <p className="text-sm text-neutral-900">{company.investment_owner || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Board Representation</p>
                  {company.board_seat ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      company.board_seat === 'Board Seat'
                        ? 'bg-gold-100 text-primary-600 ring-1 ring-violet-200'
                        : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    }`}>
                      {company.board_seat}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-500">No seat</span>
                  )}
                </div>
              </div>

              {/* Co-investors */}
              <div className="pt-4 border-t border-neutral-200 space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900">Co-investors</h3>
                {company.co_investors && company.co_investors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {company.co_investors.map((inv, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 ring-1 ring-slate-200">
                        {inv}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">—</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900">Investment Summary</h3>

              {/* Per-entity breakdown */}
              {(() => {
                const entityRows = legalEntities.map(entity => {
                  const alias = entity.cap_table_alias || entity.name
                  const entInvs = investments.filter(i => i.legal_entity === entity.name)
                  const entInvested = entInvs.reduce((s, i) => s + i.amount, 0)
                  const entCapTable = capTable.filter(c =>
                    c.shareholder_name.toLowerCase() === alias.toLowerCase()
                  )
                  const entOwnership = entCapTable.reduce((s, c) => s + c.ownership_percentage, 0)
                  const entValue = latestRound ? (entOwnership / 100) * latestRound.post_money : 0
                  const entMOIC = entInvested > 0 && entValue > 0 ? entValue / entInvested : null
                  return { entity, entInvested, entOwnership, entValue, entMOIC, hasData: entInvested > 0 || entOwnership > 0 }
                }).filter(r => r.hasData)

                const hasUnassigned = investments.some(i => !i.legal_entity)
                const unassignedInvested = investments.filter(i => !i.legal_entity).reduce((s, i) => s + i.amount, 0)

                if (entityRows.length === 0 && !hasUnassigned) {
                  return (
                    <div className="space-y-3">
                      {[
                        { label: 'Total Invested',    value: fmt$$(totalInvested) },
                        { label: 'Ownership %',       value: ownershipPct > 0 ? fmtPct(ownershipPct) : '—' },
                        { label: 'Entry Valuation',   value: rounds.length ? fmt$$([...rounds].sort((a,b) => new Date(a.date).getTime()-new Date(b.date).getTime())[0].post_money) : '—' },
                        { label: 'Current Valuation', value: latestRound ? fmt$$(latestRound.post_money) : '—' },
                        { label: 'MOIC',              value: moic > 0 ? fmtMultiple(moic) : '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-neutral-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  )
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          {['Entity', 'Invested', 'Ownership', 'Current Value', 'MOIC'].map(h => (
                            <th key={h} className="pb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-left pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {entityRows.map(({ entity, entInvested, entOwnership, entValue, entMOIC }) => (
                          <tr key={entity.id}>
                            <td className="py-2.5 pr-4 font-semibold text-neutral-800">{entity.name}</td>
                            <td className="py-2.5 pr-4 text-primary-600 font-medium">{entInvested > 0 ? fmt$$(entInvested) : '—'}</td>
                            <td className="py-2.5 pr-4 text-neutral-700">{entOwnership > 0 ? fmtPct(entOwnership) : '—'}</td>
                            <td className="py-2.5 pr-4 text-emerald-600 font-medium">{entValue > 0 ? fmt$$(entValue) : '—'}</td>
                            <td className={`py-2.5 font-bold ${entMOIC != null && entMOIC >= 1 ? 'text-emerald-600' : entMOIC != null ? 'text-red-500' : 'text-neutral-400'}`}>
                              {entMOIC != null ? fmtMultiple(entMOIC) : '—'}
                            </td>
                          </tr>
                        ))}
                        {hasUnassigned && (
                          <tr>
                            <td className="py-2.5 pr-4 text-neutral-400 italic text-xs">Unassigned</td>
                            <td className="py-2.5 pr-4 text-neutral-500">{fmt$$(unassignedInvested)}</td>
                            <td className="py-2.5 pr-4 text-neutral-400">—</td>
                            <td className="py-2.5 pr-4 text-neutral-400">—</td>
                            <td className="py-2.5 text-neutral-400">—</td>
                          </tr>
                        )}
                        {/* Combined total row */}
                        <tr className="border-t-2 border-neutral-300">
                          <td className="py-2.5 pr-4 font-bold text-neutral-900">Total</td>
                          <td className="py-2.5 pr-4 font-bold text-primary-600">{fmt$$(totalInvested)}</td>
                          <td className="py-2.5 pr-4 font-bold text-neutral-700">{ownershipPct > 0 ? fmtPct(ownershipPct) : '—'}</td>
                          <td className="py-2.5 pr-4 font-bold text-emerald-600">{currentValue > 0 ? fmt$$(currentValue) : '—'}</td>
                          <td className={`py-2.5 font-bold ${moic >= 1 ? 'text-emerald-600' : moic > 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                            {moic > 0 ? fmtMultiple(moic) : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {/* Valuations below table */}
                    <div className="mt-4 flex gap-6">
                      {rounds.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Entry Valuation</p>
                          <p className="text-sm font-medium text-neutral-900">
                            {fmt$$([...rounds].sort((a,b) => new Date(a.date).getTime()-new Date(b.date).getTime())[0].post_money)}
                          </p>
                        </div>
                      )}
                      {latestRound && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Current Valuation</p>
                          <p className="text-sm font-medium text-neutral-900">{fmt$$(latestRound.post_money)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Valuation Timeline */}
          {rounds.length >= 2 && (
            <div className="pt-4 border-t border-neutral-200">
              <ValuationChart rounds={rounds} ownershipPct={ownershipPct > 0 ? ownershipPct : undefined} />
            </div>
          )}

          {/* Health Score */}
          <div className="pt-4 border-t border-neutral-200">
            <HealthScoreBreakdown score={healthScore} />
          </div>
          </div>
        )}

        {/* OWNERSHIP */}
        {activeTab === 'ownership' && (
          <OwnershipTable
            companyId={company.id}
            shareSeries={shareSeries}
            optionPools={optionPools}
            rounds={rounds}
          />
        )}

        {/* WATERFALL */}
        {activeTab === 'waterfall' && (
          <WaterfallScenarioPanel
            companyId={company.id}
            shareSeries={shareSeries}
            optionPools={optionPools}
            safes={safes}
            savedScenarios={waterfallScenarios}
          />
        )}

        {/* INVESTMENT HISTORY — unified rounds + SAFEs timeline */}
        {activeTab === 'history' && (() => {
          const sortedRounds  = [...rounds].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          const latestRound   = sortedRounds[sortedRounds.length - 1]
          const fundOwnership = getFundOwnershipPct(capTable)
          const unlinkedInvs  = investments.filter(i => !i.round_id)

          // Build unified timeline: rounds + safes, sorted by date
          type TimelineItem =
            | { kind: 'round'; date: string; data: typeof rounds[0] }
            | { kind: 'safe';  date: string; data: typeof safes[0] }
          const timeline: TimelineItem[] = [
            ...sortedRounds.map(r => ({ kind: 'round' as const, date: r.date, data: r })),
            ...safes.map(s => ({ kind: 'safe' as const, date: s.date, data: s })),
          ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          const isEmpty = timeline.length === 0 && unlinkedInvs.length === 0

          return (
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-900">Investment History</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowAddInvestment(true)}><Plus size={13} /> Add Investment</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditingSafe(null); setShowAddSafe(true) }}><Plus size={13} /> Add SAFE</Button>
                  <Button size="sm" onClick={() => setShowAddRound(true)}><Plus size={13} /> Add Round</Button>
                </div>
              </div>

              {isEmpty ? (
                <EmptyState message="No investment history yet." />
              ) : (
                <>
                  {rounds.length > 0 && (
                    <div className="px-5 pt-4">
                      <ValuationChart rounds={rounds} ownershipPct={ownershipPct > 0 ? ownershipPct : undefined} />
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {timeline.map((item, idx) => {

                      /* ── SAFE row ── */
                      if (item.kind === 'safe') {
                        const safe = item.data
                        const estOwnership = calcSafeEstimatedOwnership(safe.investment_amount, safe.valuation_cap)
                        return (
                          <div
                            key={`safe-${safe.id}`}
                            className="p-5 sm:p-6 cursor-pointer hover:bg-orange-50/40 transition-colors group"
                            onClick={() => setScenarioSafe(safe)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              {/* SAFE label */}
                              <div className="sm:w-36 flex-shrink-0">
                                <p className="text-sm font-bold text-neutral-900">SAFE</p>
                                <p className="text-xs text-neutral-500 mt-0.5">{fmtDate(safe.date)}</p>
                                <span className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  safe.status === 'converted'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {safe.status === 'converted' ? 'Converted' : 'Unconverted'}
                                </span>
                              </div>

                              {/* SAFE metrics */}
                              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
                                {[
                                  { label: 'Investment',    value: fmt$$(safe.investment_amount), highlight: true },
                                  { label: 'Valuation Cap', value: safe.valuation_cap ? fmt$$(safe.valuation_cap) : '—' },
                                  { label: 'Discount',      value: safe.discount_rate ? `${safe.discount_rate}%` : '—' },
                                  { label: 'MFN / Pro-rata', value: [safe.has_mfn && 'MFN', safe.has_pro_rata && 'Pro-rata'].filter(Boolean).join(' · ') || '—' },
                                  { label: 'Est. Ownership', value: estOwnership > 0 ? fmtPct(estOwnership) : '—', accent: estOwnership > 0 },
                                ].map(({ label, value, highlight, accent }) => (
                                  <div key={label}>
                                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
                                    <p className={`text-sm font-medium ${accent ? 'text-orange-600' : highlight ? 'text-primary-600' : 'text-neutral-900'}`}>{value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Action hint */}
                              <div className="sm:text-right flex-shrink-0">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={e => { e.stopPropagation(); setEditingSafe(safe); setShowAddSafe(true) }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-primary-500 hover:bg-gold-50 rounded-lg transition-all"
                                  ><Pencil size={12} /></button>
                                  <button
                                    onClick={async e => {
                                      e.stopPropagation()
                                      if (!confirm('Delete this SAFE?')) return
                                      await deleteSafe(safe.id)
                                      router.refresh()
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  ><Trash2 size={12} /></button>
                                </div>
                                {safe.status === 'unconverted' && (
                                  <p className="text-xs text-orange-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to model →
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      /* ── Round row ── */
                      const round = item.data
                      const roundIdx = sortedRounds.indexOf(round)
                      const roundInvs     = investments.filter(i => i.round_id === round.id)
                      const roundInvested = roundInvs.reduce((s, i) => s + i.amount, 0)
                      const instrument    = roundInvs[0]?.instrument ?? null
                      const roundCap      = capTable.find(c => c.round_id === round.id)
                      const ownership     = roundCap?.ownership_percentage ?? (roundIdx === sortedRounds.length - 1 ? fundOwnership : null)
                      const fmv           = ownership != null && latestRound ? (ownership / 100) * latestRound.post_money : null
                      const moic          = fmv != null && roundInvested > 0 ? fmv / roundInvested : null

                      return (
                        <div key={`round-${round.id}`} className="p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            {/* Round label */}
                            <div className="sm:w-36 flex-shrink-0">
                              <p className="text-sm font-bold text-neutral-900">{round.type}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{fmtDate(round.date)}</p>
                              {instrument && (
                                <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gold-50 text-primary-600 ring-1 ring-violet-200">
                                  {instrument}
                                </span>
                              )}
                            </div>

                            {/* Metrics grid */}
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
                              {[
                                { label: 'Our Investment', value: roundInvested > 0 ? fmt$$(roundInvested) : '—', highlight: roundInvested > 0 },
                                { label: 'Round Size',     value: round.amount_raised > 0 ? fmt$$(round.amount_raised) : '—' },
                                { label: 'Pre-money',      value: round.pre_money > 0 ? fmt$$(round.pre_money) : '—' },
                                { label: 'Post-money',     value: round.post_money > 0 ? fmt$$(round.post_money) : '—' },
                                { label: 'Ownership',      value: ownership != null ? fmtPct(ownership) : '—' },
                                { label: 'FMV',            value: fmv != null ? fmt$$(fmv) : '—', accent: true },
                              ].map(({ label, value, highlight, accent }) => (
                                <div key={label}>
                                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
                                  <p className={`text-sm font-medium ${accent ? 'text-emerald-600' : highlight ? 'text-primary-600' : 'text-neutral-900'}`}>{value}</p>
                                </div>
                              ))}
                            </div>

                            {/* MOIC */}
                            <div className="sm:text-right flex-shrink-0">
                              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">MOIC</p>
                              <p className={`text-sm font-bold ${moic != null && moic >= 1 ? 'text-emerald-600' : moic != null ? 'text-red-500' : 'text-neutral-500'}`}>
                                {moic != null ? fmtMultiple(moic) : '—'}
                              </p>
                            </div>
                          </div>

                          {/* Investment line items for this round */}
                          {roundInvs.length > 0 && (
                            <div className="mt-3 ml-0 sm:ml-40 border-t border-neutral-200 pt-3 space-y-1.5">
                              {roundInvs.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between group">
                                  <div className="flex items-center gap-3 text-xs text-neutral-600">
                                    <span>{fmtDate(inv.date)}</span>
                                    <span className="font-semibold text-neutral-800">{fmt$$(inv.amount)}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-gold-50 text-primary-600 ring-1 ring-violet-200">{inv.instrument}</span>
                                    {inv.legal_entity && (
                                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200 font-semibold">{inv.legal_entity}</span>
                                    )}
                                    {inv.valuation_cap && <span className="text-neutral-500">Cap: {fmt$$(inv.valuation_cap)}</span>}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteInvestment(inv.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  ><Trash2 size={11} /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Investments not linked to any round */}
                  {unlinkedInvs.length > 0 && (
                    <div className="border-t border-neutral-200 px-5 py-4">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Other Investments (no round)</p>
                      <div className="space-y-2">
                        {unlinkedInvs.map(inv => (
                          <div key={inv.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 text-xs text-neutral-600">
                              <span>{fmtDate(inv.date)}</span>
                              <span className="font-semibold text-neutral-800">{fmt$$(inv.amount)}</span>
                              <span className="px-2 py-0.5 rounded-full bg-gold-50 text-primary-600 ring-1 ring-violet-200">{inv.instrument}</span>
                              {inv.legal_entity && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200 font-semibold">{inv.legal_entity}</span>
                              )}
                              {inv.valuation_cap && <span className="text-neutral-500">Cap: {fmt$$(inv.valuation_cap)}</span>}
                            </div>
                            <button
                              onClick={() => handleDeleteInvestment(inv.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            ><Trash2 size={11} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* CAP TABLE */}
        {activeTab === 'captable' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Cap Table</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Add the fund&apos;s entry last — it will be used for ownership calculations.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAddCapTable(true)}>
                  <Plus size={13} /> Add Entry
                </Button>
              </div>
            </div>
            {capTable.length === 0 ? (
              <EmptyState message="No cap table entries yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70">
                      {['Shareholder', 'Ownership %', ''].map((h) => (
                        <th key={h} className={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {capTable.map((entry) => (
                      <tr key={entry.id} className="hover:bg-neutral-50/60 group transition-colors">
                        <td className={td + ' font-medium text-neutral-900'}>{entry.shareholder_name}</td>
                        <td className={td + ' text-neutral-700'}>{fmtPct(entry.ownership_percentage)}</td>
                        <td className={td + ' text-right'}>
                          <button
                            onClick={() => handleDeleteCapTable(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        {activeTab === 'kpis' && (() => {
          const latest = kpis[0] ?? null
          const KPI_META = [
            { key: 'revenue',      label: 'Revenue',         fmt: (v: number) => fmt$$(v) },
            { key: 'arr',          label: 'ARR',             fmt: (v: number) => fmt$$(v) },
            { key: 'run_rate',     label: 'Run Rate',        fmt: (v: number) => fmt$$(v) },
            { key: 'burn_rate',    label: 'Burn Rate/mo',    fmt: (v: number) => fmt$$(v) },
            { key: 'cash_runway',  label: 'Cash Runway',     fmt: (v: number) => `${v} mo` },
            { key: 'headcount',    label: 'Headcount',       fmt: (v: number) => `${v}` },
            { key: 'gross_margin', label: 'Gross Margin',    fmt: (v: number) => fmtPct(v) },
          ]
          return (
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-900">KPI Snapshots</h3>
                <Button size="sm" onClick={() => setShowAddKPI(true)}><Plus size={13} /> Add Snapshot</Button>
              </div>

              {/* KPI trend chart */}
              {kpis.length >= 2 && (
                <div className="px-5 pt-5">
                  <KPITrendChart kpis={kpis} />
                </div>
              )}

              {/* Latest values */}
              {latest && (
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                    Latest — {fmtDate(latest.date)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {KPI_META.map(({ key, label, fmt }) => {
                      const val = latest[key as keyof CompanyKPI] as number | null
                      return val != null ? (
                        <div key={key} className="bg-neutral-50 rounded-lg px-4 py-3 ring-1 ring-slate-200">
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-neutral-900">{fmt(val)}</p>
                        </div>
                      ) : null
                    })}
                    {/* Custom KPIs from latest snapshot */}
                    {latest.custom_kpis && Object.entries(latest.custom_kpis).map(([k, v]) => (
                      <div key={k} className="bg-gold-50 rounded-lg px-4 py-3 ring-1 ring-gold-100">
                        <p className="text-xs font-semibold text-gold-300 uppercase tracking-wider mb-0.5">{k}</p>
                        <p className="text-sm font-bold text-neutral-900">{v}</p>
                      </div>
                    ))}
                  </div>
                  {latest.notes && (
                    <p className="mt-3 text-sm text-neutral-600 italic">{latest.notes}</p>
                  )}
                </div>
              )}

              {/* History table */}
              {kpis.length === 0 ? (
                <EmptyState message="No KPI snapshots yet. Add one to start tracking metrics." />
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/70">
                        {['Date', 'Revenue', 'ARR', 'Run Rate', 'Burn/mo', 'Runway', 'HC', 'GM%', ''].map(h => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {kpis.map(k => (
                        <tr key={k.id} className="hover:bg-neutral-50/60 group transition-colors">
                          <td className={td + ' text-neutral-600 font-medium'}>{fmtDate(k.date)}</td>
                          <td className={td + ' text-neutral-800'}>{k.revenue != null ? fmt$$(k.revenue) : '—'}</td>
                          <td className={td + ' text-neutral-800'}>{k.arr != null ? fmt$$(k.arr) : '—'}</td>
                          <td className={td + ' text-neutral-800'}>{k.run_rate != null ? fmt$$(k.run_rate) : '—'}</td>
                          <td className={td + ' text-neutral-800'}>{k.burn_rate != null ? fmt$$(k.burn_rate) : '—'}</td>
                          <td className={td + ' text-neutral-800'}>{k.cash_runway != null ? `${k.cash_runway} mo` : '—'}</td>
                          <td className={td + ' text-neutral-800'}>{k.headcount ?? '—'}</td>
                          <td className={td + ' text-neutral-800'}>{k.gross_margin != null ? fmtPct(k.gross_margin) : '—'}</td>
                          <td className={td + ' text-right'}>
                            <button
                              onClick={async () => { if (confirm('Delete this snapshot?')) { await deleteKPI(k.id); router.refresh() } }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            ><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}

        {/* UPDATES */}
        {activeTab === 'updates' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">Updates & Milestones</h3>
              <Button size="sm" onClick={() => setShowAddUpdate(true)}><Plus size={13} /> Add Update</Button>
            </div>
            {updates.length === 0 ? (
              <EmptyState message="No updates yet. Log milestones, news, or decisions here." />
            ) : (
              <div className="px-5 py-4 space-y-0">
                {updates.map((u, i) => (
                  <div key={u.id} className="flex gap-4 group">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0 ring-2 ring-white" />
                      {i < updates.length - 1 && <div className="w-px flex-1 bg-neutral-200 my-1" />}
                    </div>
                    {/* Content */}
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[u.category] ?? 'bg-neutral-100 text-neutral-800'}`}>
                            {u.category}
                          </span>
                          <span className="text-xs text-neutral-500">{fmtDate(u.date)}</span>
                        </div>
                        <button
                          onClick={async () => { if (confirm('Delete this update?')) { await deleteUpdate(u.id); router.refresh() } }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-500 rounded transition-all flex-shrink-0"
                        ><Trash2 size={12} /></button>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900 mb-0.5">{u.title}</p>
                      {u.notes && <p className="text-sm text-neutral-600 leading-relaxed">{u.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="p-5">
            <DocumentUpload companyId={company.id} documents={documents} />
          </div>
        )}

        {/* TASKS */}
        {activeTab === 'tasks' && (
          <div className="p-5">
            <CompanyTasks
              tasks={tasks}
              companyId={company.id}
              companyName={company.name}
            />
          </div>
        )}
      </div>
      </div>

      {/* Modals */}
      <Modal open={showEdit}            onClose={() => setShowEdit(false)}           title="Edit Company">
        <CompanyForm company={company} onClose={() => setShowEdit(false)} />
      </Modal>
      <Modal open={showAddRound}        onClose={() => setShowAddRound(false)}       title="Add Round">
        <RoundForm companyId={company.id} onClose={() => setShowAddRound(false)} />
      </Modal>
      <Modal open={showAddInvestment}   onClose={() => setShowAddInvestment(false)}  title="Add Investment">
        <InvestmentForm companyId={company.id} rounds={rounds} legalEntities={legalEntities} onClose={() => setShowAddInvestment(false)} />
      </Modal>
      <Modal open={showAddCapTable}     onClose={() => setShowAddCapTable(false)}    title="Add Cap Table Entry">
        <CapTableForm companyId={company.id} rounds={rounds} onClose={() => setShowAddCapTable(false)} />
      </Modal>
      <Modal open={showAddKPI}          onClose={() => setShowAddKPI(false)}         title="Add KPI Snapshot">
        <KPIForm companyId={company.id} sector={company.sector} onClose={() => setShowAddKPI(false)} />
      </Modal>
      <Modal open={showAddUpdate}       onClose={() => setShowAddUpdate(false)}      title="Log Update">
        <UpdateForm companyId={company.id} onClose={() => setShowAddUpdate(false)} />
      </Modal>
      <Modal
        open={showAddSafe}
        onClose={() => { setShowAddSafe(false); setEditingSafe(null) }}
        title={editingSafe ? 'Edit SAFE' : 'Add SAFE'}
      >
        <SafeForm
          companyId={company.id}
          safe={editingSafe}
          onClose={() => { setShowAddSafe(false); setEditingSafe(null); router.refresh() }}
        />
      </Modal>
      {scenarioSafe && (
        <SafeScenarioModal
          safe={scenarioSafe}
          rounds={rounds}
          open={!!scenarioSafe}
          onClose={() => setScenarioSafe(null)}
        />
      )}
    </div>
  )
}
