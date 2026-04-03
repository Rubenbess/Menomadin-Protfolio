import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BulkImportForm } from '@/components/BulkImportForm'
import { importCompanies, importContacts } from '@/actions/bulk-import'
import {
  getCompanyHeaders,
  getContactHeaders,
} from '@/lib/bulk-import-utils'
import { Upload } from 'lucide-react'

export const metadata = {
  title: 'Bulk Import | Portfolio',
  description: 'Import companies and contacts from CSV files',
}

export default function ImportPage() {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Import', href: '/import' },
  ]

  const companyHeaders = getCompanyHeaders()
  const contactHeaders = getContactHeaders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Upload className="text-amber-700 dark:text-amber-600" size={24} />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Bulk Import
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Import companies and contacts from CSV files
          </p>
        </div>
      </div>

      <Breadcrumbs items={breadcrumbs} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Companies Import */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Import Companies
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Upload a CSV file with company information. Required: name.
              Optional: sector, stage, HQ, status, strategy, invested amount,
              current value, MOIC, ownership %.
            </p>
          </div>
          <BulkImportForm
            onImport={importCompanies}
            importType="companies"
            templateHeaders={companyHeaders}
          />
        </div>

        {/* Contacts Import */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Import Contacts
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Upload a CSV file with contact information. Required: name.
              Optional: position, email, phone, company, contact type,
              relationship owner.
            </p>
          </div>
          <BulkImportForm
            onImport={importContacts}
            importType="contacts"
            templateHeaders={contactHeaders}
          />
        </div>
      </div>

      {/* Import Guidelines */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Import Guidelines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600 dark:text-slate-400">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">
              General Rules
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>File must be in CSV format (.csv)</li>
              <li>First row should contain headers</li>
              <li>One record per row</li>
              <li>Duplicate names will be skipped</li>
              <li>Numbers should not include commas or currency symbols</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">
              Best Practices
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the provided templates</li>
              <li>Verify data before importing</li>
              <li>Start with a small test batch</li>
              <li>Review warnings and errors carefully</li>
              <li>Ensure email addresses are valid</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
