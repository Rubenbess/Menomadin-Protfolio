import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BulkImportForm } from '@/components/BulkImportForm'
import { DocumentImportUpload } from '@/components/DocumentImportUpload'
import { importCompanies, importContacts } from '@/actions/bulk-import'
import {
  getCompanyHeaders,
  getContactHeaders,
} from '@/lib/bulk-import-utils'
import { Upload, FileText, Table2 } from 'lucide-react'

export const metadata = {
  title: 'Import | Portfolio',
  description: 'Import companies, contacts and documents',
}

export default function ImportPage() {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Import', href: '/import' },
  ]

  const companyHeaders = getCompanyHeaders()
  const contactHeaders = getContactHeaders()

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Upload className="text-amber-700 dark:text-amber-600" size={24} />
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Import
            </h1>
          </div>
          <p className="text-neutral-700 dark:text-neutral-500">
            Import companies and contacts from CSV or Excel, or upload PDF and Word documents to the vault
          </p>
        </div>
      </div>

      <Breadcrumbs items={breadcrumbs} />

      {/* ── Section 1: Structured data (companies / contacts) ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Table2 size={20} className="text-amber-600" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Import Structured Data
          </h2>
          <span className="text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5">
            CSV · Excel
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Companies */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Companies
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-1">
                Upload a CSV or Excel file with company information. Required: <strong>name</strong>.
                Optional: sector, stage, HQ, status, strategy, invested amount, current value, MOIC, ownership %.
              </p>
            </div>
            <BulkImportForm
              onImport={importCompanies}
              importType="companies"
              templateHeaders={companyHeaders}
            />
          </div>

          {/* Contacts */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Contacts
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-1">
                Upload a CSV or Excel file with contact information. Required: <strong>name</strong>.
                Optional: position, email, phone, company, contact type, relationship owner.
              </p>
            </div>
            <BulkImportForm
              onImport={importContacts}
              importType="contacts"
              templateHeaders={contactHeaders}
            />
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            File Format Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-neutral-600 dark:text-neutral-500">
            <ul className="list-disc list-inside space-y-1">
              <li>Accepted formats: CSV (.csv), Excel (.xlsx, .xls)</li>
              <li>First row must contain column headers</li>
              <li>One record per row</li>
              <li>Duplicate names are skipped</li>
            </ul>
            <ul className="list-disc list-inside space-y-1">
              <li>Numbers must not include commas or currency symbols</li>
              <li>Use the downloadable template as a starting point</li>
              <li>Verify data before importing</li>
              <li>Review any errors or warnings after upload</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section 2: Document upload ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-violet-600" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Upload Documents
          </h2>
          <span className="text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full px-2 py-0.5">
            PDF · Word · PowerPoint
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-500 -mt-2">
          Upload PDFs, Word documents, and presentations directly to your Document Vault.
          Files are stored securely and available from the Documents section.
        </p>
        <DocumentImportUpload />
      </section>
    </div>
  )
}
