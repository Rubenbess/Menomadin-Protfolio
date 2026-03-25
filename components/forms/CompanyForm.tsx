'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createCompany, updateCompany } from '@/actions/companies'
import type { Company } from '@/lib/types'

interface Props {
  company?: Company
  onClose: () => void
}

const SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Cleantech', 'Consumer', 'Deep Tech', 'Marketplace', 'Other']
const STRATEGIES = ['impact', 'venture']
const STATUSES = ['active', 'exited', 'written-off', 'watchlist']

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function CompanyForm({ company, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!company

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = {
      name:     fd.get('name')     as string,
      sector:   fd.get('sector')   as string,
      strategy: fd.get('strategy') as string,
      hq:       fd.get('hq')       as string,
      status:   fd.get('status')   as string,
    }

    const result = isEdit ? await updateCompany(company.id, data) : await createCompany(data)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

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
