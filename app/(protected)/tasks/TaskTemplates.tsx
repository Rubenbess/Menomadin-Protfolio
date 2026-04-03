'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { deleteTaskTemplate } from '@/actions/task-templates'
import type { TaskTemplate } from '@/lib/types'

interface Props {
  templates: TaskTemplate[]
}

const CATEGORIES = [
  'diligence',
  'ic_prep',
  'legal_followup',
  'portfolio_followup',
  'fundraising',
  'internal',
  'other',
]

const CATEGORY_LABELS: Record<string, string> = {
  diligence: 'Due Diligence',
  ic_prep: 'IC Prep',
  legal_followup: 'Legal Follow-up',
  portfolio_followup: 'Portfolio Follow-up',
  fundraising: 'Fundraising',
  internal: 'Internal',
  other: 'Other',
}

export default function TaskTemplates({ templates }: Props) {
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('other')
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateTaskDesc, setTemplateTaskDesc] = useState('')
  const [templatePriority, setTemplatePriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [isDueDays, setIsDueDays] = useState('')

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await deleteTaskTemplate(id)
  }

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateDescription(template.description || '')
    setTemplateCategory(template.category)
    setTemplateTitle(template.template_content?.title || '')
    setTemplateTaskDesc(template.template_content?.description || '')
    setTemplatePriority(template.template_content?.priority || 'medium')
    setIsDueDays(template.template_content?.due_days || '')
  }

  if (templates.length === 0 && !showCreateTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Task Templates</h3>
          <Button onClick={() => setShowCreateTemplate(true)} size="sm">
            <Plus size={14} /> Create Template
          </Button>
        </div>
        <EmptyState
          message="Create templates to quickly spawn common task workflows"
          action={<Button onClick={() => setShowCreateTemplate(true)}>Create your first template</Button>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Task Templates</h3>
        <Button onClick={() => {
          setShowCreateTemplate(true)
          setEditingTemplate(null)
          setTemplateName('')
          setTemplateDescription('')
          setTemplateCategory('other')
          setTemplateTitle('')
          setTemplateTaskDesc('')
          setTemplatePriority('medium')
          setIsDueDays('')
        }} size="sm">
          <Plus size={14} /> Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <div key={template.id} className="p-4 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-gold-200 dark:hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-neutral-900 dark:text-white">{template.name}</h4>
                <p className="text-xs text-neutral-600 mt-1">{CATEGORY_LABELS[template.category] || template.category}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Edit template"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {template.description && (
              <p className="text-sm text-neutral-700 dark:text-neutral-500 line-clamp-2">{template.description}</p>
            )}
            <div className="mt-3 text-xs text-neutral-600 space-y-1">
              <p>• Title: {template.template_content?.title || '—'}</p>
              <p>• Priority: {template.template_content?.priority || '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showCreateTemplate || !!editingTemplate}
        onClose={() => {
          setShowCreateTemplate(false)
          setEditingTemplate(null)
        }}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Due Diligence Checklist"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
              Description
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Optional description of what this template is for"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
              Category *
            </label>
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Default Task Fields</h4>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="e.g., Conduct technical due diligence"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Priority
              </label>
              <select
                value={templatePriority}
                onChange={(e) => setTemplatePriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Due in (days)
              </label>
              <input
                type="number"
                value={isDueDays}
                onChange={(e) => setIsDueDays(e.target.value)}
                placeholder="e.g., 7"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateTemplate(false)
                setEditingTemplate(null)
              }}
            >
              Cancel
            </Button>
            <Button disabled>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
