'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, MapPin, User, Search, X, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import CompanyForm from '@/components/forms/CompanyForm'
import { deleteCompany } from '@/actions/companies'
import type { Company, Contact } from '@/lib/types'

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

// ── Filter dropdown (reusable) ─────────────────────────────────────────────

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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
          active
            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'
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
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-white rounded-xl shadow-xl ring-1 ring-black/[0.06] py-1 min-w-[160px]">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt === value ? '' : opt); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  opt === value
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
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
}: {
  companies: Company[]
  contacts: Contact[]
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

  // Derive unique filter options from data
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

    return list
  }, [companies, strategyFilter, search, sectorFilter, statusFilter, stageFilter, hqFilter])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteCompany(id)
    router.refresh()
  }

  function contactsFor(companyId: string) {
    return contacts.filter(c => c.company_id === companyId)
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Companies</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Company
        </Button>
      </div>

      {/* Strategy filter tabs */}
      <div className="flex gap-1.5 mb-4 bg-white rounded-xl p-1 shadow-card ring-1 ring-black/[0.04] w-fit">
        {STRATEGY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStrategyFilter(value as typeof strategyFilter)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              strategyFilter === value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
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
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
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

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={12} /> Clear all
          </button>
        )}

        {/* Result count */}
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] px-5 py-20 text-center">
          <p className="text-sm text-slate-400 mb-5">
            {hasActiveFilters ? 'No companies match your filters.' : 'No companies yet.'}
          </p>
          {hasActiveFilters ? (
            <button onClick={clearAll} className="text-sm text-violet-600 hover:underline">Clear filters</button>
          ) : (
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add your first company
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((co) => {
            const coContacts = contactsFor(co.id)
            return (
              <div
                key={co.id}
                className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 flex flex-col gap-3 group hover:shadow-card-hover transition-shadow"
              >
                {/* Header */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {co.logo_url && (
                        <img src={co.logo_url} alt={co.name} className="w-6 h-6 rounded-md object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                      )}
                      <Link
                        href={`/companies/${co.id}`}
                        className="text-base font-semibold text-slate-900 hover:text-violet-600 transition-colors leading-snug"
                      >
                        {co.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      <Badge value={co.strategy} type="strategy" />
                      <Badge value={co.status} />
                    </div>
                  </div>
                  {co.hq && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={11} />
                      {co.hq}
                    </div>
                  )}
                </div>

                {/* Sector + Stage */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{co.sector}</p>
                  {co.entry_stage && (
                    <>
                      <span className="text-slate-200 text-xs">·</span>
                      <span className="text-xs text-slate-400">{co.entry_stage}</span>
                    </>
                  )}
                </div>

                {/* Description */}
                {co.description && (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{co.description}</p>
                )}

                {/* Contacts */}
                {coContacts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {coContacts.map(contact => (
                      <div key={contact.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={11} className="text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-800">{contact.name}</span>
                          {contact.position && (
                            <span className="text-xs text-slate-400"> · {contact.position}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditCompany(co)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(co.id, co.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )
          })}
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
    </div>
  )
}
