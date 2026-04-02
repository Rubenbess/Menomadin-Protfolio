'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createKPI } from '@/actions/kpis'

interface Props {
  companyId: string
  sector?: string
  onClose: () => void
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

// Standard fields always shown
const STANDARD_FIELDS = [
  { name: 'arr',          label: 'ARR ($)',             placeholder: '2000000' },
  { name: 'burn_rate',    label: 'Burn Rate ($/mo)',    placeholder: '120000' },
  { name: 'cash_runway',  label: 'Cash Runway (mo)',    placeholder: '18' },
  { name: 'headcount',    label: 'Headcount',           placeholder: '42' },
  { name: 'revenue',      label: 'Revenue ($)',         placeholder: '1500000' },
  { name: 'run_rate',     label: 'Run Rate ($)',        placeholder: '1800000' },
  { name: 'gross_margin', label: 'Gross Margin (%)',    placeholder: '72' },
]

// Sector-specific suggested custom fields
const SECTOR_SUGGESTIONS: Record<string, string[]> = {
  Healthtech:   ['Monthly Active Users', 'NPS Score', 'Clinical Trial Stage', 'Patients Enrolled'],
  Cleantech:    ['Carbon Credits Issued (tons)', 'MWh Produced', 'CO2 Avoided (tons)', 'Sites Deployed'],
  Agritech:     ['Hectares Covered', 'Farmers Onboarded', 'Yield Improvement (%)'],
  SaaS:         ['MRR ($)', 'Churn Rate (%)', 'CAC ($)', 'LTV ($)', 'NPS Score'],
  Fintech:      ['AUM ($)', 'Transaction Volume ($)', 'Active Users', 'Churn Rate (%)'],
  Marketplace:  ['GMV ($)', 'Take Rate (%)', 'Active Buyers', 'Active Sellers'],
  'Deep Tech':  ['Patents Filed', 'R&D Spend ($)', 'Pilot Customers'],
  Consumer:     ['MAU', 'DAU', 'Retention Rate (%)', 'CAC ($)', 'LTV ($)'],
}

export default function KPIForm({ companyId, sector = '', onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customFields, setCustomFields] = useState<{ name: string; value: string }[]>([])

  const suggestions = SECTOR_SUGGESTIONS[sector] ?? SECTOR_SUGGESTIONS['SaaS']

  function addSuggestion(name: string) {
    if (customFields.some(f => f.name === name)) return
    setCustomFields(prev => [...prev, { name, value: '' }])
  }

  function addCustom() {
    setCustomFields(prev => [...prev, { name: '', value: '' }])
  }

  function updateField(i: number, key: 'name' | 'value', val: string) {
    setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f))
  }

  function removeField(i: number) {
    setCustomFields(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    function num(key: string) {
      const v = fd.get(key) as string
      return v ? Number(v) : null
    }

    const custom_kpis = customFields
      .filter(f => f.name.trim() && f.value.trim())
      .reduce((acc, f) => ({ ...acc, [f.name.trim()]: f.value.trim() }), {} as Record<string, string>)

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
      custom_kpis:  Object.keys(custom_kpis).length > 0 ? custom_kpis : null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={lbl}>Date *</label>
        <input name="date" type="date" required className={inp} defaultValue={new Date().toISOString().split('T')[0]} />
      </div>

      {/* Standard fields */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Standard Metrics</p>
        <div className="grid grid-cols-2 gap-3">
          {STANDARD_FIELDS.map(f => (
            <div key={f.name}>
              <label className={lbl}>{f.label}</label>
              <input name={f.name} type="number" step="any" className={inp} placeholder={f.placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* Sector-specific suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {sector ? `Suggested for ${sector}` : 'Suggested Metrics'}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => {
              const added = customFields.some(f => f.name === s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSuggestion(s)}
                  disabled={added}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    added
                      ? 'bg-gold-50 border-violet-200 text-gold-500 cursor-default'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-gold-300 hover:text-gold-500'
                  }`}
                >
                  {added ? '✓ ' : '+ '}{s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Fields</p>
          {customFields.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={f.name}
                onChange={e => updateField(i, 'name', e.target.value)}
                className={`${inp} flex-1`}
                placeholder="Metric name"
              />
              <input
                value={f.value}
                onChange={e => updateField(i, 'value', e.target.value)}
                className={`${inp} flex-1`}
                placeholder="Value"
              />
              <button type="button" onClick={() => removeField(i)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addCustom}
        className="flex items-center gap-1.5 text-xs text-gold-500 hover:text-gold-600 font-medium"
      >
        <Plus size={12} /> Add custom metric
      </button>

      <div>
        <label className={lbl}>Notes</label>
        <textarea name="notes" className={`${inp} resize-none`} rows={2} placeholder="Additional context…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">Save Snapshot</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
