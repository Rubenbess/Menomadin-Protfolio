'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, X, Pencil, Trash2, Mail, Phone, MapPin,
  Linkedin, Building2, ExternalLink, SlidersHorizontal,
  MessageSquare, CalendarDays, Users, ChevronDown, Lock,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ContactForm from '@/components/forms/ContactForm'
import EmptyState from '@/components/EmptyState'
import { deleteContact, createInteraction, deleteInteraction } from '@/actions/contacts'
import ContactTasks from './ContactTasks'
import { usePermissions } from '@/hooks/usePermissions'
import type { ContactWithCompany, ContactInteraction, InteractionType } from '@/lib/types'

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'call',    label: 'Phone call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email',   label: 'Email' },
  { value: 'other',   label: 'Other' },
]

const CONTACT_TYPES = ['Founder', 'Advisor', 'Co-investor', 'Service Provider', 'Other']

interface Props {
  contacts: ContactWithCompany[]
  companies: { id: string; name: string }[]
  interactionsByContact: Record<string, ContactInteraction[]>
}

function avatarColor(name: string) {
  const colors = [
    'bg-gold-100 text-primary-600',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function typeIcon(t: InteractionType) {
  if (t === 'call')    return '📞'
  if (t === 'meeting') return '🤝'
  if (t === 'email')   return '✉️'
  return '💬'
}

// ── Add Interaction Form ─────────────────────────────────────────────────────

function AddInteractionForm({ contactId, onDone }: { contactId: string; onDone: () => void }) {
  const router = useRouter()
  const [type, setType] = useState<InteractionType>('call')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createInteraction({ contact_id: contactId, date, interaction_type: type, notes: notes || null })
    setSaving(false)
    router.refresh()
    onDone()
  }

  const inp = 'px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 focus:bg-white transition-all'

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-50 rounded-lg p-4 ring-1 ring-slate-200 space-y-3">
      <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Log Interaction</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={e => setType(e.target.value as InteractionType)} className={inp}>
          {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} required />
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className={`${inp} w-full resize-none`}
        placeholder="What was discussed…"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Log interaction'}
        </button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-neutral-600 hover:text-neutral-800 text-xs">Cancel</button>
      </div>
    </form>
  )
}

// ── Contact Panel (slide-over) ───────────────────────────────────────────────

function ContactPanel({
  contact,
  interactions,
  onClose,
  onEdit,
  onDelete,
  canUpdate,
  canDelete: canDeletePerm,
}: {
  contact: ContactWithCompany
  interactions: ContactInteraction[]
  onClose: () => void
  onEdit: (c: ContactWithCompany) => void
  onDelete: (id: string, name: string) => void
  canUpdate: { allowed: boolean }
  canDelete: { allowed: boolean }
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'interactions' | 'tasks'>('interactions')
  const [showAddInteraction, setShowAddInteraction] = useState(false)

  const sorted = [...interactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  async function handleDeleteInteraction(id: string) {
    await deleteInteraction(id)
    router.refresh()
  }

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900/30 dark:bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 ${avatarColor(contact.name)}`}>
              {initials(contact.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{contact.name}</h2>
              {contact.position && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">{contact.position}</p>}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {contact.companies && (
                  <p className="text-xs text-primary-500 dark:text-primary-300 font-medium flex items-center gap-1">
                    <Building2 size={11} /> {contact.companies.name}
                  </p>
                )}
                {contact.contact_type && (
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                    {contact.contact_type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/60 px-6">
          <button
            onClick={() => setTab('interactions')}
            className={`py-3 px-4 text-xs font-semibold transition-all ${
              tab === 'interactions'
                ? 'text-primary-500 dark:text-primary-300 border-b-2 border-primary-500 -mb-px bg-white dark:bg-neutral-900'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            Interactions
          </button>
          <button
            onClick={() => setTab('tasks')}
            className={`py-3 px-4 text-xs font-semibold transition-all ${
              tab === 'tasks'
                ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Tasks
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {tab === 'interactions' && (
            <>

          {/* Contact info */}
          <div className="space-y-2.5">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-lg hover:bg-gold-50 hover:text-primary-600 transition-colors group">
                <Mail size={15} className="text-neutral-500 group-hover:text-primary-500 flex-shrink-0" />
                <span className="text-sm text-neutral-800 group-hover:text-primary-600 truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-lg hover:bg-gold-50 hover:text-primary-600 transition-colors group">
                <Phone size={15} className="text-neutral-500 group-hover:text-primary-500 flex-shrink-0" />
                <span className="text-sm text-neutral-800 group-hover:text-primary-600">{contact.phone}</span>
              </a>
            )}
            {contact.address && (
              <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-xl">
                <MapPin size={15} className="text-neutral-500 flex-shrink-0" />
                <span className="text-sm text-neutral-800">{contact.address}</span>
              </div>
            )}
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors group">
                <Linkedin size={15} className="text-neutral-500 group-hover:text-blue-500 flex-shrink-0" />
                <span className="text-sm text-neutral-800 group-hover:text-blue-700 flex-1 truncate">LinkedIn Profile</span>
                <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
              </a>
            )}
          </div>

          {/* CRM meta */}
          {(contact.relationship_owner || contact.last_interaction_date) && (
            <div className="grid grid-cols-2 gap-3">
              {contact.relationship_owner && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Directors / Owner</p>
                  <p className="text-sm text-neutral-800 flex items-center gap-1.5"><Users size={12} className="text-neutral-500" /> {contact.relationship_owner}</p>
                </div>
              )}
              {contact.last_interaction_date && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Last Interaction</p>
                  <p className="text-sm text-neutral-800 flex items-center gap-1.5"><CalendarDays size={12} className="text-neutral-500" /> {fmtDate(contact.last_interaction_date)}</p>
                </div>
              )}
            </div>
          )}

          {contact.notes && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {/* Interaction timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Interaction Log</p>
              <button
                onClick={() => setShowAddInteraction(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                <Plus size={12} /> Log
              </button>
            </div>

            {showAddInteraction && (
              <div className="mb-3">
                <AddInteractionForm contactId={contact.id} onDone={() => setShowAddInteraction(false)} />
              </div>
            )}

            {sorted.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-4">No interactions logged yet.</p>
            ) : (
              <div className="space-y-2">
                {sorted.map(item => (
                  <div key={item.id} className="flex items-start gap-3 group">
                    <span className="text-base mt-0.5">{typeIcon(item.interaction_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-800 capitalize">{item.interaction_type}</span>
                        <span className="text-xs text-neutral-500">{fmtDate(item.date)}</span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{item.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteInteraction(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded transition-all flex-shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Added</p>
            <p className="text-sm text-neutral-600">{fmtDate(contact.created_at)}</p>
          </div>

            </>
          )}

          {tab === 'tasks' && (
            <ContactTasks contactId={contact.id} contactName={contact.name} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex gap-3">
          {canUpdate.allowed && (
            <button
              onClick={() => { onClose(); onEdit(contact) }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <Pencil size={14} /> Edit contact
            </button>
          )}
          {canDeletePerm.allowed && (
            <button
              onClick={() => { onClose(); onDelete(contact.id, contact.name) }}
              className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ContactsClient({ contacts, companies, interactionsByContact }: Props) {
  const router = useRouter()
  const { canCreate, canUpdate, canDelete } = usePermissions('contacts')
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editContact, setEditContact] = useState<ContactWithCompany | null>(null)
  const [panelContact, setPanelContact] = useState<ContactWithCompany | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contacts.filter(c => {
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.position?.toLowerCase().includes(q) ?? false) ||
        (c.companies?.name.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        (c.relationship_owner?.toLowerCase().includes(q) ?? false)
      const matchCompany = !filterCompany || c.company_id === filterCompany
      const matchType    = !filterType    || c.contact_type === filterType
      const matchOwner   = !filterOwner   || c.relationship_owner === filterOwner
      return matchSearch && matchCompany && matchType && matchOwner
    })
  }, [contacts, search, filterCompany, filterType, filterOwner])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteContact(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const uniqueCompanies = companies.filter(co => contacts.some(c => c.company_id === co.id))
  const uniqueOwners = [...new Set(contacts.map(c => c.relationship_owner).filter(Boolean))] as string[]

  const hasFilters = !!(search || filterCompany || filterType || filterOwner)

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">

      {/* Top bar */}
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex-1">
          <h1 className="page-title">Contacts</h1>
          <p className="text-neutral-600 dark:text-neutral-500 text-sm mt-2">{contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}</p>
        </div>
        {canCreate.allowed ? (
          <Button onClick={() => { setEditContact(null); setShowForm(true) }}>
            <Plus size={15} className="mr-1.5" /> Add contact
          </Button>
        ) : (
          <Button disabled className="opacity-50 cursor-not-allowed">
            <Lock size={15} className="mr-1.5" /> Add contact
          </Button>
        )}
      </div>

      {/* Search and filters */}
      <div className="px-6 py-4 flex items-center gap-2 flex-wrap border-b border-neutral-200 dark:border-neutral-700">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, company…"
            className="field-input w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Contact type filter */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="py-2 px-3 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 cursor-pointer">
          <option value="">All types</option>
          {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Company filter */}
        {uniqueCompanies.length > 0 && (
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="py-2 px-3 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 cursor-pointer">
            <option value="">All companies</option>
            {uniqueCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* Owner filter */}
        {uniqueOwners.length > 0 && (
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="py-2 px-3 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 cursor-pointer">
            <option value="">All owners</option>
            {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterCompany(''); setFilterType(''); setFilterOwner('') }}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              type="contacts"
              title={hasFilters ? 'No contacts found' : 'No contacts yet'}
              description={hasFilters ? 'Try adjusting your filters.' : 'Start building your network by adding your first contact.'}
              action={
                !hasFilters && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus size={15} /> Add your first contact
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="text-left text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest px-5 py-3">Name</th>
                  <th className="text-left text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest px-5 py-3 hidden md:table-cell">Position / Title</th>
                  <th className="text-left text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest px-5 py-3 hidden md:table-cell">Company</th>
                  <th className="text-left text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest px-5 py-3 hidden lg:table-cell">Email</th>
                  <th className="text-left text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest px-5 py-3 hidden xl:table-cell">Directors / Owner</th>
                  <th className="text-left text-xs font-bold text-neutral-700 dark:text-neutral-500 uppercase tracking-widest px-5 py-3 hidden xl:table-cell">Last Touch</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => setPanelContact(contact)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors duration-200"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(contact.name)}`}>
                          {initials(contact.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{contact.name}</p>
                          {contact.position && <p className="text-xs text-neutral-500">{contact.position}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {contact.position ? (
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{contact.position}</span>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {contact.companies ? (
                        <span className="text-sm text-neutral-700">{contact.companies.name}</span>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="text-sm text-neutral-700 hover:text-primary-500 transition-colors flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-300 flex-shrink-0" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <span className="text-sm text-neutral-600">{contact.relationship_owner ?? <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      {contact.last_interaction_date ? (
                        <span className="text-xs text-neutral-600 flex items-center gap-1">
                          <CalendarDays size={11} className="text-slate-300" />
                          {fmtDate(contact.last_interaction_date)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate.allowed && (
                          <button
                            onClick={() => { setEditContact(contact); setShowForm(true) }}
                            className="p-1.5 text-neutral-500 hover:text-primary-500 hover:bg-gold-50 rounded-lg transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete.allowed && (
                          <button
                            onClick={() => setDeleteTarget({ id: contact.id, name: contact.name })}
                            className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditContact(null) }} title={editContact ? 'Edit contact' : 'Add contact'}>
        <ContactForm
          contact={editContact ?? undefined}
          companies={companies}
          onClose={() => { setShowForm(false); setEditContact(null) }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete contact">
        <p className="text-sm text-neutral-700 mb-6">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1">Delete</Button>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Slide-over panel */}
      {panelContact && (
        <ContactPanel
          contact={panelContact}
          interactions={interactionsByContact[panelContact.id] ?? []}
          onClose={() => setPanelContact(null)}
          onEdit={c => { setPanelContact(null); setEditContact(c); setShowForm(true) }}
          onDelete={(id, name) => { setPanelContact(null); setDeleteTarget({ id, name }) }}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}
    </div>
  )
}
