'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { logActivity } from './activities'
import {
  parseCSV,
  parseExcel,
  validateCompanyRow,
  validateContactRow,
  rowToCompanyData,
  rowToContactData,
  getCompanyHeaders,
  getContactHeaders,
  ImportResult,
  CompanyImportData,
  ContactImportData,
} from '@/lib/bulk-import-utils'

function isExcel(file: File) {
  return file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
}

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

    // Parse CSV or Excel
    const rows = isExcel(file) ? await parseExcel(file) : await parseCSV(file)
    if (rows.length === 0) {
      return {
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, field: 'file', message: 'File is empty' }],
        warnings: [],
      }
    }

    // Extract headers
    const headers = rows[0]
    const expectedHeaders = getCompanyHeaders()
    const dataRows = rows.slice(1)

    const result: ImportResult = {
      success: true,
      total: dataRows.length,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: [],
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rowData = Object.fromEntries(
        headers.map((h, idx) => [h, dataRows[i][idx] || ''])
      ) as Record<string, string>

      // Validate
      const validation = validateCompanyRow(rowData, i + 2)
      if (!validation.valid) {
        result.failed++
        result.errors.push(...validation.errors)
        continue
      }

      result.warnings.push(...validation.warnings)

      // Check for duplicates
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('name', rowData['name'])
        .single()

      if (existing) {
        result.warnings.push({
          row: i + 2,
          field: 'name',
          message: `Company "${rowData['name']}" already exists (skipped)`,
        })
        continue
      }

      // Convert to company data
      const companyData = rowToCompanyData(rowData)

      // Insert
      const { error } = await supabase.from('companies').insert({
        name: companyData.name,
        sector: companyData.sector || null,
        entry_stage: companyData.entry_stage || null,
        hq: companyData.hq || null,
        status: companyData.status || 'active',
        strategy: companyData.strategy || null,
        totalInvested: companyData.totalInvested || 0,
        currentValue: companyData.currentValue || 0,
        moic: companyData.moic || 1,
        ownershipPct: companyData.ownershipPct || 0,
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

        // Log activity
        await logActivity({
          entityType: 'company',
          entityId: rowData['name'],
          action: 'created',
          metadata: { importedFrom: 'bulk_import' },
        })
      }
    }

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

    // Parse CSV or Excel
    const rows = isExcel(file) ? await parseExcel(file) : await parseCSV(file)
    if (rows.length === 0) {
      return {
        success: false,
        total: 0,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, field: 'file', message: 'File is empty' }],
        warnings: [],
      }
    }

    // Extract headers
    const headers = rows[0]
    const expectedHeaders = getContactHeaders()
    const dataRows = rows.slice(1)

    const result: ImportResult = {
      success: true,
      total: dataRows.length,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: [],
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rowData = Object.fromEntries(
        headers.map((h, idx) => [h, dataRows[i][idx] || ''])
      ) as Record<string, string>

      // Validate
      const validation = validateContactRow(rowData, i + 2)
      if (!validation.valid) {
        result.failed++
        result.errors.push(...validation.errors)
        continue
      }

      result.warnings.push(...validation.warnings)

      // Check for duplicates
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', rowData['email'])
        .single()

      if (existing && rowData['email']) {
        result.warnings.push({
          row: i + 2,
          field: 'email',
          message: `Contact with email "${rowData['email']}" already exists (skipped)`,
        })
        continue
      }

      // Get company ID if needed
      let companyId: string | null = null
      if (rowData['company_name']) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('name', rowData['company_name'])
          .single()
        companyId = company?.id || null
      }

      // Convert to contact data
      const contactData = rowToContactData(rowData)

      // Insert
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

        // Log activity
        await logActivity({
          entityType: 'contact',
          entityId: rowData['name'],
          action: 'created',
          metadata: { importedFrom: 'bulk_import' },
        })
      }
    }

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
