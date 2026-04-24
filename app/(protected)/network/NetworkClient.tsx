'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, Building2, TrendingUp } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanySnippet {
  id: string
  name: string
  sector: string
  strategy: string
  hq: string
  status: string
  logo_url: string | null
  co_investors: string[] | null
}

interface CoInvestorNode {
  name: string
  companies: CompanySnippet[]
}

interface Props {
  nodes: CoInvestorNode[]
  allCompanies: CompanySnippet[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ co }: { co: CompanySnippet }) {
  if (co.logo_url) {
    return (
      <img
        src={co.logo_url}
        alt={co.name}
        className="w-5 h-5 rounded-md object-contain bg-neutral-50 ring-1 ring-slate-200 flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-5 h-5 rounded-md bg-gold-100 flex items-center justify-center flex-shrink-0">
      <span className="text-[9px] font-bold text-primary-500">{co.name[0]}</span>
    </div>
  )
}

// ── Co-investor card ──────────────────────────────────────────────────────────

function CoInvestorCard({
  node,
  rank,
  isHighlighted,
  onClick,
  selected,
}: {
  node: CoInvestorNode
  rank: number
  isHighlighted: boolean
  onClick: () => void
  selected: boolean
}) {
  const impactCount  = node.companies.filter(c => c.strategy === 'impact').length
  const ventureCount = node.companies.filter(c => c.strategy === 'venture').length
  const total        = node.companies.length

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-5 cursor-pointer transition-all ring-1 ${
        selected
          ? 'ring-gold-300 shadow-lg shadow-gold-100'
          : isHighlighted
          ? 'ring-neutral-200 shadow-sm dark:shadow-md-hover'
          : 'ring-neutral-200 shadow-sm dark:shadow-md hover:shadow-sm dark:shadow-md-hover hover:ring-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {rank <= 3 && (
              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                rank === 1 ? 'bg-amber-100 text-amber-600' :
                rank === 2 ? 'bg-neutral-100 text-neutral-600' :
                'bg-orange-50 text-orange-500'
              }`}>
                {rank}
              </span>
            )}
            <p className="text-sm font-bold text-neutral-900 leading-tight">{node.name}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold bg-gold-100 text-primary-600 rounded-full px-2.5 py-0.5">
          {total} {total === 1 ? 'deal' : 'deals'}
        </span>
      </div>

      {/* Strategy bar */}
      {total > 1 && (impactCount > 0 || ventureCount > 0) && (
        <div className="mb-3">
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
            {impactCount > 0 && (
              <div
                className="bg-emerald-400 rounded-full transition-all"
                style={{ width: `${(impactCount / total) * 100}%` }}
                title={`${impactCount} Impact`}
              />
            )}
            {ventureCount > 0 && (
              <div
                className="bg-blue-400 rounded-full transition-all"
                style={{ width: `${(ventureCount / total) * 100}%` }}
                title={`${ventureCount} Catalyst`}
              />
            )}
          </div>
          <div className="flex gap-3 mt-1">
            {impactCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {impactCount} Impact
              </span>
            )}
            {ventureCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {ventureCount} Catalyst
              </span>
            )}
          </div>
        </div>
      )}

      {/* Company chips */}
      <div className="flex flex-col gap-1.5">
        {node.companies.slice(0, 5).map(co => (
          <Link
            key={co.id}
            href={`/companies/${co.id}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-50 hover:bg-gold-50 hover:text-primary-600 group/chip transition-colors"
          >
            <Avatar co={co} />
            <span className="text-xs font-medium text-neutral-800 group-hover/chip:text-primary-600 transition-colors truncate">{co.name}</span>
            <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              co.strategy === 'impact' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {co.strategy === 'impact' ? 'Impact' : 'Ventures'}
            </span>
          </Link>
        ))}
        {node.companies.length > 5 && (
          <p className="text-xs text-neutral-500 px-2.5">+{node.companies.length - 5} more</p>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NetworkClient({ nodes, allCompanies }: Props) {
  const [search, setSearch] = useState('')
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'impact' | 'venture'>('all')
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null)

  // Companies with no co-investors
  const companiesWithout = allCompanies.filter(c => !c.co_investors?.length)

  const filteredNodes = useMemo(() => {
    let list = nodes

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.companies.some(c => c.name.toLowerCase().includes(q))
      )
    }

    if (strategyFilter !== 'all') {
      list = list
        .map(n => ({ ...n, companies: n.companies.filter(c => c.strategy === strategyFilter) }))
        .filter(n => n.companies.length > 0)
    }

    return list
  }, [nodes, search, strategyFilter])

  // Highlight companies shared with selected investor
  const selectedNode = selectedInvestor
    ? nodes.find(n => n.name === selectedInvestor) ?? null
    : null

  // Unique co-investors that appear alongside the selected one
  const siblingInvestors = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    const set = new Set<string>()
    for (const co of selectedNode.companies) {
      for (const inv of co.co_investors ?? []) {
        if (inv !== selectedNode.name) set.add(inv)
      }
    }
    return set
  }, [selectedNode])

  // Stats
  const totalUniqueInvestors = nodes.length
  const totalConnections     = nodes.reduce((s, n) => s + n.companies.length, 0)
  const avgDealsPerInvestor  = totalUniqueInvestors > 0
    ? (totalConnections / totalUniqueInvestors).toFixed(1) : '0'
  const mostActive = nodes[0]

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <h1 className="page-title">Co-investor Network</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Syndicate relationships across portfolio</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Unique Co-investors', value: String(totalUniqueInvestors), icon: <TrendingUp size={14} /> },
          { label: 'Total Connections',   value: String(totalConnections),     icon: <Building2 size={14} /> },
          { label: 'Avg Deals / Investor',value: avgDealsPerInvestor,          icon: <TrendingUp size={14} /> },
          { label: 'Most Active',         value: mostActive?.name ?? '—',      icon: <Building2 size={14} /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-neutral-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-neutral-500 font-medium mb-1">{s.label}</p>
            <p className="text-base font-bold text-neutral-900 truncate" title={s.value}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search co-investors or companies…"
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Strategy filter */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-neutral-200 p-1">
          {(['all', 'impact', 'venture'] as const).map(v => (
            <button
              key={v}
              onClick={() => setStrategyFilter(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                strategyFilter === v
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              {v !== 'all' && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                  v === 'impact' ? 'bg-emerald-400' : 'bg-blue-400'
                }`} />
              )}
              {v === 'all' ? 'All' : v === 'impact' ? 'Impact' : 'Ventures'}
            </button>
          ))}
        </div>

        {selectedInvestor && (
          <button
            onClick={() => setSelectedInvestor(null)}
            className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X size={12} /> Clear selection
          </button>
        )}

        <span className="text-xs text-neutral-500 ml-auto">
          {filteredNodes.length} co-investor{filteredNodes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Selected investor detail banner */}
      {selectedNode && (
        <div className="mb-5 bg-gold-50 rounded-lg border border-violet-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-0.5">Selected co-investor</p>
              <p className="text-base font-bold text-violet-900">{selectedNode.name}</p>
              <p className="text-xs text-primary-500 mt-1">
                Co-invested in {selectedNode.companies.length} portfolio {selectedNode.companies.length === 1 ? 'company' : 'companies'}
                {siblingInvestors.size > 0 && ` · shares deals with ${siblingInvestors.size} other investor${siblingInvestors.size !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setSelectedInvestor(null)}
              className="p-1.5 text-gold-300 hover:text-primary-600 hover:bg-gold-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {siblingInvestors.size > 0 && (
            <div className="mt-3 pt-3 border-t border-violet-200">
              <p className="text-xs text-primary-500 font-medium mb-2">Co-appears with:</p>
              <div className="flex flex-wrap gap-1.5">
                {[...siblingInvestors].map(inv => (
                  <button
                    key={inv}
                    onClick={() => setSelectedInvestor(inv)}
                    className="text-xs px-2.5 py-1 rounded-full bg-gold-100 text-primary-600 hover:bg-violet-200 transition-colors font-medium"
                  >
                    {inv}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards grid */}
      {filteredNodes.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="text-sm text-neutral-500">
            {nodes.length === 0
              ? 'No co-investor data yet. Add co-investors to companies to see the network.'
              : 'No co-investors match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNodes.map((node, i) => (
            <CoInvestorCard
              key={node.name}
              node={node}
              rank={i + 1}
              isHighlighted={siblingInvestors.has(node.name)}
              selected={selectedInvestor === node.name}
              onClick={() => setSelectedInvestor(prev => prev === node.name ? null : node.name)}
            />
          ))}
        </div>
      )}

      {/* Companies without co-investors */}
      {companiesWithout.length > 0 && !search && strategyFilter === 'all' && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            No co-investor data ({companiesWithout.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {companiesWithout.map(co => (
              <Link
                key={co.id}
                href={`/companies/${co.id}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-600 hover:text-primary-500 hover:border-violet-200 transition-colors"
              >
                <Avatar co={co} />
                {co.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
