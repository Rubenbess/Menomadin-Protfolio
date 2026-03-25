'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, MapPin, User } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import CompanyForm from '@/components/forms/CompanyForm'
import { deleteCompany } from '@/actions/companies'
import type { Company, Contact } from '@/lib/types'

export default function CompaniesClient({
  companies,
  contacts,
  strategyLabel,
}: {
  companies: Company[]
  contacts: Contact[]
  strategyLabel: string | null
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteCompany(id)
    router.refresh()
  }

  function contactsFor(companyId: string) {
    return contacts.filter(c => c.company_id === companyId)
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          {strategyLabel && (
            <p className="text-sm text-slate-400 mt-0.5">{strategyLabel}</p>
          )}
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Company
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] px-5 py-20 text-center">
          <p className="text-sm text-slate-400 mb-5">No companies yet.</p>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add your first company
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((co) => {
            const coContacts = contactsFor(co.id)
            return (
              <div
                key={co.id}
                className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 flex flex-col gap-3 group hover:shadow-card-hover transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {co.logo_url && (
                        <img src={co.logo_url} alt={co.name} className="w-6 h-6 rounded-md object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                      )}
                      <Link
                        href={`/companies/${co.id}`}
                        className="text-base font-semibold text-slate-900 hover:text-violet-600 transition-colors truncate"
                      >
                        {co.name}
                      </Link>
                    </div>
                    {co.hq && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                        <MapPin size={11} />
                        {co.hq}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge value={co.strategy} type="strategy" />
                    <Badge value={co.status} />
                  </div>
                </div>

                {/* Sector */}
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{co.sector}</p>

                {/* Description */}
                {co.description && (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{co.description}</p>
                )}

                {/* Contacts */}
                {coContacts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {coContacts.map(contact => (
                      <div key={contact.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={11} className="text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-800">{contact.name}</span>
                          {contact.position && (
                            <span className="text-xs text-slate-400"> · {contact.position}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditCompany(co)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(co.id, co.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Company">
        <CompanyForm onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editCompany} onClose={() => setEditCompany(null)} title="Edit Company">
        {editCompany && (
          <CompanyForm
            company={editCompany}
            contacts={contactsFor(editCompany.id)}
            onClose={() => setEditCompany(null)}
          />
        )}
      </Modal>
    </div>
  )
}
