import { useState, useCallback, useMemo } from 'react'
import { FilterGroup, applyFilters } from '@/lib/filter-utils'

/**
 * Hook to manage list filtering and sorting
 */
export function useListFilters<T extends Record<string, any>>(
  allData: T[]
) {
  const [filterGroup, setFilterGroup] = useState<FilterGroup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<{
    field: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const data = useMemo(() => {
    let result = allData

    if (filterGroup) {
      result = applyFilters(result, filterGroup)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
        return Object.values(item).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      })
    }

    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortBy.field]
        const bVal = b[sortBy.field]

        if (aVal === bVal) return 0
        if (sortBy.direction === 'asc') {
          return aVal < bVal ? -1 : 1
        } else {
          return aVal > bVal ? -1 : 1
        }
      })
    }

    return result
  }, [allData, filterGroup, searchQuery, sortBy])

  const applyFilter = useCallback((filters: FilterGroup | null) => {
    setFilterGroup(filters)
  }, [])

  const clearFilters = useCallback(() => {
    setFilterGroup(null)
    setSearchQuery('')
  }, [])

  const sort = useCallback(
    (field: string, direction?: 'asc' | 'desc') => {
      if (sortBy?.field === field) {
        // Toggle direction if sorting by same field
        setSortBy({
          field,
          direction: sortBy.direction === 'asc' ? 'desc' : 'asc',
        })
      } else {
        setSortBy({
          field,
          direction: direction || 'asc',
        })
      }
    },
    [sortBy]
  )

  return {
    data,
    count: data.length,
    filterGroup,
    searchQuery,
    sortBy,
    applyFilter,
    clearFilters,
    setSearchQuery,
    sort,
    // Utilities
    hasFilters: filterGroup !== null || searchQuery.trim() !== '',
  }
}
