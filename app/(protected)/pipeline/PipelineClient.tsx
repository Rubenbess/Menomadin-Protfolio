'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PipelineForm from '@/components/forms/PipelineForm'
import { deletePipelineEntry } from '@/actions/pipeline'
import type { PipelineEntry } from '@/lib/types'

const STATUS_ORDER = [
  'prospecting',
  'initial-meeting',
  'due-diligence',
  'term-sheet',
  'closed',
  'passed',
]

export default function PipelineClient({ entries }: { entries: PipelineEntry[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState<PipelineEntry | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from pipeline?`)) return
    await deletePipelineEntry(id)
    router.refresh()
  }

  const q = search.trim().toLowerCase()
  const filtered = entries
    .filter((e) => filter === 'all' || e.status === filter)
    .filter((e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      (e.sector ?? '').toLowerCase().includes(q) ||
      (e.stage ?? '').toLowerCase().includes(q) ||
      (e.notes ?? '').toLowerCase().includes(q) ||
      (e.lead_partner ?? '').toLowerCase().includes(q)
    )

  // Count by status
  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <h1 className="page-title">Deal Pipeline</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add Deal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deals by name, sector, stage, notes…"
          className="w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All ({entries.length})
        </button>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status.replace(/-/g, ' ')}
            {counts[status] ? ` (${counts[status]})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-gray-400 mb-4">
              {q
                ? `No deals match "${search}".`
                : filter === 'all'
                ? 'No deals in pipeline yet.'
                : `No deals with status "${filter.replace(/-/g, ' ')}".`}
            </p>
            {!q && filter === 'all' && (
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={16} />
                Add your first deal
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  {['Company', 'Sector', 'Stage', 'Status', 'Notes', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-200 group">
                    <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">{entry.name}</td>
                    <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-500">{entry.sector || '—'}</td>
                    <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-500">{entry.stage || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge value={entry.status} />
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-500 max-w-xs truncate">
                      {entry.notes || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditEntry(entry)}
                          className="p-1.5 text-neutral-500 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.name)}
                          className="p-1.5 text-neutral-500 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Deal">
        <PipelineForm onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Edit Deal"
      >
        {editEntry && (
          <PipelineForm entry={editEntry} onClose={() => setEditEntry(null)} />
        )}
      </Modal>
    </div>
  )
}
