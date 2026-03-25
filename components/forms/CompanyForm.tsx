'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createCompany, updateCompany, upsertContacts } from '@/actions/companies'
import type { Company, Contact } from '@/lib/types'

interface Props {
  company?: Company
  contacts?: Contact[]
  onClose: () => void
}

const SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Cleantech', 'Consumer', 'Deep Tech', 'Marketplace', 'Other']
const STRATEGIES = ['impact', 'venture']
const STATUSES = ['active', 'exited', 'written-off', 'watchlist']

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function CompanyForm({ company, contacts: initialContacts = [], onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState<{ name: string; position: string }[]>(
    initialContacts.length > 0
      ? initialContacts.map(c => ({ name: c.name, position: c.position }))
      : []
  )

  const isEdit = !!company

  function addContact() {
    setContacts(prev => [...prev, { name: '', position: '' }])
  }

  function removeContact(i: number) {
    setContacts(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateContact(i: number, field: 'name' | 'position', value: string) {
    setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = {
      name:        fd.get('name')        as string,
      sector:      fd.get('sector')      as string,
      strategy:    fd.get('strategy')    as string,
      hq:          fd.get('hq')          as string,
      status:      fd.get('status')      as string,
      description: (fd.get('description') as string) || null,
    }

    let companyId = company?.id ?? ''

    if (isEdit) {
      const result = await updateCompany(company.id, data)
      if (result.error) { setError(result.error); setLoading(false); return }
    } else {
      const result = await createCompany(data)
      if (result.error || !result.id) { setError(result.error ?? 'Failed to create'); setLoading(false); return }
      companyId = result.id
    }

    const validContacts = contacts.filter(c => c.name.trim())
    await upsertContacts(companyId, validContacts)

    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label}>Company Name *</label>
        <input name="name" required defaultValue={company?.name} className={input} placeholder="Acme Corp" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Sector *</label>
          <select name="sector" required defaultValue={company?.sector ?? ''} className={input}>
            <option value="" disabled>Select…</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Strategy *</label>
          <select name="strategy" required defaultValue={company?.strategy ?? ''} className={input}>
            <option value="" disabled>Select…</option>
            {STRATEGIES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>HQ</label>
          <input name="hq" defaultValue={company?.hq} className={input} placeholder="Amsterdam, NL" />
        </div>
        <div>
          <label className={label}>Status *</label>
          <select name="status" required defaultValue={company?.status ?? 'active'} className={input}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea
          name="description"
          defaultValue={company?.description ?? ''}
          className={`${input} resize-none`}
          rows={3}
          placeholder="Brief description of what this company does…"
        />
      </div>

      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`${label} mb-0`}>Contacts</label>
          <button
            type="button"
            onClick={addContact}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            <Plus size={12} /> Add contact
          </button>
        </div>
        {contacts.length === 0 && (
          <p className="text-xs text-slate-400 py-2">No contacts yet — click &quot;Add contact&quot; to add one.</p>
        )}
        <div className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={c.name}
                onChange={e => updateContact(i, 'name', e.target.value)}
                className={`${input} flex-1`}
                placeholder="Full name"
              />
              <input
                value={c.position}
                onChange={e => updateContact(i, 'position', e.target.value)}
                className={`${input} flex-1`}
                placeholder="Position"
              />
              <button
                type="button"
                onClick={() => removeContact(i)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {isEdit ? 'Save changes' : 'Add company'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
