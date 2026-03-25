'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import CompanyForm from '@/components/forms/CompanyForm'
import { deleteCompany } from '@/actions/companies'
import type { Company } from '@/lib/types'

export default function CompaniesClient({
  companies,
  strategyLabel,
}: {
  companies: Company[]
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
          <Plus size={15} />
          Add Company
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
        {companies.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <p className="text-sm text-slate-400 mb-5">No companies yet.</p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={15} />
              Add your first company
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sector</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Strategy</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">HQ</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {companies.map((co) => (
                  <tr key={co.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/companies/${co.id}`}
                        className="font-semibold text-slate-900 hover:text-violet-600 transition-colors"
                      >
                        {co.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{co.sector}</td>
                    <td className="px-4 py-3.5">
                      <Badge value={co.strategy} type="strategy" />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge value={co.status} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">{co.hq || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditCompany(co)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(co.id, co.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Company">
        <CompanyForm onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editCompany} onClose={() => setEditCompany(null)} title="Edit Company">
        {editCompany && (
          <CompanyForm company={editCompany} onClose={() => setEditCompany(null)} />
        )}
      </Modal>
    </div>
  )
}
