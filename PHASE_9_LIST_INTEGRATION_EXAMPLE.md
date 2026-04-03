# Phase 9: List Page Integration - Implementation Guide

## Overview
Phase 9 adds advanced filtering, searching, and sorting to existing list pages (Companies, Contacts, etc.).

## Components Created

### 1. **ListPageHeader** (`components/ListPageHeader.tsx`)
- Unified page header with title, description, count
- Integrated filter button and clear filters option
- Displays active filter count
- Shows filter panel on demand

### 2. **useListFilters** (`hooks/useListFilters.ts`)
- Manages filtering, searching, and sorting state
- Combines all filters into single data result
- Tracks filter state for UI feedback
- Easy to integrate into existing pages

## How to Integrate

### Step 1: Update a List Page (e.g., Companies)

**Before:**
```tsx
import { companies } from '@/data'

export default function CompaniesPage() {
  return (
    <div>
      <h1>Companies</h1>
      <table>
        {/* ... render companies ... */}
      </table>
    </div>
  )
}
```

**After:**
```tsx
'use client'

import { useState } from 'react'
import { useListFilters } from '@/hooks/useListFilters'
import { ListPageHeader } from '@/components/ListPageHeader'
import { FilterGroup } from '@/lib/filter-utils'

export default function CompaniesPage({ companies: initialCompanies }) {
  const { data, count, applyFilter, setSearchQuery, searchQuery } =
    useListFilters(initialCompanies)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFilterApply = (filterGroup: FilterGroup) => {
    applyFilter(filterGroup)
  }

  return (
    <div>
      <ListPageHeader
        title="Companies"
        description="Manage your portfolio companies"
        count={count}
        entityType="company"
        onFilterApply={handleFilterApply}
      >
        {/* Optional: Add search input */}
        <input
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
        />
      </ListPageHeader>

      {/* Render filtered data */}
      <div className="mt-6">
        {data.length === 0 ? (
          <p className="text-slate-500">No companies found</p>
        ) : (
          <table>
            {/* ... render data ... */}
          </table>
        )}
      </div>
    </div>
  )
}
```

### Step 2: Add Search Input

Add a search box in the ListPageHeader's children:

```tsx
<ListPageHeader
  title="Companies"
  count={count}
  entityType="company"
  onFilterApply={handleFilterApply}
>
  <input
    type="text"
    placeholder="Search companies..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
  />
</ListPageHeader>
```

### Step 3: Add Sorting (Optional)

```tsx
const { sort, sortBy } = useListFilters(data)

<button
  onClick={() => sort('name')}
  className={sortBy?.field === 'name' ? 'underline' : ''}
>
  Company Name
  {sortBy?.field === 'name' && (sortBy.direction === 'asc' ? ' ↑' : ' ↓')}
</button>
```

## Filter Configuration per Entity Type

### Companies
Available fields:
- `name` (text): Company name
- `sector` (select): Sector category
- `status` (select): Active, exited, closed
- `entry_stage` (select): Seed, Series A, B, C+, Growth
- `totalInvested` (number): Investment amount
- `moic` (number): Money multiple

### Contacts
Available fields:
- `name` (text): Contact name
- `email` (text): Email address
- `company_name` (text): Associated company
- `contact_type` (select): Founder, executive, investor, advisor, etc.

### Custom Filters
To add custom fields:

1. Update `lib/filter-utils.ts` `getFieldsForEntity()`:
```tsx
export function getFieldsForEntity(entityType: string) {
  if (entityType === 'company') {
    return [
      {
        id: 'customField',
        label: 'Custom Field',
        type: 'select',
        operators: ['eq', 'neq'],
        options: [{ id: 'val1', label: 'Value 1' }],
      },
      // ...
    ]
  }
}
```

2. Update data before passing to useListFilters:
```tsx
const companiesWithCustomFields = companies.map(c => ({
  ...c,
  customField: calculateCustomField(c),
}))
```

## Features

### Smart Search
- Searches all string fields in data
- Case-insensitive matching
- Works with filters (combined logic)

### Advanced Filters
- Multiple conditions with AND/OR logic
- Field-specific operators
- Between/range operators
- In/multi-select operators

### Sorting
- Click header to sort ascending
- Click again to toggle descending
- Visual indicator of current sort

### State Persistence (Optional)
To persist filters in URL:

```tsx
const router = useRouter()
const searchParams = useSearchParams()

useEffect(() => {
  const params = new URLSearchParams()
  if (filterGroup) params.set('filters', JSON.stringify(filterGroup))
  if (searchQuery) params.set('search', searchQuery)
  if (sortBy) params.set('sort', `${sortBy.field}_${sortBy.direction}`)
  
  router.push(`?${params.toString()}`)
}, [filterGroup, searchQuery, sortBy])
```

## Examples

### Filter Companies by Sector and Invested Amount

```tsx
const filterGroup = {
  id: 'group1',
  logic: 'and',
  conditions: [
    {
      id: 'cond1',
      field: 'sector',
      operator: 'eq',
      value: 'tech',
    },
    {
      id: 'cond2',
      field: 'totalInvested',
      operator: 'gte',
      value: 100000,
    },
  ],
}

applyFilter(filterGroup)
```

### Search + Filter Combined

```tsx
// User types "acme" in search
setSearchQuery('acme')

// User applies filters for sector=tech
applyFilter(techFilterGroup)

// Result: Companies with "acme" in any field AND sector=tech
```

## Performance Optimization

For large datasets (1000+ items):

1. **Debounce search**:
```tsx
import { debounce } from 'lodash'

const debouncedSearch = debounce(setSearchQuery, 300)
```

2. **Paginate results**:
```tsx
const ITEMS_PER_PAGE = 50
const [page, setPage] = useState(0)

const paginatedData = data.slice(
  page * ITEMS_PER_PAGE,
  (page + 1) * ITEMS_PER_PAGE
)
```

3. **Virtualize large lists**:
```tsx
import { FixedSizeList } from 'react-window'
// Use for 500+ items
```

## Testing Checklist

- [ ] Filter button opens panel
- [ ] Filter conditions apply correctly
- [ ] Clear filters resets state
- [ ] Search works across all fields
- [ ] AND/OR logic works as expected
- [ ] Sort toggles ascending/descending
- [ ] Pagination works if implemented
- [ ] Results update in real-time
- [ ] Mobile responsive
- [ ] Dark mode styling

## Common Issues

### Filters not applying
- Check FilterGroup structure matches schema
- Verify field names in data match filter field IDs
- Check applyFilters function logic

### Search not finding results
- Ensure data contains searchQuery text
- Check case sensitivity (search is case-insensitive)
- Verify string conversion for all field types

### Performance issues
- Debounce search input
- Paginate large lists
- Use React.memo for list items
- Check re-render triggers

## Future Enhancements

1. **Saved Filter Presets**: Save and recall common filters
2. **Export Filters**: Share filter configurations
3. **Smart Suggestions**: Auto-suggest filter combinations
4. **Filter History**: Show recent filters
5. **Bulk Actions**: Select multiple and perform actions
6. **Export Results**: Export filtered data to CSV/PDF
