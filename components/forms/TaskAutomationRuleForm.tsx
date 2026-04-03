'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createAutomationRule } from '@/actions/task-automations'
import type { AutomationTrigger, AutomationAction } from '@/lib/types'

interface Props {
  onClose: () => void
  onRuleCreated: () => void
  templates: { id: string; name: string }[]
  teamMembers: { id: string; name: string }[]
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 dark:focus:border-gold-500 focus:bg-white dark:focus:bg-slate-700 transition-all'
const lbl = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'

const triggers: { value: AutomationTrigger; label: string }[] = [
  { value: 'deal_created', label: 'Deal created in pipeline' },
  { value: 'company_created', label: 'Company created' },
  { value: 'task_overdue', label: 'Task becomes overdue' },
  { value: 'task_completed', label: 'Task completed' },
]

const actions: { value: AutomationAction; label: string }[] = [
  { value: 'create_task', label: 'Create task from template' },
  { value: 'notify_team', label: 'Notify team' },
  { value: 'assign_to', label: 'Assign to user' },
]

export default function TaskAutomationRuleForm({
  onClose,
  onRuleCreated,
  templates,
  teamMembers,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [triggerType, setTriggerType] = useState<AutomationTrigger>('deal_created')
  const [actionType, setActionType] = useState<AutomationAction>('create_task')
  const [isActive, setIsActive] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const fd = new FormData(e.currentTarget)
      const name = (fd.get('name') as string).trim()

      if (!name) {
        setError('Rule name is required')
        setLoading(false)
        return
      }

      const config: Record<string, any> = {}

      if (actionType === 'create_task') {
        const templateId = fd.get('template_id') as string
        if (!templateId) {
          setError('Please select a template')
          setLoading(false)
          return
        }
        config.template_id = templateId
      } else if (actionType === 'assign_to') {
        const assigneeId = fd.get('assignee_id') as string
        if (!assigneeId) {
          setError('Please select a team member')
          setLoading(false)
          return
        }
        config.assignee_id = assigneeId
      } else if (actionType === 'notify_team') {
        config.channel = fd.get('notify_channel') || 'in_app'
      }

      const result = await createAutomationRule({
        name,
        trigger_type: triggerType,
        action_type: actionType,
        config,
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      setLoading(false)
      onRuleCreated()
      onClose()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Automation Rule</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className={lbl}>Rule Name *</label>
            <input
              name="name"
              required
              autoFocus
              className={inp}
              placeholder="e.g., Auto-create DD tasks for new deals"
            />
          </div>

          {/* Trigger Type */}
          <div className="space-y-1.5">
            <label className={lbl}>When this happens *</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTrigger)}
              className={inp}
            >
              {triggers.map((trigger) => (
                <option key={trigger.value} value={trigger.value}>
                  {trigger.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className={lbl}>Then do this *</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as AutomationAction)}
              className={inp}
            >
              {actions.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action-Specific Config */}
          {actionType === 'create_task' && (
            <div>
              <label className={lbl}>Select Template *</label>
              <select
                name="template_id"
                className={inp}
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'assign_to' && (
            <div>
              <label className={lbl}>Assign to Team Member *</label>
              <select
                name="assignee_id"
                className={inp}
              >
                <option value="">Choose a team member...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'notify_team' && (
            <div>
              <label className={lbl}>Notification Channel</label>
              <select
                name="notify_channel"
                defaultValue="in_app"
                className={inp}
              >
                <option value="in_app">In-app notification</option>
                <option value="email">Email</option>
                <option value="slack">Slack (when available)</option>
              </select>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300">
              Activate this rule immediately
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
