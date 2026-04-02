'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
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
  template?: TaskTemplate
  onSuccess: (template: TaskTemplate) => void
  onCancel: () => void
}

type CategoryType = typeof CATEGORIES[number]['value']

export default function TemplateForm({ template, onSuccess, onCancel }: Props) {
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [category, setCategory] = useState<CategoryType>(template?.category as CategoryType || 'other')
  const [taskTitle, setTaskTitle] = useState(template?.template_content?.title || '')
  const [taskDescription, setTaskDescription] = useState(template?.template_content?.description || '')
  const [isPublic, setIsPublic] = useState(template?.is_public ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !taskTitle.trim()) return

    try {
      setSaving(true)

      const templateData = {
        name,
        description,
        category,
        template_content: {
          title: taskTitle,
          description: taskDescription,
        },
        is_public: isPublic,
      }

      const url = template
        ? `/api/task-templates/${template.id}`
        : '/api/task-templates'

      const method = template ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })

      const result = await response.json()

      if (result.data) {
        onSuccess(result.data)
      }
    } catch (err) {
      console.error('Error saving template:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Template Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Due Diligence Checklist"
            className="field-input"
            required
          />
        </div>
        <div>
          <label className="field-label">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as CategoryType)} className="field-select">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description of this template"
          rows={2}
          className="field-input resize-none"
        />
      </div>

      <div className="bg-brand-50 dark:bg-brand-950/20 rounded-lg p-5 space-y-4 border border-brand-200 dark:border-brand-900">
        <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-widest">Task Template Content</p>

        <div>
          <label className="field-label">Task Title *</label>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="Task title for this template"
            className="field-input"
            required
          />
        </div>

        <div>
          <label className="field-label">Task Description</label>
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="Default description for tasks from this template"
            rows={3}
            className="field-input resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="isPublic" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Make public (visible to all team members)
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={saving || !name.trim() || !taskTitle.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <Save size={16} /> {saving ? 'Saving…' : template ? 'Update Template' : 'Create Template'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors duration-200"
        >
          <X size={16} /> Cancel
        </button>
      </div>
    </form>
  )
}
