/**
 * Algorithm Module Unified Exports
 *
 * This module integrates all algorithms related to Excel file processing and data analysis, including:
 * - Excel file parsing
 * - Data processing and transformation
 * - Author statistics and analysis
 * - Paper warning marking
 */

// Excel parsing related
export {
  parseExcelFile,
  isValidExcelFile,
  getExcelFileInfo,
  type ParseResult,
  type ParseOptions,
} from './excel-parser'

// Data processing related
export {
  parseDelimitedString,
  formatAuthorName,
  parseAuthorNames,
  parseAuthorEmails,
  parseAuthorOrganizations,
  calculateAuthorStats,
  applyAuthorMerges,
  markPaperWarnings,
  convertExcelRowToPaper,
  processExcelData,
} from './data-processor'

// Excel export related
export {
  exportPapersToExcel,
  exportAuthorsToExcel,
} from './excel-exporter'
