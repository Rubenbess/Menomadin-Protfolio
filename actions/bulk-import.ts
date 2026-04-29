'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { logActivity } from './activities'
import {
  parseCSV,
  validateCompanyRow,
  validateContactRow,
  rowToCompanyData,
  rowToContactData,
  ImportResult,
} from '@/lib/bulk-import-utils'

export async function importCompanies(
  formData: FormData
): Promise<ImportResult> {
  const file = formData.get('file') as File
  if (!file) {
    return {
      success: false,
      total: 0,
      imported: 0,
      failed: 0,
      errors: [{ row: 0, field: 'file', message: 'No file provided' }],
      warnings: [],
    }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, field: 'auth', message: 'Not authenticated' }],
        warnings: [],
      }
    }

    const rows = await parseCSV(file)
    if (rows.length === 0) {
      return {
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }],
        warnings: [],
      }
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    const result: ImportResult = {
      success: true,
      total: dataRows.length,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: [],
    }

    // Pre-fetch existing company names once so the per-row duplicate check is
    // O(1) instead of one Supabase round-trip per row (was an N+1 hot path).
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('name')
    const existingNames = new Set(
      (existingCompanies ?? []).map((c: { name: string }) => c.name.toLowerCase())
    )

    const importedNames: string[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const rowData = Object.fromEntries(
        headers.map((h, idx) => [h, dataRows[i][idx] || ''])
      ) as Record<string, string>

      const validation = validateCompanyRow(rowData, i + 2)
      if (!validation.valid) {
        result.failed++
        result.errors.push(...validation.errors)
        continue
      }

      result.warnings.push(...validation.warnings)

      const name = rowData['name']
      if (existingNames.has(name.toLowerCase())) {
        result.warnings.push({
          row: i + 2,
          field: 'name',
          message: `Company "${name}" already exists (skipped)`,
        })
        continue
      }

      const companyData = rowToCompanyData(rowData)

      // Only persist columns that actually exist on the `companies` table.
      // The previous implementation also wrote totalInvested/currentValue/moic/
      // ownershipPct, which are computed in the UI (CompanyWithMetrics) — they
      // are not real columns, so every insert was silently failing on the
      // Postgres "column does not exist" error and the import looked broken.
      const { error } = await supabase.from('companies').insert({
        name: companyData.name,
        sector: companyData.sector || null,
        entry_stage: companyData.entry_stage || null,
        hq: companyData.hq || null,
        status: companyData.status || 'active',
        strategy: companyData.strategy || null,
      })

      if (error) {
        result.failed++
        result.errors.push({
          row: i + 2,
          field: 'database',
          message: error.message,
        })
      } else {
        result.imported++
        existingNames.add(name.toLowerCase())
        importedNames.push(name)
      }
    }

    // Log activities once at the end rather than per-row (was N+1).
    await Promise.all(
      importedNames.map(name =>
        logActivity({
          entityType: 'company',
          entityId: name,
          action: 'created',
          metadata: { importedFrom: 'bulk_import' },
        })
      )
    )

    return result
  } catch (error) {
    return {
      success: false,
      total: 0,
      imported: 0,
      failed: 1,
      errors: [
        {
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
      warnings: [],
    }
  }
}

export async function importContacts(
  formData: FormData
): Promise<ImportResult> {
  const file = formData.get('file') as File
  if (!file) {
    return {
      success: false,
      total: 0,
      imported: 0,
      failed: 0,
      errors: [{ row: 0, field: 'file', message: 'No file provided' }],
      warnings: [],
    }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, field: 'auth', message: 'Not authenticated' }],
        warnings: [],
      }
    }

    const rows = await parseCSV(file)
    if (rows.length === 0) {
      return {
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }],
        warnings: [],
      }
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    const result: ImportResult = {
      success: true,
      total: dataRows.length,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: [],
    }

    // Pre-fetch lookup sets to remove the per-row N+1 round-trips.
    const [{ data: existingContacts }, { data: companiesByName }] = await Promise.all([
      supabase.from('contacts').select('email'),
      supabase.from('companies').select('id, name'),
    ])
    const existingEmails = new Set(
      (existingContacts ?? [])
        .map((c: { email: string | null }) => c.email?.toLowerCase())
        .filter(Boolean) as string[]
    )
    const companyIdByName = new Map<string, string>(
      (companiesByName ?? []).map((c: { id: string; name: string }) => [
        c.name.toLowerCase(),
        c.id,
      ])
    )

    const importedNames: string[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const rowData = Object.fromEntries(
        headers.map((h, idx) => [h, dataRows[i][idx] || ''])
      ) as Record<string, string>

      const validation = validateContactRow(rowData, i + 2)
      if (!validation.valid) {
        result.failed++
        result.errors.push(...validation.errors)
        continue
      }

      result.warnings.push(...validation.warnings)

      const email = rowData['email']?.toLowerCase()
      if (email && existingEmails.has(email)) {
        result.warnings.push({
          row: i + 2,
          field: 'email',
          message: `Contact with email "${rowData['email']}" already exists (skipped)`,
        })
        continue
      }

      const companyId = rowData['company_name']
        ? companyIdByName.get(rowData['company_name'].toLowerCase()) ?? null
        : null

      const contactData = rowToContactData(rowData)

      const { error } = await supabase.from('contacts').insert({
        name: contactData.name,
        position: contactData.position || null,
        email: contactData.email || null,
        phone: contactData.phone || null,
        company_id: companyId,
        contact_type: contactData.contact_type || 'other',
        relationship_owner: contactData.relationship_owner || null,
      })

      if (error) {
        result.failed++
        result.errors.push({
          row: i + 2,
          field: 'database',
          message: error.message,
        })
      } else {
        result.imported++
        if (email) existingEmails.add(email)
        importedNames.push(rowData['name'])
      }
    }

    await Promise.all(
      importedNames.map(name =>
        logActivity({
          entityType: 'contact',
          entityId: name,
          action: 'created',
          metadata: { importedFrom: 'bulk_import' },
        })
      )
    )

    return result
  } catch (error) {
    return {
      success: false,
      total: 0,
      imported: 0,
      failed: 1,
      errors: [
        {
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
      warnings: [],
    }
  }
}
