'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Zap, Edit2, Trash2, Plus, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import TaskAutomationRuleForm from '@/components/forms/TaskAutomationRuleForm'
import { deleteAutomationRule, updateAutomationRule } from '@/actions/task-automations'
import { useToast } from '@/hooks/useToast'
import type { TaskAutomationRule } from '@/lib/types'

interface Props {
  automationRules: TaskAutomationRule[]
  templates: { id: string; name: string }[]
  teamMembers: { id: string; name: string }[]
}

const triggerLabels: Record<string, string> = {
  deal_created: 'Deal created',
  company_created: 'Company created',
  task_overdue: 'Task overdue',
  task_completed: 'Task completed',
}

const actionLabels: Record<string, string> = {
  create_task: 'Create task',
  notify_team: 'Notify team',
  assign_to: 'Assign to user',
}

// Memoized rule card component for performance
interface RuleCardProps {
  rule: TaskAutomationRule
  deleting: string | null
  onDelete: (ruleId: string) => void
  onToggleActive: (rule: TaskAutomationRule) => void
  onEdit: () => void
}

const RuleCard = memo(function RuleCard({
  rule,
  deleting,
  onDelete,
  onToggleActive,
  onEdit,
}: RuleCardProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-1 mb-3 sm:mb-2">
            <h3 className="font-medium text-neutral-900 dark:text-white break-words max-w-[200px]">
              {rule.name}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                rule.is_active
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-500'
              }`}
            >
              {rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
            <p className="break-words">
              <span className="font-medium">When:</span> {triggerLabels[rule.trigger_type]}
            </p>
            <p className="break-words">
              <span className="font-medium">Then:</span> {actionLabels[rule.action_type]}
              {rule.action_type === 'create_task' && rule.config.template_id && (
                <span> (Template: {rule.config.template_id})</span>
              )}
              {rule.action_type === 'assign_to' && rule.config.assignee_id && (
                <span> (User: {rule.config.assignee_id})</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:flex-col md:gap-1">
          <button
            onClick={() => onToggleActive(rule)}
            className="flex-1 md:flex-none md:w-full p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
            title={rule.is_active ? 'Disable rule' : 'Enable rule'}
          >
            <span className="text-xs">{rule.is_active ? '✓' : '✗'}</span>
          </button>
          <button
            onClick={onEdit}
            className="flex-1 md:flex-none md:w-full p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
            title="Edit rule"
          >
            <Edit2 size={16} className="mx-auto md:mx-0" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            disabled={deleting === rule.id}
            className="flex-1 md:flex-none md:w-full p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="Delete rule"
          >
            <Trash2 size={16} className="mx-auto md:mx-0" />
          </button>
        </div>
      </div>
    </div>
  )
})

export default function TaskAutomations({
  automationRules: initialRules,
  templates,
  teamMembers,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [rules, setRules] = useState(initialRules)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const handleDeleteRule = useCallback(async (ruleId: string) => {
    setDeleting(ruleId)
    try {
      const result = await deleteAutomationRule(ruleId)

      if (result.error) {
        showError(result.error)
        setDeleting(null)
        return
      }

      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      success('Rule deleted')
    } catch (err) {
      showError('Failed to delete rule')
    } finally {
      setDeleting(null)
    }
  }, [showError, success])

  const handleToggleActive = useCallback(async (rule: TaskAutomationRule) => {
    try {
      const result = await updateAutomationRule(rule.id, {
        is_active: !rule.is_active,
      })

      if (result.error) {
        showError(result.error)
        return
      }

      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, is_active: !rule.is_active } : r
        )
      )
      success(rule.is_active ? 'Rule disabled' : 'Rule enabled')
    } catch (err) {
      showError('Failed to update rule')
    }
  }, [showError, success])

  const handleRuleCreated = () => {
    setShowForm(false)
    success('Automation rule created')
    // Refresh rules from server in real implementation
    // For now, user can refresh the page
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Zap size={24} className="text-amber-600" />
            Automation Rules
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-1">
            Automatically create tasks, notify teams, or assign tasks when events occur
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="w-full md:w-auto"
        >
          <Plus size={16} />
          New Rule
        </Button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <Zap size={32} className="mx-auto text-slate-300 dark:text-neutral-700 mb-3" />
          <p className="text-neutral-700 dark:text-neutral-500">No automation rules yet</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-600 mt-1">
            Create your first rule to automate task management
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              deleting={deleting}
              onDelete={handleDeleteRule}
              onToggleActive={handleToggleActive}
              onEdit={() => showError('Edit not yet implemented')}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TaskAutomationRuleForm
          onClose={() => setShowForm(false)}
          onRuleCreated={handleRuleCreated}
          templates={templates}
          teamMembers={teamMembers}
        />
      )}
    </div>
  )
}
