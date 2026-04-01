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
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleCreateTemplate = (template: TaskTemplate) => {
    setTemplates([template, ...templates])
    setShowForm(false)
  }

  const handleUpdateTemplate = (updated: TaskTemplate) => {
    setTemplates(templates.map(t => t.id === updated.id ? updated : t))
    setEditTemplate(null)
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Task Templates</h1>
            <p className="text-sm text-slate-500 mt-1">Create reusable task templates for common workflows</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create Template
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Templates</h1>
          <p className="text-sm text-slate-500 mt-1">{templates.length} {templates.length === 1 ? 'template' : 'templates'}</p>
        </div>
        {!showForm && !editTemplate && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create Template
          </Button>
        )}
      </div>

      {/* Form */}
      {(showForm || editTemplate) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <TemplateForm
            template={editTemplate}
            onSuccess={editTemplate ? handleUpdateTemplate : handleCreateTemplate}
            onCancel={() => {
              setShowForm(false)
              setEditTemplate(null)
            }}
          />
        </div>
      )}

      {/* Templates Grid */}
      {templates.length > 0 && !showForm && !editTemplate && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 line-clamp-2">{template.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {getCategoryLabel(template.category)}
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  {template.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              {template.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setEditTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(template)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Template?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete "{deleteTarget.name}"? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors font-medium"
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
