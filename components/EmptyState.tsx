import { ReactNode } from 'react'
import { Box, Heart, BarChart3, Users, FileText, Settings } from 'lucide-react'

interface EmptyStateProps {
  type?: 'companies' | 'contacts' | 'pipeline' | 'documents' | 'kpis' | 'tasks' | 'general'
  title: string
  description: string
  action?: ReactNode
}

function getIcon(type: EmptyStateProps['type']) {
  switch (type) {
    case 'companies':
      return <Heart className="w-16 h-16" />
    case 'contacts':
      return <Users className="w-16 h-16" />
    case 'pipeline':
      return <Box className="w-16 h-16" />
    case 'documents':
      return <FileText className="w-16 h-16" />
    case 'kpis':
      return <BarChart3 className="w-16 h-16" />
    case 'tasks':
      return <Settings className="w-16 h-16" />
    default:
      return <Box className="w-16 h-16" />
  }
}

export default function EmptyState({
  type = 'general',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-slate-300 dark:text-neutral-700">
        {getIcon(type)}
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-neutral-700 dark:text-neutral-500 mb-6 max-w-sm">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
