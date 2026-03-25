'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createKPI } from '@/actions/kpis'

interface Props {
  companyId: string
  onClose: () => void
}

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

const FIELDS = [
  { name: 'revenue',      label: 'Revenue',          placeholder: 'e.g. 1500000' },
  { name: 'arr',          label: 'ARR',               placeholder: 'e.g. 2000000' },
  { name: 'run_rate',     label: 'Run Rate',          placeholder: 'e.g. 1800000' },
  { name: 'burn_rate',    label: 'Burn Rate ($/mo)',  placeholder: 'e.g. 120000' },
  { name: 'cash_runway',  label: 'Cash Runway (mo)',  placeholder: 'e.g. 18' },
  { name: 'headcount',    label: 'Headcount',         placeholder: 'e.g. 42' },
  { name: 'gross_margin', label: 'Gross Margin (%)',  placeholder: 'e.g. 72' },
]

export default function KPIForm({ companyId, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    function num(key: string) {
      const v = fd.get(key) as string
      return v ? Number(v) : null
    }

    const result = await createKPI({
      company_id:   companyId,
      date:         fd.get('date') as string,
      revenue:      num('revenue'),
      arr:          num('arr'),
      run_rate:     num('run_rate'),
      burn_rate:    num('burn_rate'),
      cash_runway:  num('cash_runway'),
      headcount:    num('headcount'),
      gross_margin: num('gross_margin'),
      notes:        (fd.get('notes') as string) || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label}>Date *</label>
        <input name="date" type="date" required className={input} defaultValue={new Date().toISOString().split('T')[0]} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.name}>
            <label className={label}>{f.label}</label>
            <input name={f.name} type="number" step="any" className={input} placeholder={f.placeholder} />
          </div>
        ))}
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea name="notes" className={`${input} resize-none`} rows={2} placeholder="Additional context…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Save KPIs</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
