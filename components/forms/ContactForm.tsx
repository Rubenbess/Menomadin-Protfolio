'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createContact, updateContact } from '@/actions/contacts'
import { createCompany } from '@/actions/companies'
import type { Contact } from '@/lib/types'

const CONTACT_TYPES = ['Founder', 'Advisor', 'Co-investor', 'Service Provider', 'Other'] as const

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

interface Props {
  contact?: Contact
  companies: { id: string; name: string }[]
  onClose: () => void
}

export default function ContactForm({ contact, companies, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCompany, setSelectedCompany] = useState(contact?.company_id ?? '')
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const isEdit = !!contact

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let companyId = selectedCompany || null

      // Create new company if needed
      if (showNewCompany && newCompanyName.trim()) {
        const companyResult = await createCompany({
          name: newCompanyName.trim(),
          sector: '',
          strategy: 'venture',
          hq: '',
          status: 'active',
          description: null,
          logo_url: null,
          entry_stage: null,
          investment_owner: null,
          board_seat: null,
          co_investors: null,
        })
        if (companyResult.error) {
          setError(companyResult.error)
          setLoading(false)
          return
        }
        companyId = companyResult.id
      }

      const fd = new FormData(e.currentTarget)
      const str = (k: string) => (fd.get(k) as string).trim() || null

      const data = {
        name:                 (fd.get('name') as string).trim(),
        position:             str('position'),
        email:                str('email'),
        phone:                str('phone'),
        address:              str('address'),
        linkedin_url:         str('linkedin_url'),
        company_id:           companyId,
        notes:                str('notes'),
        contact_type:         str('contact_type'),
        relationship_owner:   str('relationship_owner'),
      }

      if (!data.name) { setError('Name is required'); setLoading(false); return }

      const result = isEdit
        ? await updateContact(contact.id, data)
        : await createContact(data)

      if (result.error) { setError(result.error); setLoading(false); return }

      router.refresh()
      onClose()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>Full Name *</label>
        <input name="name" required defaultValue={contact?.name} className={inp} placeholder="Jane Smith" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Position / Title</label>
          <input name="position" defaultValue={contact?.position ?? ''} className={inp} placeholder="Partner, CEO…" />
        </div>
        <div>
          <label className={lbl}>Contact Type</label>
          <select name="contact_type" defaultValue={contact?.contact_type ?? ''} className={inp}>
            <option value="">—</option>
            {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Company</label>
          {!showNewCompany ? (
            <select
              value={selectedCompany}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewCompany(true)
                  setSelectedCompany('')
                } else {
                  setSelectedCompany(e.target.value)
                }
              }}
              className={inp}
            >
              <option value="">— No company —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__new__">+ Create new company</option>
            </select>
          ) : (
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter company name"
              className={inp}
              autoFocus
            />
          )}
          {showNewCompany && (
            <button
              type="button"
              onClick={() => {
                setShowNewCompany(false)
                setNewCompanyName('')
                setSelectedCompany('')
              }}
              className="text-xs text-slate-500 hover:text-slate-700 mt-1"
            >
              ← Back to list
            </button>
          )}
        </div>
        <div>
          <label className={lbl}>Relationship Owner</label>
          <input name="relationship_owner" defaultValue={contact?.relationship_owner ?? ''} className={inp} placeholder="Team member name" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Email</label>
          <input name="email" type="email" defaultValue={contact?.email ?? ''} className={inp} placeholder="jane@example.com" />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input name="phone" type="tel" defaultValue={contact?.phone ?? ''} className={inp} placeholder="+1 555 000 0000" />
        </div>
      </div>

      <div>
        <label className={lbl}>Address</label>
        <input name="address" defaultValue={contact?.address ?? ''} className={inp} placeholder="Tel Aviv, Israel" />
      </div>

      <div>
        <label className={lbl}>LinkedIn URL</label>
        <input name="linkedin_url" defaultValue={contact?.linkedin_url ?? ''} className={inp} placeholder="https://linkedin.com/in/…" />
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea name="notes" rows={3} defaultValue={contact?.notes ?? ''} className={`${inp} resize-none`} placeholder="Any context about this contact…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {isEdit ? 'Save changes' : 'Add contact'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
