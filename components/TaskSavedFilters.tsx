'use client'

import { useState, useEffect } from 'react'
import { Save, Trash2, Star, Plus, Edit2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  getSavedFilters,
  deleteSavedFilter,
  setDefaultFilter,
  createSavedFilter,
} from '@/actions/task-filters'
import { useToast } from '@/hooks/useToast'

interface Filter {
  status?: string[]
  priority?: string[]
  company_id?: string
  search_query?: string
  include_completed?: boolean
}

interface Props {
  currentFilters: Filter
  onFilterApply: (filters: any) => void
  onFilterSelect?: (filterName: string) => void
}

export function TaskSavedFilters({ currentFilters, onFilterApply, onFilterSelect }: Props) {
  const [savedFilters, setSavedFilters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const [filterDescription, setFilterDescription] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { success, error: showError } = useToast()

  useEffect(() => {
    loadFilters()
  }, [])

  const loadFilters = async () => {
    setLoading(true)
    const result = await getSavedFilters()
    if (!result.error) {
      setSavedFilters(result.filters)
    }
    setLoading(false)
  }

  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filterName.trim()) {
      showError('Filter name is required')
      return
    }

    const result = await createSavedFilter(filterName.trim(), filterDescription.trim() || null, {
      ...currentFilters,
    })

    if (result.error) {
      showError(result.error)
    } else {
      success('Filter saved')
      setFilterName('')
      setFilterDescription('')
      setShowCreateForm(false)
      loadFilters()
    }
  }

  const handleDeleteFilter = async (filterId: string) => {
    if (!window.confirm('Delete this filter?')) return

    const result = await deleteSavedFilter(filterId)
    if (result.error) {
      showError(result.error)
    } else {
      success('Filter deleted')
      loadFilters()
    }
  }

  const handleSetDefault = async (filterId: string) => {
    const result = await setDefaultFilter(filterId)
    if (result.error) {
      showError(result.error)
    } else {
      success('Default filter set')
      loadFilters()
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-neutral-500">Loading filters...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Create Filter Form */}
      {showCreateForm ? (
        <form onSubmit={handleSaveFilter} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg space-y-2">
          <div>
            <input
              type="text"
              placeholder="Filter name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              autoFocus
            />
          </div>
          <div>
            <textarea
              placeholder="Description (optional)"
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
              className="w-full text-sm px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors flex items-center justify-center gap-1"
            >
              <Save size={14} /> Save Filter
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full px-3 py-2 text-xs font-medium border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 rounded hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Save Current Filter
        </button>
      )}

      {/* Saved Filters List */}
      {savedFilters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">Saved Filters</p>
          {savedFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => {
                onFilterApply(filter.filters)
                onFilterSelect?.(filter.name)
              }}
              className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-900 dark:text-white flex items-center gap-1">
                    {filter.is_default && <Star size={12} className="text-yellow-500 flex-shrink-0" />}
                    {filter.name}
                  </p>
                  {filter.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-600 mt-0.5 line-clamp-1">
                      {filter.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetDefault(filter.id)
                    }}
                    className="p-1 text-neutral-400 hover:text-yellow-500 rounded transition-colors"
                    title="Set as default"
                  >
                    <Star size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFilter(filter.id)
                    }}
                    className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                    title="Delete filter"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
