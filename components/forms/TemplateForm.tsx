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

  const inp = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Due Diligence Checklist"
            className={inp}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as CategoryType)} className={inp}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description of this template"
          rows={2}
          className={`${inp} resize-none`}
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Task Template</p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Task Title *</label>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="Task title for this template"
            className={inp}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Task Description</label>
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="Default description for tasks from this template"
            rows={3}
            className={`${inp} resize-none`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="isPublic" className="text-sm text-slate-700">
          Make public (visible to all team members)
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving || !name.trim() || !taskTitle.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} /> {saving ? 'Saving…' : template ? 'Update Template' : 'Create Template'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-700 bg-slate-100 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
        >
          <X size={16} /> Cancel
        </button>
      </div>
    </form>
  )
}
