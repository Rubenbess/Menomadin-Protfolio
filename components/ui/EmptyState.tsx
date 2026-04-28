interface EmptyStateProps {
  message: string
  action?: React.ReactNode
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-neutral-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
