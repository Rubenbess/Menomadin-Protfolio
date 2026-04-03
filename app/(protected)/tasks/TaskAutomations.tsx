'use client'

import { useState, useEffect } from 'react'
import { Zap, Edit2, Trash2, Plus } from 'lucide-react'
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

export default function TaskAutomations({
  automationRules: initialRules,
  templates,
  teamMembers,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [rules, setRules] = useState(initialRules)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const handleDeleteRule = async (ruleId: string) => {
    setDeleting(ruleId)
    const result = await deleteAutomationRule(ruleId)

    if (result.error) {
      showError(result.error)
      setDeleting(null)
      return
    }

    setRules(rules.filter((r) => r.id !== ruleId))
    success('Rule deleted')
    setDeleting(null)
  }

  const handleToggleActive = async (rule: TaskAutomationRule) => {
    const result = await updateAutomationRule(rule.id, {
      is_active: !rule.is_active,
    })

    if (result.error) {
      showError(result.error)
      return
    }

    setRules(
      rules.map((r) =>
        r.id === rule.id ? { ...r, is_active: !rule.is_active } : r
      )
    )
    success(rule.is_active ? 'Rule disabled' : 'Rule enabled')
  }

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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap size={24} className="text-amber-600" />
            Automation Rules
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Zap size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No automation rules yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Create your first rule to automate task management
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-1 mb-3 sm:mb-2">
                    <h3 className="font-medium text-slate-900 dark:text-white break-words max-w-[200px]">
                      {rule.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                        rule.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
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
                    onClick={() => handleToggleActive(rule)}
                    className="flex-1 md:flex-none md:w-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                  >
                    <span className="text-xs">{rule.is_active ? '✓' : '✗'}</span>
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement edit mode
                      showError('Edit not yet implemented')
                    }}
                    className="flex-1 md:flex-none md:w-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Edit rule"
                  >
                    <Edit2 size={16} className="mx-auto md:mx-0" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={deleting === rule.id}
                    className="flex-1 md:flex-none md:w-full p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Delete rule"
                  >
                    <Trash2 size={16} className="mx-auto md:mx-0" />
                  </button>
                </div>
              </div>
            </div>
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
