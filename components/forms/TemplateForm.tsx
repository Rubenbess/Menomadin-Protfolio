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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Template Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Due Diligence"
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
          placeholder="What is this template for?"
          rows={2}
          className="field-input resize-none"
        />
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30 rounded-lg p-5 space-y-4 border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Task Details</p>

        <div>
          <label className="field-label">Task Title *</label>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="Task title from this template"
            className="field-input"
            required
          />
        </div>

        <div>
          <label className="field-label">Task Description</label>
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="Default task description"
            rows={3}
            className="field-input resize-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="w-4 h-4 accent-gold-500"
        />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Make public (share with team)
        </span>
      </label>

      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={saving || !name.trim() || !taskTitle.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 text-white rounded-lg text-sm font-semibold hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Save size={16} /> {saving ? 'Saving…' : template ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
        >
          <X size={16} /> Cancel
        </button>
      </div>
    </form>
  )
}
