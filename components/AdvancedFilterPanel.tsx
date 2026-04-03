'use client'

import { useState } from 'react'
import { X, Plus, Trash2, ChevronDown } from 'lucide-react'
import {
  FilterGroup,
  FilterCondition,
  createFilterCondition,
  createFilterGroup,
  addConditionToGroup,
  removeConditionFromGroup,
  getFieldsForEntity,
  FilterOperator,
} from '@/lib/filter-utils'

interface AdvancedFilterPanelProps {
  entityType: 'company' | 'contact' | 'investment'
  onApply: (filterGroup: FilterGroup) => void
  onClose: () => void
}

export function AdvancedFilterPanel({
  entityType,
  onApply,
  onClose,
}: AdvancedFilterPanelProps) {
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(createFilterGroup('and'))
  const fields = getFieldsForEntity(entityType)

  const handleAddCondition = () => {
    if (fields.length === 0) return
    const firstField = fields[0]
    const newCondition = createFilterCondition(
      firstField.id,
      firstField.operators[0]
    )
    setFilterGroup(addConditionToGroup(filterGroup, newCondition))
  }

  const handleRemoveCondition = (conditionId: string) => {
    setFilterGroup(removeConditionFromGroup(filterGroup, conditionId))
  }

  const handleConditionChange = (
    conditionId: string,
    field: keyof FilterCondition,
    value: any
  ) => {
    setFilterGroup({
      ...filterGroup,
      conditions: filterGroup.conditions.map((c) =>
        c.id === conditionId ? { ...c, [field]: value } : c
      ),
    })
  }

  const handleLogicChange = (logic: 'and' | 'or') => {
    setFilterGroup({ ...filterGroup, logic })
  }

  const handleApply = () => {
    onApply(filterGroup)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-start justify-end z-50">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 h-screen overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Advanced Filters
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
            >
              <X size={20} className="text-neutral-700 dark:text-neutral-500" />
            </button>
          </div>

          {/* Logic Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => handleLogicChange('and')}
              className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
                filterGroup.logic === 'and'
                  ? 'bg-amber-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
              }`}
            >
              Match All
            </button>
            <button
              onClick={() => handleLogicChange('or')}
              className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
                filterGroup.logic === 'or'
                  ? 'bg-amber-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
              }`}
            >
              Match Any
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Conditions */}
          {filterGroup.conditions.map((condition) => {
            const field = fields.find((f) => f.id === condition.field)
            return (
              <div
                key={condition.id}
                className="space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
              >
                {/* Field Select */}
                <select
                  value={condition.field}
                  onChange={(e) =>
                    handleConditionChange(condition.id, 'field', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Operator Select */}
                {field && (
                  <select
                    value={condition.operator}
                    onChange={(e) =>
                      handleConditionChange(
                        condition.id,
                        'operator',
                        e.target.value as FilterOperator
                      )
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                  >
                    {field.operators.map((op) => (
                      <option key={op} value={op}>
                        {operatorLabel(op)}
                      </option>
                    ))}
                  </select>
                )}

                {/* Value Input */}
                {field && field.type === 'select' && field.options ? (
                  <select
                    value={condition.value}
                    onChange={(e) =>
                      handleConditionChange(condition.id, 'value', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                  >
                    <option value="">Select value</option>
                    {field.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field?.type === 'number' ? (
                  <>
                    <input
                      type="number"
                      value={condition.value}
                      onChange={(e) =>
                        handleConditionChange(condition.id, 'value', e.target.value)
                      }
                      placeholder="Value"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                    />
                    {condition.operator === 'between' && (
                      <input
                        type="number"
                        value={condition.valueTo || ''}
                        onChange={(e) =>
                          handleConditionChange(condition.id, 'valueTo', e.target.value)
                        }
                        placeholder="To"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) =>
                      handleConditionChange(condition.id, 'value', e.target.value)
                    }
                    placeholder="Value"
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                  />
                )}

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveCondition(condition.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            )
          })}

          {/* Add Condition Button */}
          <button
            onClick={handleAddCondition}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-800 dark:text-neutral-300 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400 font-medium transition-colors"
          >
            <Plus size={18} />
            Add Filter
          </button>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 sticky bottom-0 space-y-3">
          <button
            onClick={handleApply}
            className="w-full px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium"
          >
            Apply Filters
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function operatorLabel(op: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    eq: 'Equals',
    neq: 'Not Equals',
    gt: 'Greater Than',
    lt: 'Less Than',
    gte: 'Greater or Equal',
    lte: 'Less or Equal',
    contains: 'Contains',
    in: 'In',
    between: 'Between',
  }
  return labels[op] || op
}
