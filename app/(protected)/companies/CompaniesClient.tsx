'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, MapPin, User, Search, X, ChevronDown, LayoutGrid, List } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import CompanyForm from '@/components/forms/CompanyForm'
import EmptyState from '@/components/EmptyState'
import { deleteCompany } from '@/actions/companies'
import { HealthScorePill } from '@/components/HealthScoreBadge'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { applyFilters, FilterGroup } from '@/lib/filter-utils'
import type { Company, Contact, HealthScore } from '@/lib/types'

const STRATEGY_FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'impact',  label: 'Menomadin Impact' },
  { value: 'venture', label: 'Menomadin Ventures' },
]

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  exited: 'Exited',
  'written-off': 'Written Off',
  watchlist: 'Watchlist',
}

// ── Filter dropdown ────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const active = !!value

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
          active
            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:text-slate-800'
        }`}
      >
        {active ? value : label}
        {active
          ? <X size={13} onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false) }} className="opacity-80 hover:opacity-100" />
          : <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        }
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-white rounded-lg shadow-xl ring-1 ring-black/[0.06] py-1 min-w-[160px]">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt === value ? '' : opt); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  opt === value
                    ? 'bg-gold-50 text-primary-600 font-medium'
                    : 'text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function CompaniesClient({
  companies,
  contacts,
  healthScores,
}: {
  companies: Company[]
  contacts: Contact[]
  healthScores: Record<string, HealthScore>
  strategyLabel: string | null
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'impact' | 'venture'>('all')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [hqFilter, setHqFilter] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState<FilterGroup | null>(null)

  const sectors = useMemo(() =>
    [...new Set(companies.map(c => c.sector).filter(Boolean))].sort(), [companies])
  const statuses = useMemo(() =>
    [...new Set(companies.map(c => c.status))].map(s => STATUS_LABELS[s] ?? s), [companies])
  const stages = useMemo(() =>
    [...new Set(companies.map(c => c.entry_stage).filter(Boolean))].sort() as string[], [companies])
  const hqs = useMemo(() =>
    [...new Set(companies.map(c => c.hq).filter(Boolean))].sort() as string[], [companies])

  const hasActiveFilters = !!(search || sectorFilter || statusFilter || stageFilter || hqFilter)

  function clearAll() {
    setSearch('')
    setSectorFilter('')
    setStatusFilter('')
    setStageFilter('')
    setHqFilter('')
  }

  const filtered = useMemo(() => {
    let list = strategyFilter === 'all' ? companies : companies.filter(c => c.strategy === strategyFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.sector?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.hq?.toLowerCase().includes(q)
      )
    }
    if (sectorFilter) list = list.filter(c => c.sector === sectorFilter)
    if (statusFilter) list = list.filter(c => (STATUS_LABELS[c.status] ?? c.status) === statusFilter)
    if (stageFilter)  list = list.filter(c => c.entry_stage === stageFilter)
    if (hqFilter)     list = list.filter(c => c.hq === hqFilter)
    if (advancedFilterGroup) {
      list = applyFilters(list, advancedFilterGroup)
    }
    return list
  }, [companies, strategyFilter, search, sectorFilter, statusFilter, stageFilter, hqFilter, advancedFilterGroup])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteCompany(id)
    router.refresh()
  }

  function contactsFor(companyId: string) {
    return contacts.filter(c => c.company_id === companyId)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex-1">
          <h1 className="page-title">Companies</h1>
          <p className="text-neutral-600 dark:text-neutral-500 text-sm mt-2">Manage your portfolio companies</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Company
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Strategy filter tabs */}
        <div className="flex gap-1.5 mb-4 bg-white dark:bg-neutral-800 rounded-lg p-1 shadow-sm dark:shadow-md dark:shadow-slate-900/30 border border-neutral-200 dark:border-neutral-700 dark:ring-white/[0.06] w-fit">
        {STRATEGY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStrategyFilter(value as typeof strategyFilter)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              strategyFilter === value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {value !== 'all' && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                value === 'impact' ? 'bg-emerald-400' : 'bg-blue-400'
              }`} />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700">
              <X size={13} />
            </button>
          )}
        </div>

        {sectors.length > 1 && (
          <FilterSelect label="Sector" value={sectorFilter} options={sectors} onChange={setSectorFilter} />
        )}
        {statuses.length > 1 && (
          <FilterSelect label="Status" value={statusFilter} options={statuses} onChange={setStatusFilter} />
        )}
        {stages.length > 1 && (
          <FilterSelect label="Stage" value={stageFilter} options={stages} onChange={setStageFilter} />
        )}
        {hqs.length > 1 && (
          <FilterSelect label="HQ" value={hqFilter} options={hqs} onChange={setHqFilter} />
        )}

        <button
          onClick={() => setShowAdvancedFilter(true)}
          className="text-xs text-neutral-700 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-200"
        >
          Advanced Filter
        </button>

        {(hasActiveFilters || advancedFilterGroup) && (
          <button
            onClick={() => {
              clearAll()
              setAdvancedFilterGroup(null)
            }}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X size={12} /> Clear all
          </button>
        )}

        <span className="text-xs text-neutral-500 ml-auto">
          {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
        </span>

        {/* View toggle */}
        <div className="flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 transition-colors ${viewMode === 'card' ? 'bg-slate-900 text-white' : 'text-neutral-500 hover:text-neutral-800'}`}
            title="Card view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-neutral-500 hover:text-neutral-800'}`}
            title="Table view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            type="companies"
            title={hasActiveFilters ? 'No companies found' : 'No companies yet'}
            description={hasActiveFilters ? 'Try adjusting your filters to find what you\'re looking for.' : 'Start building your portfolio by adding your first company.'}
            action={
              hasActiveFilters ? (
                <button onClick={clearAll} className="text-sm text-primary-500 dark:text-gold-300 hover:underline">
                  Clear filters
                </button>
              ) : (
                <Button onClick={() => setShowAdd(true)}>
                  <Plus size={15} /> Add your first company
                </Button>
              )
            }
          />
        </div>
      ) : viewMode === 'card' ? (
        /* ── Card grid ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((co) => {
            const coContacts = contactsFor(co.id)
            const hs = healthScores[co.id]
            return (
              <div
                key={co.id}
                className="card p-5 flex flex-col gap-3 group hover:shadow-md dark:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {co.logo_url && (
                        <img src={co.logo_url} alt={co.name} className="w-6 h-6 rounded-md object-contain bg-neutral-50 ring-1 ring-slate-100 flex-shrink-0" />
                      )}
                      <Link
                        href={`/companies/${co.id}`}
                        className="text-base font-semibold text-neutral-900 hover:text-primary-500 transition-colors leading-snug"
                      >
                        {co.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {hs && <HealthScorePill score={hs} />}
                      <Badge value={co.strategy} type="strategy" />
                      <Badge value={co.status} />
                    </div>
                  </div>
                  {co.hq && (
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin size={11} />
                      {co.hq}
                    </div>
                  )}
                </div>

                {/* Sector + Stage */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{co.sector}</p>
                  {co.entry_stage && (
                    <>
                      <span className="text-slate-200 text-xs">·</span>
                      <span className="text-xs text-neutral-500">{co.entry_stage}</span>
                    </>
                  )}
                </div>

                {co.description && (
                  <p className="text-sm text-neutral-700 leading-relaxed line-clamp-3">{co.description}</p>
                )}

                {coContacts.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                    {coContacts.map(contact => (
                      <div key={contact.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={11} className="text-primary-500" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-800">{contact.name}</span>
                          {contact.position && (
                            <span className="text-xs text-neutral-500"> · {contact.position}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditCompany(co)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(co.id, co.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Table view ─────────────────────────────────────────────────────── */
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">Company</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">Sector</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">HQ</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">Strategy</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest">Health</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(co => {
                const hs = healthScores[co.id]
                return (
                  <tr key={co.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {co.logo_url ? (
                          <img src={co.logo_url} alt={co.name} className="w-6 h-6 rounded-md object-contain bg-neutral-50 ring-1 ring-slate-100 flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-gold-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-500">{co.name[0]}</span>
                          </div>
                        )}
                        <Link href={`/companies/${co.id}`} className="font-semibold text-neutral-900 hover:text-primary-500 transition-colors">
                          {co.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{co.sector ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{co.hq ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{co.entry_stage ?? '—'}</td>
                    <td className="px-4 py-3"><Badge value={co.status} /></td>
                    <td className="px-4 py-3"><Badge value={co.strategy} type="strategy" /></td>
                    <td className="px-4 py-3 text-center">
                      {hs && <HealthScorePill score={hs} />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditCompany(co)}
                          className="p-1.5 text-slate-300 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(co.id, co.name)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Company">
          <CompanyForm onClose={() => setShowAdd(false)} />
        </Modal>

        <Modal open={!!editCompany} onClose={() => setEditCompany(null)} title="Edit Company">
          {editCompany && (
            <CompanyForm
              company={editCompany}
              contacts={contactsFor(editCompany.id)}
              onClose={() => setEditCompany(null)}
            />
          )}
        </Modal>

        {showAdvancedFilter && (
          <AdvancedFilterPanel
            entityType="company"
            onApply={(filterGroup) => {
              setAdvancedFilterGroup(filterGroup)
              setShowAdvancedFilter(false)
            }}
            onClose={() => setShowAdvancedFilter(false)}
          />
        )}
      </div>
    </div>
  )
}
