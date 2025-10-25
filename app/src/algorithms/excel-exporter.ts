/**
 * Excel Export Algorithm Module
 * Handle exporting Papers and Authors data to styled Excel files using ExcelJS
 */

import ExcelJS from 'exceljs'
import type { Paper, AuthorMerge, AuthorStats } from '@/store/paper-types'

/**
 * Export Papers to Excel with marking and styling
 * @param papers - Paper list
 * @param authorMerges - Author merge records
 * @param datasetLabel - Dataset label
 * @param filterInfo - Filter information
 * @returns ArrayBuffer of Excel file
 */
export const exportPapersToExcel = async (
  papers: Paper[],
  authorMerges: AuthorMerge[],
  datasetLabel: string = 'All Datasets',
  filterInfo: string = 'No filters applied'
): Promise<ArrayBuffer> => {
  // Create email to merge group mapping
  const emailToMergeGroup = new Map<string, AuthorMerge>()
  authorMerges.forEach(merge => {
    emailToMergeGroup.set(merge.primaryEmail, merge)
    merge.mergedEmails.forEach((email: string) => {
      emailToMergeGroup.set(email, merge)
    })
  })

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Papers')

  // First row: Dataset label and filter conditions
  const infoText = `Dataset: ${datasetLabel} | Filters: ${filterInfo}`
  worksheet.getRow(1).height = 30
  const infoCell = worksheet.getCell('A1')
  infoCell.value = infoText
  infoCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  infoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  }
  infoCell.alignment = { horizontal: 'left', vertical: 'middle' }

  // Second row: Empty
  worksheet.getRow(2).height = 10

  // Third row: Column headers
  const headers = [
    'Paper ID', 'Original Paper ID', 'Created', 'Last Modified',
    'Paper Title', 'Abstract',
    'Primary Contact Author Name', 'Primary Contact Author Email',
    'Authors', 'Author Names', 'Author Emails',
    'Track Name', 'Primary Subject Area', 'Secondary Subject Areas',
    'Conflicts', 'Assigned', 'Completed', '% Completed', 'Bids', 'Discussion',
    'Status',
    'Requested For Author Feedback', 'Author Feedback Submitted?',
    'Requested For Camera Ready', 'Camera Ready Submitted?', 'Requested For Presentation',
    'Files', 'Number of Files', 'Supplementary Files', 'Number of Supplementary Files',
    'Reviewers', 'Reviewer Emails', 'MetaReviewers', 'MetaReviewer Emails',
    'SeniorMetaReviewers', 'SeniorMetaReviewerEmails',
    'Chair Note (Reject reason)',
    '[Review] Min (Overall Rating)', '[Review] Max (Overall Rating)',
    '[Review] Avg (Overall Rating)', '[Review] Spread (Overall Rating)',
    'Organizations', 'Corresponding Authors',
    'Is Marked', 'Note', 'Addition'
  ]

  const headerRow = worksheet.getRow(3)
  headerRow.height = 25
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A5568' }
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Merge first row cells (span info across all columns)
  worksheet.mergeCells(1, 1, 1, headers.length)

  // Set column widths
  const columnWidths = [
    10,  // Paper ID
    20,  // Original Paper ID
    20,  // Created
    20,  // Last Modified
    50,  // Paper Title
    80,  // Abstract
    25,  // Primary Contact Author Name
    35,  // Primary Contact Author Email
    60,  // Authors
    40,  // Author Names
    50,  // Author Emails
    20,  // Track Name
    25,  // Primary Subject Area
    30,  // Secondary Subject Areas
    20,  // Conflicts
    15,  // Assigned
    15,  // Completed
    20,  // % Completed
    15,  // Bids
    30,  // Discussion
    15,  // Status
    30,  // Requested For Author Feedback
    30,  // Author Feedback Submitted?
    30,  // Requested For Camera Ready
    30,  // Camera Ready Submitted?
    30,  // Requested For Presentation
    50,  // Files
    20,  // Number of Files
    50,  // Supplementary Files
    30,  // Number of Supplementary Files
    40,  // Reviewers
    50,  // Reviewer Emails
    40,  // MetaReviewers
    50,  // MetaReviewer Emails
    40,  // SeniorMetaReviewers
    50,  // SeniorMetaReviewerEmails
    60,  // Chair Note
    25,  // [Review] Min
    25,  // [Review] Max
    25,  // [Review] Avg
    30,  // [Review] Spread
    40,  // Organizations
    30,  // Corresponding Authors
    12,  // Is Marked
    80,  // Note
    40,  // Addition
  ]

  columnWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width
  })

  // Add data rows
  papers.forEach((paper, paperIdx) => {
    const rowNum = paperIdx + 4 // Start from row 4
    const row = worksheet.getRow(rowNum)

    // Check if has warning
    const isMarked = paper.hasWarning

    // Generate note: list all warning authors and reasons
    let note = ''
    if (paper.warningAuthors && paper.warningAuthors.length > 0) {
      note = paper.warningAuthors
        .map(wa => `${wa.name} (${wa.email}): Over quota - ${wa.paperCount} papers, this is paper #${wa.paperRank}`)
        .join('; ')
    }

    // Check if has linked authors - build detailed addition info
    const linkedAuthorEmails = paper.authorEmails.filter(email => emailToMergeGroup.has(email))
    let addition = ''
    if (linkedAuthorEmails.length > 0) {
      const linkedAuthorsInfo = linkedAuthorEmails.map(email => {
        const merge = emailToMergeGroup.get(email)!
        const allEmails = [merge.primaryEmail, ...merge.mergedEmails]
        const authorName = paper.authorNames[paper.authorEmails.indexOf(email)]

        // Find all papers containing any of these linked emails
        const relatedPaperIds = new Set<number>()
        papers.forEach(p => {
          const hasLinkedAuthor = p.authorEmails.some(e => allEmails.includes(e))
          if (hasLinkedAuthor) {
            relatedPaperIds.add(p.paperId)
          }
        })

        // Convert to sorted array and format
        const paperIdList = Array.from(relatedPaperIds).sort((a, b) => a - b).join(', ')
        return `【(${paperIdList}) ${authorName}】`
      })
      addition = linkedAuthorsInfo.join('; ')
    }

    // Build corresponding authors
    const correspondingAuthors = paper.authorNames
      .filter((_, idx) => paper.correspondingAuthorIndices.includes(idx))
      .join('; ')

    // Prepare row data
    const rowData: any[] = [
      paper.paperId,
      paper.originalPaperId,
      paper.created,
      paper.lastModified,
      paper.title,
      paper.abstract,
      paper.primaryContactAuthorName,
      paper.primaryContactAuthorEmail,
      '', // Authors - will be set with rich text
      paper.authorNames.join('; '),
      paper.authorEmails.join('; '),
      paper.trackName,
      paper.primarySubjectArea,
      paper.secondarySubjectAreas.join('; '),
      paper.conflicts,
      paper.assigned,
      paper.completed,
      paper.percentCompleted,
      paper.bids,
      paper.discussion,
      paper.status,
      paper.requestedForAuthorFeedback,
      paper.authorFeedbackSubmitted,
      paper.requestedForCameraReady,
      paper.cameraReadySubmitted,
      paper.requestedForPresentation,
      paper.files,
      paper.numberOfFiles,
      paper.supplementaryFiles,
      paper.numberOfSupplementaryFiles,
      paper.reviewers,
      paper.reviewerEmails,
      paper.metaReviewers,
      paper.metaReviewerEmails,
      paper.seniorMetaReviewers,
      paper.seniorMetaReviewerEmails,
      paper.chairNote,
      paper.reviewMinOverallRating,
      paper.reviewMaxOverallRating,
      paper.reviewAvgOverallRating,
      paper.reviewSpreadOverallRating,
      paper.authorOrganizations.join('; '),
      correspondingAuthors,
      isMarked ? 'Yes' : 'No',
      note,
      addition,
    ]

    // Set row data
    // ExcelJS: row.values[0] corresponds to getCell(1), row.values[1] to getCell(2), etc.
    row.values = rowData

    // Build warning author emails set and map for quick lookup
    const warningAuthorMap = new Map<string, { paperRank: number }>()
    if (paper.warningAuthors) {
      paper.warningAuthors.forEach(wa => {
        warningAuthorMap.set(wa.email, { paperRank: wa.paperRank })
      })
    }

    // Build linked author emails set (authors in merge groups)
    const linkedAuthorEmailsSet = new Set(linkedAuthorEmails)

    // Special handling for Authors column (column 9) - use rich text
    const authorsCell = row.getCell(9)
    const richTextParts: ExcelJS.RichText[] = []

    paper.authorNames.forEach((name, idx) => {
      const isCorresponding = paper.correspondingAuthorIndices.includes(idx)
      const organization = paper.authorOrganizations[idx] || ''
      const authorWithOrg = organization ? `${name} (${organization})` : name
      const displayText = isCorresponding ? authorWithOrg + '*' : authorWithOrg
      const email = paper.authorEmails[idx]

      if (idx > 0) {
        richTextParts.push({ text: '; ' })
      }

      const warningInfo = warningAuthorMap.get(email)
      if (warningInfo && warningInfo.paperRank > 2) {
        // Warning author with paperRank > 2 - red bold text (highest priority)
        richTextParts.push({
          text: displayText,
          font: { color: { argb: 'FFDC2626' }, bold: true }
        })
      } else if (linkedAuthorEmailsSet.has(email) && !warningInfo) {
        // Linked author (not warning or paperRank <= 2) - purple text
        richTextParts.push({
          text: displayText,
          font: { color: { argb: 'FF9333EA' } }
        })
      } else {
        // Normal author - default text
        richTextParts.push({
          text: displayText
        })
      }
    })

    authorsCell.value = {
      richText: richTextParts
    }

    // Apply row styling
    if (isMarked) {
      // Warning records use rose pink background
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE4E8' }
        }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    } else {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    }

    // Special column styling
    headers.forEach((header, colIdx) => {
      const cell = row.getCell(colIdx + 1)

      if (header === 'Note' && note) {
        // Note column - orange text
        cell.font = { color: { argb: 'FFEA580C' } }
      } else if (header === 'Addition' && addition) {
        // Addition column - purple text
        cell.font = { color: { argb: 'FF9333EA' } }
      } else if (header === 'Is Marked') {
        // Is Marked column - Yes in red bold, No in green
        if (cell.value === 'Yes') {
          cell.font = { color: { argb: 'FFDC2626' }, bold: true }
        } else {
          cell.font = { color: { argb: 'FF16A34A' } }
        }
      }
    })

    // Calculate and set row height dynamically
    let maxLines = 1
    headers.forEach((header, colIdx) => {
      const cell = row.getCell(colIdx + 1)
      const content = cell.value ? String(cell.value) : ''
      const colWidth = columnWidths[colIdx] || 10

      const explicitLines = (content.match(/\n/g) || []).length + 1
      const charsPerLine = Math.max(1, Math.floor(colWidth * 0.9))
      const estimatedLines = Math.ceil(content.length / charsPerLine)
      const totalLines = Math.max(explicitLines, estimatedLines)

      maxLines = Math.max(maxLines, totalLines)
    })

    const calculatedHeight = maxLines * 15 + 6
    row.height = Math.max(20, Math.min(calculatedHeight, 300))
  })

  // Export as ArrayBuffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

/**
 * Export Authors to Excel with marking and styling
 * @param authors - Author list
 * @param authorMerges - Author merge records
 * @param papers - All papers (for getting organization info and paperRank)
 * @param datasetLabel - Dataset label
 * @param filterInfo - Filter information
 * @returns ArrayBuffer of Excel file
 */
export const exportAuthorsToExcel = async (
  authors: AuthorStats[],
  authorMerges: AuthorMerge[],
  papers: Paper[],
  datasetLabel: string = 'All Datasets',
  filterInfo: string = 'No filters applied'
): Promise<ArrayBuffer> => {
  // Create email to merge group mapping
  const emailToMergeGroup = new Map<string, AuthorMerge>()
  authorMerges.forEach(merge => {
    emailToMergeGroup.set(merge.primaryEmail, merge)
    merge.mergedEmails.forEach((email: string) => {
      emailToMergeGroup.set(email, merge)
    })
  })

  // Get author organization from papers
  const getAuthorOrganization = (email: string): string => {
    for (const paper of papers) {
      const idx = paper.authorEmails.indexOf(email)
      if (idx !== -1 && paper.authorOrganizations[idx]) {
        return paper.authorOrganizations[idx]
      }
    }
    return ''
  }

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Authors')

  // First row: Dataset label and filter conditions
  const infoText = `Dataset: ${datasetLabel} | Filters: ${filterInfo}`
  worksheet.getRow(1).height = 30
  const infoCell = worksheet.getCell('A1')
  infoCell.value = infoText
  infoCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  infoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  }
  infoCell.alignment = { horizontal: 'left', vertical: 'middle' }

  // Second row: Empty
  worksheet.getRow(2).height = 10

  // Third row: Column headers
  const headers = [
    'Name', 'Email', 'Paper Count', 'Paper IDs', 'Organization',
    'Has Email Conflict', 'Is Marked', 'Note', 'Addition'
  ]

  const headerRow = worksheet.getRow(3)
  headerRow.height = 25
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A5568' }
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Merge first row cells
  worksheet.mergeCells(1, 1, 1, headers.length)

  // Set column widths
  const columnWidths = [
    25,  // Name
    35,  // Email
    12,  // Paper Count
    30,  // Paper IDs
    40,  // Organization
    20,  // Has Email Conflict
    12,  // Is Marked
    60,  // Note
    50,  // Addition
  ]

  columnWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width
  })

  // Add data rows
  authors.forEach((author, authorIdx) => {
    const rowNum = authorIdx + 4 // Start from row 4
    const row = worksheet.getRow(rowNum)

    // Check if has warning
    const isMarked = author.hasWarning || emailToMergeGroup.has(author.email)

    // Generate note: warning info
    let note = ''
    if (author.hasWarning) {
      note = `Over quota - ${author.paperCount} papers (limit: 2)`
    }

    // Generate addition: linked info
    let addition = ''
    if (emailToMergeGroup.has(author.email)) {
      const merge = emailToMergeGroup.get(author.email)!
      const allEmails = [merge.primaryEmail, ...merge.mergedEmails]

      // Find all papers containing any of these linked emails
      const relatedPaperIds = new Set<number>()
      papers.forEach(p => {
        const hasLinkedAuthor = p.authorEmails.some(e => allEmails.includes(e))
        if (hasLinkedAuthor) {
          relatedPaperIds.add(p.paperId)
        }
      })

      // Convert to sorted array and format
      const paperIdList = Array.from(relatedPaperIds).sort((a, b) => a - b).join(', ')
      addition = `【(${paperIdList}) ${author.name}】`
    }

    const organization = getAuthorOrganization(author.email)

    // Prepare row data
    const rowData: any[] = [
      author.name,
      author.email,
      author.paperCount,
      '', // Paper IDs - will be set with rich text
      organization,
      author.hasEmailConflict ? 'Yes' : 'No',
      isMarked ? 'Yes' : 'No',
      note,
      addition,
    ]

    // Set row data
    // ExcelJS: row.values[0] corresponds to getCell(1), row.values[1] to getCell(2), etc.
    row.values = rowData

    // Special handling for Paper IDs column (column 4) - use rich text
    const paperIdsCell = row.getCell(4)

    if (author.hasWarning) {
      // Build rich text for paper IDs - only mark those with paperRank > 2 as red
      const richTextParts: ExcelJS.RichText[] = []

      // For each paper ID, find its paperRank
      author.paperIds.forEach((paperId, idx) => {
        if (idx > 0) {
          richTextParts.push({ text: ', ' })
        }

        // Find the paper
        const paper = papers.find(p => p.paperId === paperId)
        let paperRank = 0

        if (paper && paper.warningAuthors) {
          const warningInfo = paper.warningAuthors.find(wa => wa.email === author.email)
          if (warningInfo) {
            paperRank = warningInfo.paperRank
          }
        }

        // Only mark red if paperRank > 2
        if (paperRank > 2) {
          richTextParts.push({
            text: String(paperId),
            font: { color: { argb: 'FFDC2626' }, bold: true }
          })
        } else {
          richTextParts.push({
            text: String(paperId)
          })
        }
      })

      paperIdsCell.value = {
        richText: richTextParts
      }
    } else {
      // No warning - plain text
      paperIdsCell.value = author.paperIds.join(', ')
    }

    // Apply row styling
    if (author.hasWarning) {
      // Warning records use rose pink background
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE4E8' }
        }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    } else {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    }

    // Special column styling
    headers.forEach((header, colIdx) => {
      const cell = row.getCell(colIdx + 1)

      if (header === 'Note' && note) {
        // Note column - orange text
        cell.font = { color: { argb: 'FFEA580C' } }
      } else if (header === 'Addition' && addition) {
        // Addition column - purple text
        cell.font = { color: { argb: 'FF9333EA' } }
      } else if (header === 'Is Marked') {
        // Is Marked column - Yes in red bold, No in green
        if (cell.value === 'Yes') {
          cell.font = { color: { argb: 'FFDC2626' }, bold: true }
        } else {
          cell.font = { color: { argb: 'FF16A34A' } }
        }
      } else if (header === 'Has Email Conflict') {
        // Has Email Conflict column - Yes in red bold, No in green
        if (cell.value === 'Yes') {
          cell.font = { color: { argb: 'FFDC2626' }, bold: true }
        } else {
          cell.font = { color: { argb: 'FF16A34A' } }
        }
      }
    })

    // Calculate and set row height dynamically
    let maxLines = 1
    headers.forEach((header, colIdx) => {
      const cell = row.getCell(colIdx + 1)
      const content = cell.value ? String(cell.value) : ''
      const colWidth = columnWidths[colIdx] || 10

      const explicitLines = (content.match(/\n/g) || []).length + 1
      const charsPerLine = Math.max(1, Math.floor(colWidth * 0.9))
      const estimatedLines = Math.ceil(content.length / charsPerLine)
      const totalLines = Math.max(explicitLines, estimatedLines)

      maxLines = Math.max(maxLines, totalLines)
    })

    const calculatedHeight = maxLines * 15 + 6
    row.height = Math.max(20, Math.min(calculatedHeight, 200))
  })

  // Export as ArrayBuffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}
