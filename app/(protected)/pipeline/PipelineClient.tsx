'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from pipeline?`)) return
    await deletePipelineEntry(id)
    router.refresh()
  }

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter)

  // Count by status
  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Deal Pipeline</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add Deal
        </Button>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-gray-400 mb-4">
              {filter === 'all' ? 'No deals in pipeline yet.' : `No deals with status "${filter.replace(/-/g, ' ')}".`}
            </p>
            {filter === 'all' && (
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
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Company', 'Sector', 'Stage', 'Status', 'Notes', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{entry.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{entry.sector || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{entry.stage || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge value={entry.status} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">
                      {entry.notes || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditEntry(entry)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
