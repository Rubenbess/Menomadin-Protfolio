'use client'

import Link from 'next/link'
import { BarChart3, Upload, Settings2, ArrowRight } from 'lucide-react'

export function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Analytics */}
      <Link
        href="/analytics"
        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 hover:shadow-md transition-all group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <BarChart3 size={20} className="text-white" />
          </div>
          <ArrowRight size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
          View Analytics
        </h3>
        <p className="text-sm text-neutral-700 dark:text-neutral-500">
          Portfolio metrics, charts, and performance analysis
        </p>
      </Link>

      {/* Bulk Import */}
      <Link
        href="/import"
        className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6 hover:shadow-md transition-all group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
            <Upload size={20} className="text-white" />
          </div>
          <ArrowRight size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
          Bulk Import
        </h3>
        <p className="text-sm text-neutral-700 dark:text-neutral-500">
          Import companies and contacts from CSV files
        </p>
      </Link>

      {/* Advanced Filtering */}
      <Link
        href="/companies"
        className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-800 p-6 hover:shadow-md transition-all group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center group-hover:bg-amber-600 transition-colors">
            <Settings2 size={20} className="text-white" />
          </div>
          <ArrowRight size={18} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
          Advanced Filters
        </h3>
        <p className="text-sm text-neutral-700 dark:text-neutral-500">
          Filter companies and contacts with advanced criteria
        </p>
      </Link>
    </div>
  )
}
