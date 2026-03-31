import { ReactNode, Suspense } from 'react'
import { TableSkeleton, CardGridSkeleton, Skeleton } from './Skeleton'

interface SuspenseWithSkeletonProps {
  children: ReactNode
  fallback: 'table' | 'cards' | 'text' | 'custom'
  customFallback?: ReactNode
  rows?: number
  columns?: number
  count?: number
}

export function SuspenseWithSkeleton({
  children,
  fallback,
  customFallback,
  rows = 5,
  columns = 5,
  count = 4,
}: SuspenseWithSkeletonProps) {
  let fallbackComponent: ReactNode

  switch (fallback) {
    case 'table':
      fallbackComponent = <TableSkeleton rows={rows} columns={columns} />
      break
    case 'cards':
      fallbackComponent = <CardGridSkeleton count={count} />
      break
    case 'text':
      fallbackComponent = (
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )
      break
    case 'custom':
      fallbackComponent = customFallback || <Skeleton className="h-64 w-full" />
      break
  }

  return (
    <Suspense fallback={fallbackComponent}>
      {children}
    </Suspense>
  )
}
