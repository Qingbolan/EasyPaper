/**
 * Excel file parsing module
 * Responsible for reading and parsing Excel files, extracting dataset labels and data rows
 */

import * as XLSX from 'xlsx'
import type { ExcelRow } from '@/store/paper-types'

export interface ParseResult {
  label: string // Dataset label
  data: ExcelRow[] // Parsed data rows
  rowCount: number // Number of data rows
}

export interface ParseOptions {
  /**
   * Maximum number of rows to scan when searching for header row
   * @default 10
   */
  maxHeaderSearchRows?: number

  /**
   * Key column name that header must contain (for identifying header row)
   * @default "Paper ID"
   */
  headerKeyColumn?: string
}

/**
 * Parse Excel file
 *
 * @param file - File object to parse
 * @param options - Parse options
 * @returns Promise<ParseResult> - Parse result
 * @throws Error - If file is empty, header not found, or no valid data
 */
export const parseExcelFile = async (
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> => {
  const {
    maxHeaderSearchRows = 10,
    headerKeyColumn = 'Paper ID',
  } = options

  // Read file
  const buffer = await file.arrayBuffer()

  // Parse Excel
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to 2D array
  const arrayData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as any[][]

  if (arrayData.length === 0) {
    throw new Error('Excel file is empty or invalid')
  }

  // Find header row (contains key column name)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(maxHeaderSearchRows, arrayData.length); i++) {
    const row = arrayData[i]
    if (row.some((cell: any) => String(cell).includes(headerKeyColumn))) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Could not find header row (must contain "${headerKeyColumn}")`)
  }

  // Extract dataset label (if exists and is not header row)
  let label = 'Untitled Dataset'
  if (headerRowIndex > 0 && arrayData[0] && arrayData[0][0]) {
    // First row, first column as label
    label = String(arrayData[0][0]).trim()
  }

  // Extract header and data rows
  const headers = arrayData[headerRowIndex] as string[]
  const dataRows = arrayData.slice(headerRowIndex + 1)

  // Convert to object array
  const jsonData: ExcelRow[] = dataRows
    .map(row => {
      const obj: any = {}
      headers.forEach((header, index) => {
        if (header) {
          obj[header] = row[index]
        }
      })
      return obj
    })
    .filter(obj => Object.keys(obj).length > 0 && obj[headerKeyColumn]) // Filter empty rows and rows without key column

  if (jsonData.length === 0) {
    throw new Error('No valid data found in Excel file')
  }

  return {
    label,
    data: jsonData,
    rowCount: jsonData.length,
  }
}

/**
 * Validate Excel file format
 *
 * @param file - File to validate
 * @returns boolean - Whether it is a valid Excel file
 */
export const isValidExcelFile = (file: File): boolean => {
  return file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
}

/**
 * Read Excel file basic information (without full parsing)
 *
 * @param file - Excel file
 * @returns Promise<{ sheetNames: string[], estimatedRows: number }> - File information
 */
export const getExcelFileInfo = async (file: File): Promise<{
  sheetNames: string[]
  estimatedRows: number
}> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', sheetStubs: true })

  const sheetNames = workbook.SheetNames
  const firstSheet = workbook.Sheets[sheetNames[0]]

  // Get range information
  const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1')
  const estimatedRows = range.e.r - range.s.r + 1

  return {
    sheetNames,
    estimatedRows,
  }
}
