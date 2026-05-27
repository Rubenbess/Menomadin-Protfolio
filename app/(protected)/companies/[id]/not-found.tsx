import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export default function CompanyNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Building2 size={28} className="text-neutral-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Company not found
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
          This company doesn&apos;t exist or may have been removed from the portfolio.
        </p>
      </div>
      <Link
        href="/companies"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to companies
      </Link>
    </div>
  )
}
