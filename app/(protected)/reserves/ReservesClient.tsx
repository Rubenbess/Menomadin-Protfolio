'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ReserveForm from '@/components/forms/ReserveForm'
import { deleteReserve } from '@/actions/reserves'
import type { Company, Reserve } from '@/lib/types'
import { fmt$$ } from '@/lib/calculations'

// ── Types ─────────────────────────────────────────────────────────────────────

type CompanySnippet = Pick<Company, 'id' | 'name' | 'sector' | 'strategy' | 'logo_url' | 'status'>

interface Props {
  companies: CompanySnippet[]
  reserves:  Reserve[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(deployed: number, planned: number) {
  if (!planned) return 0
  return Math.min(Math.round((deployed / planned) * 100), 100)
}

function barColor(p: number) {
  if (p >= 100) return 'bg-emerald-500'
  if (p >= 75)  return 'bg-gold-500'
  if (p >= 40)  return 'bg-blue-400'
  return 'bg-slate-300'
}

function remaining(planned: number, deployed: number) {
  const r = planned - deployed
  return r > 0 ? r : 0
}

function CompanyAvatar({ co }: { co: CompanySnippet }) {
  if (co.logo_url) return (
    <img src={co.logo_url} alt={co.name} className="w-8 h-8 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-200 flex-shrink-0" />
  )
  return (
    <div className="w-8 h-8 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-gold-500">{co.name[0]}</span>
    </div>
  )
}

// ── Reserve row ───────────────────────────────────────────────────────────────

function ReserveRow({
  co,
  reserve,
  onEdit,
  onDelete,
}: {
  co: CompanySnippet
  reserve: Reserve
  onEdit: () => void
  onDelete: () => void
}) {
  const p        = pct(reserve.deployed_amount, reserve.reserved_amount)
  const rem      = remaining(reserve.reserved_amount, reserve.deployed_amount)
  const overDep  = reserve.deployed_amount > reserve.reserved_amount

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 group">
      {/* Company */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <CompanyAvatar co={co} />
          <div>
            <Link href={`/companies/${co.id}`} className="text-sm font-semibold text-slate-900 hover:text-gold-500 transition-colors">
              {co.name}
            </Link>
            <p className="text-xs text-slate-400">{co.sector}</p>
          </div>
        </div>
      </td>

      {/* Strategy */}
      <td className="px-4 py-3.5">
        <span className={`flex items-center gap-1.5 text-xs font-medium`}>
          <span className={`w-1.5 h-1.5 rounded-full ${co.strategy === 'impact' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          {co.strategy === 'impact' ? 'Impact' : 'Ventures'}
        </span>
      </td>

      {/* Target Round */}
      <td className="px-4 py-3.5 text-xs text-slate-500">
        {reserve.target_round ?? <span className="text-slate-300">—</span>}
      </td>

      {/* Planned */}
      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
        {fmt$$(reserve.reserved_amount)}
      </td>

      {/* Progress */}
      <td className="px-4 py-3.5 w-40">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={overDep ? 'text-red-600 font-semibold' : 'text-slate-600'}>
              {fmt$$(reserve.deployed_amount)}
            </span>
            <span className={`font-semibold text-[11px] ${overDep ? 'text-red-500' : 'text-slate-400'}`}>
              {overDep ? 'Over' : `${p}%`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${overDep ? 'bg-red-400' : barColor(p)}`}
              style={{ width: `${p}%` }}
            />
          </div>
        </div>
      </td>

      {/* Remaining */}
      <td className="px-4 py-3.5 text-right">
        {overDep ? (
          <span className="text-xs font-semibold text-red-500">Over by {fmt$$(reserve.deployed_amount - reserve.reserved_amount)}</span>
        ) : (
          <span className="text-sm font-medium text-emerald-600">{fmt$$(rem)}</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReservesClient({ companies, reserves }: Props) {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<CompanySnippet | null>(null)
  const [addTarget,  setAddTarget]  = useState<CompanySnippet | null>(null)

  const reserveMap = new Map(reserves.map(r => [r.company_id, r]))

  const withReserve    = companies.filter(c => reserveMap.has(c.id))
  const withoutReserve = companies.filter(c => !reserveMap.has(c.id))

  // Totals
  const totalPlanned  = reserves.reduce((s, r) => s + r.reserved_amount,  0)
  const totalDeployed = reserves.reduce((s, r) => s + r.deployed_amount,   0)
  const totalRemain   = reserves.reduce((s, r) => s + remaining(r.reserved_amount, r.deployed_amount), 0)
  const overallPct    = totalPlanned > 0 ? Math.round((totalDeployed / totalPlanned) * 100) : 0

  async function handleDelete(companyId: string, name: string) {
    if (!confirm(`Remove reserve for "${name}"?`)) return
    await deleteReserve(companyId)
    router.refresh()
  }

  const editReserve = editTarget ? reserveMap.get(editTarget.id) : undefined

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="page-title">Follow-on Reserves</h1>
          <p className="text-sm text-slate-400 mt-0.5">Planned vs deployed capital per portfolio company</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Planned',   value: fmt$$(totalPlanned),  sub: `${withReserve.length} companies`, accent: 'text-gold-500' },
          { label: 'Total Deployed',  value: fmt$$(totalDeployed), sub: `${overallPct}% of reserves`,      accent: 'text-blue-600' },
          { label: 'Remaining',       value: fmt$$(totalRemain),   sub: 'available to deploy',              accent: 'text-emerald-600' },
          { label: 'No Reserve Set',  value: String(withoutReserve.length), sub: 'companies',              accent: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {totalPlanned > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-slate-700">Portfolio Reserve Deployment</span>
            <span className="font-bold text-gold-500">{overallPct}% deployed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${barColor(overallPct)}`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1.5">
            <span>{fmt$$(totalDeployed)} deployed</span>
            <span>{fmt$$(totalRemain)} remaining</span>
          </div>
        </div>
      )}

      {/* Reserves table */}
      {withReserve.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Reserve Allocations</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-0.5">{withReserve.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Strategy</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Target Round</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Planned</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Deployed</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Remaining</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {withReserve.map(co => (
                  <ReserveRow
                    key={co.id}
                    co={co}
                    reserve={reserveMap.get(co.id)!}
                    onEdit={() => setEditTarget(co)}
                    onDelete={() => handleDelete(co.id, co.name)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Companies without reserves */}
      {withoutReserve.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            No Reserve Set ({withoutReserve.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {withoutReserve.map(co => (
              <div
                key={co.id}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 group hover:border-violet-200 transition-colors"
              >
                <CompanyAvatar co={co} />
                <div className="flex-1 min-w-0">
                  <Link href={`/companies/${co.id}`} className="text-sm font-semibold text-slate-900 hover:text-gold-500 transition-colors truncate block">
                    {co.name}
                  </Link>
                  <p className="text-xs text-slate-400">{co.sector}</p>
                </div>
                <button
                  onClick={() => setAddTarget(co)}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-gold-500 hover:text-gold-600 opacity-0 group-hover:opacity-100 transition-opacity bg-gold-50 px-2.5 py-1.5 rounded-lg"
                >
                  <TrendingUp size={12} /> Set reserve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {withReserve.length === 0 && withoutReserve.length === 0 && (
        <div className="card px-5 py-20 text-center">
          <p className="text-sm text-slate-400 mb-4">No portfolio companies yet.</p>
          <Link href="/companies" className="text-sm font-semibold text-gold-500 hover:underline">
            Add companies →
          </Link>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Reserve">
        {editTarget && (
          <ReserveForm
            companyId={editTarget.id}
            companyName={editTarget.name}
            reserve={editReserve}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Add modal */}
      <Modal open={!!addTarget} onClose={() => setAddTarget(null)} title="Set Reserve">
        {addTarget && (
          <ReserveForm
            companyId={addTarget.id}
            companyName={addTarget.name}
            onClose={() => setAddTarget(null)}
          />
        )}
      </Modal>
      </div>
    </div>
  )
}
