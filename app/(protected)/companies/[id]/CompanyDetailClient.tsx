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
import DocumentUpload from '@/components/documents/DocumentUpload'
import { deleteRound } from '@/actions/rounds'
import { deleteInvestment } from '@/actions/investments'
import { deleteCapTableEntry } from '@/actions/cap-table'
import {
  calcCurrentValue,
  calcMOIC,
  getFundOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  fmt$$,
  fmtMultiple,
  fmtPct,
  fmtDate,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Document } from '@/lib/types'

type Tab = 'overview' | 'rounds' | 'investments' | 'captable' | 'documents'

interface Props {
  company: Company
  rounds: Round[]
  investments: Investment[]
  capTable: CapTableEntry[]
  documents: Document[]
}

export default function CompanyDetailClient({ company, rounds, investments, capTable, documents }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddRound, setShowAddRound] = useState(false)
  const [showAddInvestment, setShowAddInvestment] = useState(false)
  const [showAddCapTable, setShowAddCapTable] = useState(false)

  const totalInvested = totalInvestedInCompany(investments)
  const latestRound   = getLatestRound(rounds)
  const ownershipPct  = getFundOwnershipPct(capTable)
  const currentValue  = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
  const moic          = calcMOIC(currentValue, totalInvested)

  async function handleDeleteRound(id: string) {
    if (!confirm('Delete this round?')) return
    await deleteRound(id)
    router.refresh()
  }

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

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'rounds',      label: 'Rounds',      count: rounds.length },
    { id: 'investments', label: 'Investments',  count: investments.length },
    { id: 'captable',    label: 'Cap Table',    count: capTable.length },
    { id: 'documents',   label: 'Documents',    count: documents.length },
  ]

  const th = 'px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left'
  const td = 'px-5 py-3.5'

  return (
    <div className="animate-fade-in">
      {/* Back + header */}
      <div className="mb-7">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Companies
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
              <Badge value={company.status} />
              <Badge value={company.strategy} type="strategy" />
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {company.sector}{company.hq ? ` · ${company.hq}` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil size={13} /> Edit
          </Button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: 'Total Invested', value: fmt$$(totalInvested),                           accent: 'violet' },
          { label: 'Current Value',  value: currentValue > 0 ? fmt$$(currentValue) : '—',   accent: 'emerald' },
          { label: 'MOIC',           value: moic > 0 ? fmtMultiple(moic) : '—',             accent: 'blue' },
          { label: 'Ownership',      value: ownershipPct > 0 ? fmtPct(ownershipPct) : '—',  accent: 'amber' },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-4 border-t-2 ${
              accent === 'violet'  ? 'border-t-violet-500'  :
              accent === 'emerald' ? 'border-t-emerald-500' :
              accent === 'blue'    ? 'border-t-blue-500'    :
                                     'border-t-amber-500'
            }`}
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-0.5 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04]">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Company Details</h3>
              {[
                { label: 'Name',     value: company.name },
                { label: 'Sector',   value: company.sector },
                { label: 'Strategy', value: company.strategy },
                { label: 'HQ',       value: company.hq || '—' },
                { label: 'Status',   value: company.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-slate-900 capitalize">{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Investment Summary</h3>
              {[
                { label: 'Total Invested', value: fmt$$(totalInvested) },
                { label: 'Ownership %',    value: ownershipPct > 0 ? fmtPct(ownershipPct) : '—' },
                {
                  label: 'Entry Valuation',
                  value: rounds.length
                    ? fmt$$([...rounds].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].post_money)
                    : '—',
                },
                { label: 'Current Valuation', value: latestRound ? fmt$$(latestRound.post_money) : '—' },
                { label: 'MOIC',              value: moic > 0 ? fmtMultiple(moic) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROUNDS */}
        {activeTab === 'rounds' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Funding Rounds</h3>
              <Button size="sm" onClick={() => setShowAddRound(true)}>
                <Plus size={13} /> Add Round
              </Button>
            </div>
            {rounds.length === 0 ? (
              <EmptyState message="No rounds recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      {['Date', 'Type', 'Pre-money', 'Post-money', 'Raised', ''].map((h) => (
                        <th key={h} className={`${th} ${h === '' ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rounds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 group transition-colors">
                        <td className={td + ' text-slate-500'}>{fmtDate(r.date)}</td>
                        <td className={td + ' font-medium text-slate-900'}>{r.type}</td>
                        <td className={td + ' text-slate-600'}>{r.pre_money > 0 ? fmt$$(r.pre_money) : '—'}</td>
                        <td className={td + ' text-slate-600'}>{r.post_money > 0 ? fmt$$(r.post_money) : '—'}</td>
                        <td className={td + ' text-slate-600'}>{r.amount_raised > 0 ? fmt$$(r.amount_raised) : '—'}</td>
                        <td className={td + ' text-right'}>
                          <button
                            onClick={() => handleDeleteRound(r.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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

        {/* INVESTMENTS */}
        {activeTab === 'investments' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Investments</h3>
              <Button size="sm" onClick={() => setShowAddInvestment(true)}>
                <Plus size={13} /> Add Investment
              </Button>
            </div>
            {investments.length === 0 ? (
              <EmptyState message="No investments recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      {['Date', 'Amount', 'Instrument', 'Valuation Cap', ''].map((h) => (
                        <th key={h} className={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {investments.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 group transition-colors">
                        <td className={td + ' text-slate-500'}>{fmtDate(inv.date)}</td>
                        <td className={td + ' font-semibold text-slate-900'}>{fmt$$(inv.amount)}</td>
                        <td className={td}>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                            {inv.instrument}
                          </span>
                        </td>
                        <td className={td + ' text-slate-600'}>
                          {inv.valuation_cap ? fmt$$(inv.valuation_cap) : '—'}
                        </td>
                        <td className={td + ' text-right'}>
                          <button
                            onClick={() => handleDeleteInvestment(inv.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</td>
                      <td className="px-5 py-3 text-sm font-bold text-slate-900">{fmt$$(totalInvested)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CAP TABLE */}
        {activeTab === 'captable' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Cap Table</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add the fund&apos;s entry last — it will be used for ownership calculations.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAddCapTable(true)}>
                <Plus size={13} /> Add Entry
              </Button>
            </div>
            {capTable.length === 0 ? (
              <EmptyState message="No cap table entries yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      {['Shareholder', 'Ownership %', ''].map((h) => (
                        <th key={h} className={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {capTable.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 group transition-colors">
                        <td className={td + ' font-medium text-slate-900'}>{entry.shareholder_name}</td>
                        <td className={td + ' text-slate-600'}>{fmtPct(entry.ownership_percentage)}</td>
                        <td className={td + ' text-right'}>
                          <button
                            onClick={() => handleDeleteCapTable(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="p-5">
            <DocumentUpload companyId={company.id} documents={documents} />
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={showEdit}            onClose={() => setShowEdit(false)}           title="Edit Company">
        <CompanyForm company={company} onClose={() => setShowEdit(false)} />
      </Modal>
      <Modal open={showAddRound}        onClose={() => setShowAddRound(false)}       title="Add Round">
        <RoundForm companyId={company.id} onClose={() => setShowAddRound(false)} />
      </Modal>
      <Modal open={showAddInvestment}   onClose={() => setShowAddInvestment(false)}  title="Add Investment">
        <InvestmentForm companyId={company.id} rounds={rounds} onClose={() => setShowAddInvestment(false)} />
      </Modal>
      <Modal open={showAddCapTable}     onClose={() => setShowAddCapTable(false)}    title="Add Cap Table Entry">
        <CapTableForm companyId={company.id} rounds={rounds} onClose={() => setShowAddCapTable(false)} />
      </Modal>
    </div>
  )
}
