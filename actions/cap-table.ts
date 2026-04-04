'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  parseExcelFile,
  parseCSVFile,
  inferColumnMappings,
  normalizeCapTableRow,
  validateCapTable,
  detectWorkbookSheets,
} from './cap-table-parsing'
import type {
  CapTableEntry,
  CapTableImport,
  ParsedCapTableRow,
  CapTableParseResult,
} from '@/lib/types'

export async function createCapTableEntry(data: {
  company_id: string
  round_id: string | null
  shareholder_name: string
  ownership_percentage: number
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cap_table').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteCapTableEntry(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cap_table').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

/**
 * Upload and parse cap table file
 */
export async function uploadAndParseCapTableFile(
  companyId: string,
  fileBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<{ error: string | null; result?: CapTableParseResult }> {
  try {
    const supabase = await createServerSupabaseClient()

    // Determine file format
    const isExcel = ['xlsx', 'xls'].includes(fileType.split('/').pop()?.toLowerCase() || '')
    const isCSV = fileType.includes('csv') || fileName.toLowerCase().endsWith('.csv')

    if (!isExcel && !isCSV) {
      return { error: 'File must be Excel (.xlsx) or CSV (.csv)' }
    }

    // Parse file
    let headers: string[] = []
    let rows: Record<string, any>[] = []
    let allSheets: string[] = []
    let selectedSheet = ''

    if (isExcel) {
      try {
        const parsed = parseExcelFile(fileBuffer)
        headers = parsed.headers
        rows = parsed.rows
        allSheets = parsed.allSheets
        selectedSheet = allSheets[0] || ''
      } catch (err) {
        return { error: `Excel parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
      }
    } else {
      const parsed = await parseCSVFile(fileBuffer)
      headers = parsed.headers
      rows = parsed.rows
      selectedSheet = fileName
    }

    if (rows.length === 0) {
      return { error: 'File contains no data rows' }
    }

    // Infer column mappings
    const columnMappings = inferColumnMappings(headers)

    // Normalize and validate each row
    const parsedRows: ParsedCapTableRow[] = rows.map((row, idx) => {
      const { normalized, errors, warnings } = normalizeCapTableRow(row, columnMappings)
      return {
        row_index: idx + 2, // +2 because row 1 is headers, array is 0-indexed
        raw_data: row,
        normalized_data: normalized,
        validation_errors: errors,
        validation_warnings: warnings,
        is_imported: false,
      }
    })

    // Validate cap table as a whole
    const existingCapTable = await supabase
      .from('cap_table')
      .select('*')
      .eq('company_id', companyId)

    const { globalErrors, globalWarnings } = validateCapTable(
      parsedRows,
      existingCapTable.data || []
    )

    // Create import record
    const importRecord = {
      company_id: companyId,
      file_name: fileName,
      file_size: fileBuffer.length,
      file_url: null,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id || null,
      uploaded_at: new Date().toISOString(),
      detected_sheet_names: allSheets,
      parsed_row_count: rows.length,
      imported_row_count: 0,
      import_status: 'parsed' as const,
      validation_summary: {
        errors: globalErrors,
        warnings: globalWarnings,
      },
    }

    const { data: importData, error: importError } = await supabase
      .from('cap_table_imports')
      .insert([importRecord])
      .select()
      .single()

    if (importError || !importData) {
      return { error: `Failed to create import record: ${importError?.message}` }
    }

    // Store parsed data temporarily
    const importDataRecords = parsedRows.map(row => ({
      import_snapshot_id: importData.id,
      row_index: row.row_index,
      raw_data: row.raw_data,
      normalized_data: row.normalized_data,
      validation_errors: row.validation_errors,
      validation_warnings: row.validation_warnings,
      is_imported: false,
    }))

    const { error: dataError } = await supabase
      .from('cap_table_import_data')
      .insert(importDataRecords)

    if (dataError) {
      return { error: `Failed to store parsed data: ${dataError.message}` }
    }

    return {
      error: null,
      result: {
        success: true,
        importId: importData.id,
        detectedSheets: allSheets,
        selectedSheet: selectedSheet,
        columnMappings: columnMappings,
        parsedRows: parsedRows,
        totalRows: rows.length,
        errors: globalErrors,
        warnings: globalWarnings,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Parsing failed: ${message}` }
  }
}

/**
 * Get import by ID with all parsed data
 */
export async function getCapTableImport(importId: string): Promise<{
  error: string | null
  import?: CapTableImport
  data?: ParsedCapTableRow[]
}> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: importData, error: importError } = await supabase
      .from('cap_table_imports')
      .select('*')
      .eq('id', importId)
      .single()

    if (importError || !importData) {
      return { error: 'Import not found' }
    }

    const { data: rows, error: rowError } = await supabase
      .from('cap_table_import_data')
      .select('*')
      .eq('import_snapshot_id', importId)
      .order('row_index', { ascending: true })

    if (rowError) {
      return { error: `Failed to fetch import data: ${rowError.message}` }
    }

    return {
      error: null,
      import: importData as CapTableImport,
      data: (rows || []) as ParsedCapTableRow[],
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Get import history for a company
 */
export async function getCapTableImportHistory(companyId: string): Promise<{
  error: string | null
  imports?: CapTableImport[]
}> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('cap_table_imports')
      .select('*')
      .eq('company_id', companyId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      return { error: error.message }
    }

    return { error: null, imports: (data || []) as CapTableImport[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Import parsed cap table data into the database
 */
export async function importParsedCapTable(
  importId: string,
  rowIndices: number[] = []
): Promise<{ error: string | null; importedCount?: number }> {
  try {
    const supabase = await createServerSupabaseClient()

    // Get import and data
    const { data: importData, error: importError } = await supabase
      .from('cap_table_imports')
      .select('*')
      .eq('id', importId)
      .single()

    if (importError || !importData) {
      return { error: 'Import not found' }
    }

    let query = supabase
      .from('cap_table_import_data')
      .select('*')
      .eq('import_snapshot_id', importId)

    if (rowIndices.length > 0) {
      query = query.in('row_index', rowIndices)
    }

    const { data: rows, error: rowError } = await query

    if (rowError || !rows) {
      return { error: 'Failed to fetch rows to import' }
    }

    // Filter out rows with errors
    const validRows = rows.filter(r => (r.validation_errors || []).length === 0)

    if (validRows.length === 0) {
      return { error: 'No valid rows to import (all have errors)' }
    }

    // Transform to cap table entries
    const entries = validRows.map(row => ({
      company_id: importData.company_id,
      round_id: null,
      shareholder_name: row.normalized_data?.shareholder_name,
      ownership_percentage: row.normalized_data?.ownership_percentage || 0,
      holder_type: row.normalized_data?.holder_type || null,
      security_type: row.normalized_data?.security_type || null,
      share_count: row.normalized_data?.share_count || null,
      investment_amount: row.normalized_data?.investment_amount || null,
      issue_date: row.normalized_data?.issue_date || null,
      conversion_ratio: row.normalized_data?.conversion_ratio || null,
      liquidation_preference: row.normalized_data?.liquidation_preference || null,
      notes: row.normalized_data?.notes || null,
      is_fully_diluted: false,
      import_snapshot_id: importId,
    }))

    const { error: insertError } = await supabase.from('cap_table').insert(entries)

    if (insertError) {
      return { error: `Failed to insert entries: ${insertError.message}` }
    }

    // Update import record
    const { error: updateError } = await supabase
      .from('cap_table_imports')
      .update({
        import_status: 'imported',
        imported_row_count: validRows.length,
        imported_at: new Date().toISOString(),
      })
      .eq('id', importId)

    if (updateError) {
      return { error: `Failed to update import: ${updateError.message}` }
    }

    // Mark rows as imported
    const { error: markError } = await supabase
      .from('cap_table_import_data')
      .update({ is_imported: true })
      .eq('import_snapshot_id', importId)
      .in(
        'row_index',
        validRows.map(r => r.row_index)
      )

    if (markError) {
      console.warn('Warning: Failed to mark rows as imported:', markError.message)
    }

    return { error: null, importedCount: validRows.length }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
