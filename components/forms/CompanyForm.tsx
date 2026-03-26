'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Upload, X, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { createCompany, updateCompany, upsertContacts } from '@/actions/companies'
import { normalizeSector } from '@/lib/calculations'
import type { Company, Contact } from '@/lib/types'

interface Props {
  company?: Company
  contacts?: Contact[]
  onClose: () => void
}

const BASE_SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Cleantech', 'Consumer', 'Deep Tech', 'Marketplace', 'Other']
const STRATEGIES = ['impact', 'venture']
const STATUSES = ['active', 'exited', 'written-off', 'watchlist']
const ENTRY_STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Late Stage', 'Other']
const LS_KEY = 'custom_sectors'

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

function loadCustomSectors(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}

function saveCustomSectors(sectors: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sectors))
}

export default function CompanyForm({ company, contacts: initialContacts = [], onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState<{ name: string; position: string }[]>(
    initialContacts.length > 0
      ? initialContacts.map(c => ({ name: c.name, position: c.position }))
      : []
  )
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url ?? null)
  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [coInvestors, setCoInvestors] = useState<string[]>(company?.co_investors ?? [])

  const [customSectors, setCustomSectors] = useState<string[]>([])
  const [selectedSector, setSelectedSector] = useState(company?.sector ?? '')
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false)
  const [addingCustom, setAddingCustom] = useState(false)
  const [customSectorInput, setCustomSectorInput] = useState('')
  const sectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCustomSectors(loadCustomSectors())
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setSectorDropdownOpen(false)
        setAddingCustom(false)
        setCustomSectorInput('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allSectors = [...BASE_SECTORS, ...customSectors.filter(s => !BASE_SECTORS.includes(s))]

  function handleAddCustomSector() {
    const val = customSectorInput.trim()
    if (!val) return
    if (!allSectors.includes(val)) {
      const updated = [...customSectors, val]
      setCustomSectors(updated)
      saveCustomSectors(updated)
    }
    setSelectedSector(val)
    setAddingCustom(false)
    setCustomSectorInput('')
    setSectorDropdownOpen(false)
  }

  const isEdit = !!company

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadLogo(companyId: string): Promise<{ url: string | null; error: string | null }> {
    if (!logoFile) return { url: logoPreview, error: null }
    const supabase = createClient()
    const ext  = logoFile.name.split('.').pop()
    const path = `${companyId}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
    if (error) return { url: null, error: `Logo upload failed: ${error.message}` }
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

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

    if (!selectedSector) { setError('Please select a sector'); setLoading(false); return }

    const fd = new FormData(e.currentTarget)
    let companyId = company?.id ?? ''

    // Create/update company first (without logo) to get the ID
    const baseData = {
      name:        fd.get('name')         as string,
      sector:      normalizeSector(selectedSector),
      strategy:    fd.get('strategy')     as string,
      hq:          fd.get('hq')           as string,
      status:      fd.get('status')       as string,
      description: (fd.get('description') as string) || null,
      entry_stage:      (fd.get('entry_stage')      as string) || null,
      investment_owner: (fd.get('investment_owner') as string) || null,
      board_seat:       (fd.get('board_seat')       as string) || null,
      co_investors:     coInvestors.filter(v => v.trim()).length > 0 ? coInvestors.filter(v => v.trim()) : null,
      logo_url:         logoFile ? (company?.logo_url ?? null) : logoPreview,
    }

    if (isEdit) {
      const result = await updateCompany(company.id, baseData)
      if (result.error) { setError(result.error); setLoading(false); return }
    } else {
      const result = await createCompany(baseData)
      if (result.error || !result.id) { setError(result.error ?? 'Failed to create'); setLoading(false); return }
      companyId = result.id
    }

    // Upload logo if a new file was selected
    if (logoFile) {
      const { url, error: uploadError } = await uploadLogo(companyId)
      if (uploadError) { setError(uploadError); setLoading(false); return }
      if (url) await updateCompany(companyId, { ...baseData, logo_url: url })
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
          <div ref={sectorRef} className="relative">
            <button
              type="button"
              onClick={() => { setSectorDropdownOpen(o => !o); setAddingCustom(false) }}
              className={`${input} flex items-center justify-between text-left ${!selectedSector ? 'text-slate-400' : 'text-slate-900'}`}
            >
              <span>{selectedSector || 'Select…'}</span>
              <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
            </button>
            {sectorDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  {allSectors.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSelectedSector(s); setSectorDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${selectedSector === s ? 'text-violet-600 font-medium bg-violet-50' : 'text-slate-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100">
                  {addingCustom ? (
                    <div className="flex gap-1.5 p-2">
                      <input
                        autoFocus
                        value={customSectorInput}
                        onChange={e => setCustomSectorInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSector() } if (e.key === 'Escape') { setAddingCustom(false); setCustomSectorInput('') } }}
                        className="flex-1 px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                        placeholder="New sector name…"
                      />
                      <button type="button" onClick={handleAddCustomSector} className="px-2.5 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">Add</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCustom(true)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 transition-colors font-medium"
                    >
                      <Plus size={13} /> Add custom sector
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Entry Stage</label>
          <select name="entry_stage" defaultValue={company?.entry_stage ?? ''} className={input}>
            <option value="">Select…</option>
            {ENTRY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Logo</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          {logoPreview ? (
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white ring-1 ring-slate-100" />
              <span className="text-xs text-slate-500 flex-1 truncate">{logoFile?.name ?? 'Current logo'}</span>
              <button type="button" onClick={removeLogo} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-sm text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-all"
            >
              <Upload size={14} /> Upload image…
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Investment Owner</label>
          <input
            name="investment_owner"
            defaultValue={company?.investment_owner ?? ''}
            className={input}
            placeholder="e.g. John Smith"
          />
        </div>
        <div>
          <label className={label}>Board Seat</label>
          <select name="board_seat" defaultValue={company?.board_seat ?? ''} className={input}>
            <option value="">None</option>
            <option value="Board Seat">Board Seat</option>
            <option value="Observer Seat">Observer Seat</option>
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

      {/* Co-investors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`${label} mb-0`}>Co-investors</label>
          <button
            type="button"
            onClick={() => setCoInvestors(prev => [...prev, ''])}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {coInvestors.length === 0 && (
          <p className="text-xs text-slate-400 py-2">No co-investors yet — click &quot;Add&quot; to add one.</p>
        )}
        <div className="space-y-2">
          {coInvestors.map((name, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={name}
                onChange={e => setCoInvestors(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                className={`${input} flex-1`}
                placeholder="Investor name"
              />
              <button
                type="button"
                onClick={() => setCoInvestors(prev => prev.filter((_, idx) => idx !== i))}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
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
