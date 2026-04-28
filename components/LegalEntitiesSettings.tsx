'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createLegalEntity, updateLegalEntity, deleteLegalEntity } from '@/actions/legal-entities'
import type { LegalEntity } from '@/lib/types'

const input = 'w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 focus:bg-white transition-all'

export default function LegalEntitiesSettings({ entities }: { entities: LegalEntity[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAlias, setEditAlias] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAlias, setNewAlias] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function startEdit(e: LegalEntity) {
    setEditingId(e.id)
    setEditName(e.name)
    setEditAlias(e.cap_table_alias ?? '')
    setError('')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setLoading(true)
    const res = await updateLegalEntity(id, { name: editName, cap_table_alias: editAlias || null })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entity? Investments tagged with it will remain but lose the entity tag.')) return
    await deleteLegalEntity(id)
    router.refresh()
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setLoading(true)
    const res = await createLegalEntity({ name: newName, cap_table_alias: newAlias || null })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setNewName('')
    setNewAlias('')
    setShowAdd(false)
    router.refresh()
  }

  return (
    <div className="card divide-y divide-neutral-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Legal Entities</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Investment vehicles used by the fund (e.g. MIF, MHAG). The cap table alias links each entity to its name in the cap table.
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(true); setError('') }}>
          <Plus size={13} /> Add Entity
        </Button>
      </div>

      {/* Add row */}
      {showAdd && (
        <div className="px-6 py-4 bg-gold-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">Entity Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. MIF"
                className={input}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">Cap Table Name (optional)</label>
              <input
                value={newAlias}
                onChange={e => setNewAlias(e.target.value)}
                placeholder="Name as it appears in cap table"
                className={input}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" loading={loading} onClick={handleAdd}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowAdd(false); setNewName(''); setNewAlias('') }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Entity rows */}
      {entities.length === 0 && !showAdd && (
        <div className="px-6 py-8 text-center text-sm text-neutral-400">
          No entities yet. Add your first one above.
        </div>
      )}

      {entities.map(entity => (
        <div key={entity.id} className="px-6 py-4">
          {editingId === entity.id ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">Entity Name *</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className={input} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">Cap Table Name</label>
                <input value={editAlias} onChange={e => setEditAlias(e.target.value)} placeholder="Name as it appears in cap table" className={input} />
              </div>
              {error && <p className="col-span-2 text-xs text-red-600">{error}</p>}
              <div className="col-span-2 flex gap-2">
                <button onClick={() => saveEdit(entity.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-200 transition-colors">
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{entity.name}</p>
                </div>
                {entity.cap_table_alias && (
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-0.5">Cap Table Name</p>
                    <p className="text-sm text-neutral-600">{entity.cap_table_alias}</p>
                  </div>
                )}
                {!entity.cap_table_alias && (
                  <p className="text-xs text-neutral-400 italic">No cap table alias — uses exact name match</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(entity)} className="p-1.5 text-neutral-400 hover:text-primary-500 hover:bg-gold-50 rounded-lg transition-all">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(entity.id)} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
