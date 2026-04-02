'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Copy } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/EmptyState'
import TemplateForm from '@/components/forms/TemplateForm'
import type { TaskTemplate } from '@/lib/types'

const CATEGORIES = [
  { value: 'diligence', label: 'Due Diligence' },
  { value: 'ic_prep', label: 'IC Preparation' },
  { value: 'legal_followup', label: 'Legal Follow-up' },
  { value: 'portfolio_followup', label: 'Portfolio Follow-up' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'internal', label: 'Internal' },
  { value: 'other', label: 'Other' },
]

interface Props {
  initialTemplates: TaskTemplate[]
}

export default function TaskTemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showForm, setShowForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleCreateTemplate = (template: TaskTemplate) => {
    setTemplates([template, ...templates])
    setShowForm(false)
  }

  const handleUpdateTemplate = (updated: TaskTemplate) => {
    setTemplates(templates.map(t => t.id === updated.id ? updated : t))
    setEditTemplate(undefined)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/task-templates/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch (err) {
      console.error('Error deleting template:', err)
    } finally {
      setDeleting(false)
    }
  }

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value
  }

  if (templates.length === 0 && !showForm && !editTemplate) {
    return (
      <div className="flex flex-col h-full">
        <div className="page-header border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="page-title">Task Templates</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Reusable templates for quick task creation</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> New template
          </Button>
        </div>

        {showForm ? (
          <TemplateForm onSuccess={handleCreateTemplate} onCancel={() => setShowForm(false)} />
        ) : (
          <EmptyState
            type="general"
            title="No templates yet"
            description="Create your first template to speed up task creation"
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus size={16} /> Create Template
              </Button>
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="page-title">Task Templates</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{templates.length} {templates.length === 1 ? 'template' : 'templates'}</p>
        </div>
        {!showForm && !editTemplate && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> New template
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-8">
        {/* Form */}
        {(showForm || editTemplate) && (
          <div className="card p-6 mb-8">
            <TemplateForm
              template={editTemplate}
              onSuccess={editTemplate ? handleUpdateTemplate : handleCreateTemplate}
              onCancel={() => {
                setShowForm(false)
                setEditTemplate(undefined)
              }}
            />
          </div>
        )}

        {/* Templates Grid */}
        {templates.length > 0 && !showForm && !editTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, idx) => (
              <div
                key={template.id}
                className="card p-6 flex flex-col hover:shadow-lg transition-all duration-200 group"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-2">{template.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold uppercase tracking-wider">
                      {getCategoryLabel(template.category)}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${template.is_public ? 'badge badge-primary' : 'badge badge-secondary'}`}>
                    {template.is_public ? 'Public' : 'Private'}
                  </span>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setEditTemplate(template)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(template)}
                    className="px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Template?">
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">"{deleteTarget.name}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
