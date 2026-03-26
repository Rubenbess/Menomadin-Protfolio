'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, X, Pencil, Trash2, Mail, Phone, MapPin,
  Linkedin, Building2, ExternalLink, SlidersHorizontal,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ContactForm from '@/components/forms/ContactForm'
import { deleteContact } from '@/actions/contacts'
import type { ContactWithCompany } from '@/lib/types'

interface Props {
  contacts: ContactWithCompany[]
  companies: { id: string; name: string }[]
}

function avatarColor(name: string) {
  const colors = [
    'bg-violet-100 text-violet-700',
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

// ── Contact Panel (slide-over) ──────────────────────────────────────────────

function ContactPanel({
  contact,
  onClose,
  onEdit,
  onDelete,
}: {
  contact: ContactWithCompany
  onClose: () => void
  onEdit: (c: ContactWithCompany) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${avatarColor(contact.name)}`}>
              {initials(contact.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{contact.name}</h2>
              {contact.position && <p className="text-sm text-slate-500 mt-0.5">{contact.position}</p>}
              {contact.companies && (
                <p className="text-xs text-violet-600 font-medium mt-0.5 flex items-center gap-1">
                  <Building2 size={11} /> {contact.companies.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Contact info */}
          <div className="space-y-3">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-violet-50 hover:text-violet-700 transition-colors group"
              >
                <Mail size={15} className="text-slate-400 group-hover:text-violet-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 group-hover:text-violet-700 truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-violet-50 hover:text-violet-700 transition-colors group"
              >
                <Phone size={15} className="text-slate-400 group-hover:text-violet-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 group-hover:text-violet-700">{contact.phone}</span>
              </a>
            )}
            {contact.address && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{contact.address}</span>
              </div>
            )}
            {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-colors group"
              >
                <Linkedin size={15} className="text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 group-hover:text-blue-700 flex-1 truncate">LinkedIn Profile</span>
                <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
              </a>
            )}
          </div>

          {contact.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Added</p>
            <p className="text-sm text-slate-500">
              {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(contact) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            <Pencil size={14} /> Edit contact
          </button>
          <button
            onClick={() => { onClose(); onDelete(contact.id, contact.name) }}
            className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ContactsClient({ contacts, companies }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
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
        (c.phone?.includes(q) ?? false)
      const matchCompany = !filterCompany || c.company_id === filterCompany
      return matchSearch && matchCompany
    })
  }, [contacts, search, filterCompany])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteContact(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const uniqueCompanies = companies.filter(co =>
    contacts.some(c => c.company_id === co.id)
  )

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
          <p className="text-xs text-slate-400 mt-0.5">{contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} total</p>
        </div>
        <div className="flex-1 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, company…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Company filter */}
          {uniqueCompanies.length > 0 && (
            <div className="relative">
              <SlidersHorizontal size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 appearance-none cursor-pointer"
              >
                <option value="">All companies</option>
                {uniqueCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Button onClick={() => { setEditContact(null); setShowForm(true) }}>
          <Plus size={15} className="mr-1.5" /> Add contact
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Mail size={22} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search || filterCompany ? 'No contacts match your filters' : 'No contacts yet'}
            </p>
            {!search && !filterCompany && (
              <p className="text-xs text-slate-400 mt-1">Add your first contact to get started</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Company</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Email</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Phone</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Location</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => setPanelContact(contact)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(contact.name)}`}>
                          {initials(contact.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                          {contact.position && <p className="text-xs text-slate-400">{contact.position}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {contact.companies ? (
                        <span className="text-sm text-slate-600">{contact.companies.name}</span>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={e => e.stopPropagation()}
                          className="text-sm text-slate-600 hover:text-violet-600 transition-colors flex items-center gap-1.5"
                        >
                          <Mail size={12} className="text-slate-300 flex-shrink-0" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {contact.phone ? (
                        <span className="text-sm text-slate-600 flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-300 flex-shrink-0" />
                          {contact.phone}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      {contact.address ? (
                        <span className="text-sm text-slate-600 flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-300 flex-shrink-0" />
                          {contact.address}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditContact(contact); setShowForm(true) }}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: contact.id, name: contact.name })}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
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

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditContact(null) }}
        title={editContact ? 'Edit contact' : 'Add contact'}
      >
        <ContactForm
          contact={editContact ?? undefined}
          companies={companies}
          onClose={() => { setShowForm(false); setEditContact(null) }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete contact"
      >
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1">
            Delete
          </Button>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Slide-over panel */}
      {panelContact && (
        <ContactPanel
          contact={panelContact}
          onClose={() => setPanelContact(null)}
          onEdit={c => { setPanelContact(null); setEditContact(c); setShowForm(true) }}
          onDelete={(id, name) => { setPanelContact(null); setDeleteTarget({ id, name }) }}
        />
      )}
    </div>
  )
}
