'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { AdvancedFilterPanel } from './AdvancedFilterPanel'
import { FilterGroup } from '@/lib/filter-utils'

interface ListPageHeaderProps {
  title: string
  description?: string
  count?: number
  entityType: 'company' | 'contact' | 'investment'
  onFilterApply?: (filterGroup: FilterGroup) => void
  showFilter?: boolean
  children?: React.ReactNode
}

export function ListPageHeader({
  title,
  description,
  count,
  entityType,
  onFilterApply,
  showFilter = true,
  children,
}: ListPageHeaderProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [activeFilters, setActiveFilters] = useState<FilterGroup | null>(null)

  const handleApplyFilters = (filterGroup: FilterGroup) => {
    setActiveFilters(filterGroup)
    setShowFilterPanel(false)
    onFilterApply?.(filterGroup)
  }

  const handleClearFilters = () => {
    setActiveFilters(null)
    onFilterApply?.(null as any)
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="text-neutral-700 dark:text-neutral-500 mt-1">
                {description}
              </p>
            )}
            {count !== undefined && (
              <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-2">
                {count} {count === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>

          {showFilter && (
            <div className="flex gap-2">
              {activeFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-medium transition-colors"
                  title="Clear all filters"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setShowFilterPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors"
              >
                <Filter size={16} />
                Filter
              </button>
            </div>
          )}
        </div>

        {/* Additional controls (search, sort, etc.) */}
        {children && <div className="flex gap-3">{children}</div>}
      </div>

      {/* Active Filters Display */}
      {activeFilters && activeFilters.conditions.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-medium">Filters applied:</span> {activeFilters.conditions.length} condition
            {activeFilters.conditions.length !== 1 ? 's' : ''} with{' '}
            <span className="font-medium">{activeFilters.logic.toUpperCase()}</span> logic
          </p>
        </div>
      )}

      {/* Filter Panel Modal */}
      {showFilterPanel && (
        <AdvancedFilterPanel
          entityType={entityType}
          onApply={handleApplyFilters}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
    </>
  )
}
