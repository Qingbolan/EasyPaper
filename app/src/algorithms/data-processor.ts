/**
 * Data Processing Algorithm Module
 * Contains logic for processing, statistics, and analysis of papers and authors
 */

import type { Paper, AuthorStats, ExcelRow, AuthorMerge, AuthorWarning } from '@/store/paper-types'

/**
 * Parse delimited string into array
 * Supports multiple delimiters: comma, semicolon, newline, pipe
 */
export const parseDelimitedString = (str: string | null | undefined): string[] => {
  if (!str) return []
  // Try multiple delimiters: comma, semicolon, newline
  const delimiters = [',', ';', '\n', '|']
  for (const delimiter of delimiters) {
    if (str.includes(delimiter)) {
      return str
        .split(delimiter)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }
  }
  // If no delimiter found, return single element
  return str.trim() ? [str.trim()] : []
}

/**
 * Format author name
 * Convert "Lastname, Firstname" format to "Firstname Lastname"
 */
export const formatAuthorName = (name: string): string => {
  const trimmed = name.trim()

  // If contains comma, assume it's "Lastname, Firstname" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim())
    if (parts.length === 2 && parts[0] && parts[1]) {
      // Return "Firstname Lastname" format
      return `${parts[1]} ${parts[0]}`
    }
  }

  // Otherwise return original format
  return trimmed
}

/**
 * Parse author names list and handle corresponding author markers
 * @returns { names: formatted name array, correspondingIndices: corresponding author index array }
 */
export const parseAuthorNames = (str: string | null | undefined): {
  names: string[]
  correspondingIndices: number[]
} => {
  if (!str) return { names: [], correspondingIndices: [] }

  // Split authors by semicolon
  const rawNames = str.split(';').map(s => s.trim()).filter(s => s.length > 0)
  const names: string[] = []
  const correspondingIndices: number[] = []

  rawNames.forEach((rawName, index) => {
    // Check for corresponding author marker *
    const isCorresponding = rawName.includes('*')

    // Remove corresponding author marker
    const cleanName = rawName.replace(/\*/g, '').trim()

    // Format name
    const formattedName = formatAuthorName(cleanName)

    names.push(formattedName)

    if (isCorresponding) {
      correspondingIndices.push(index)
    }
  })

  return { names, correspondingIndices }
}

/**
 * Parse email list and handle corresponding author markers
 * @returns { emails: cleaned email array, correspondingIndices: corresponding author index array }
 */
export const parseAuthorEmails = (str: string | null | undefined): {
  emails: string[]
  correspondingIndices: number[]
} => {
  if (!str) return { emails: [], correspondingIndices: [] }

  // Split emails by semicolon
  const rawEmails = str.split(';').map(s => s.trim()).filter(s => s.length > 0)
  const emails: string[] = []
  const correspondingIndices: number[] = []

  rawEmails.forEach((rawEmail, index) => {
    // Check for corresponding author marker *
    const isCorresponding = rawEmail.includes('*')

    // Remove corresponding author marker
    const cleanEmail = rawEmail.replace(/\*/g, '').trim()

    emails.push(cleanEmail)

    if (isCorresponding) {
      correspondingIndices.push(index)
    }
  })

  return { emails, correspondingIndices }
}

/**
 * Parse Authors column and extract organization information
 * Format: "Firstname Lastname (Organization)*; ..."
 * @returns { organizations: organization array, correspondingIndices: corresponding author index array }
 */
export const parseAuthorOrganizations = (str: string | null | undefined): {
  organizations: string[]
  correspondingIndices: number[]
} => {
  if (!str) return { organizations: [], correspondingIndices: [] }

  // Split by semicolon
  const rawAuthors = str.split(';').map(s => s.trim()).filter(s => s.length > 0)
  const organizations: string[] = []
  const correspondingIndices: number[] = []

  rawAuthors.forEach((rawAuthor, index) => {
    // Check for corresponding author marker *
    const isCorresponding = rawAuthor.includes('*')

    // Remove corresponding author marker
    const cleanAuthor = rawAuthor.replace(/\*/g, '').trim()

    // Extract organization from parentheses
    const orgMatch = cleanAuthor.match(/\(([^)]+)\)/)
    const organization = orgMatch ? orgMatch[1].trim() : ''

    organizations.push(organization)

    if (isCorresponding) {
      correspondingIndices.push(index)
    }
  })

  return { organizations, correspondingIndices }
}

/**
 * Calculate author statistics
 * Including paper count, paper ID list, warning flags, etc.
 */
export const calculateAuthorStats = (papers: Paper[]): Map<string, AuthorStats> => {
  const authorMap = new Map<string, AuthorStats>()

  // First collect all papers for each author
  papers.forEach(paper => {
    paper.authorEmails.forEach((email, index) => {
      const name = paper.authorNames[index] || 'Unknown'
      const organization = paper.authorOrganizations[index] || ''

      if (!authorMap.has(email)) {
        authorMap.set(email, {
          id: email,
          name,
          email,
          paperCount: 0,
          paperIds: [],
          organization,
          hasWarning: false,
          hasEmailConflict: false,
          hasPotentialDuplicate: false,
        })
      }

      const author = authorMap.get(email)!
      author.paperIds.push(paper.paperId)

      // Update organization info if current is empty but has new info
      if (!author.organization && organization) {
        author.organization = organization
      }
    })
  })

  // Sort paper IDs and calculate statistics
  authorMap.forEach(author => {
    author.paperIds.sort((a, b) => a - b) // Sort by paperId ascending
    author.paperCount = author.paperIds.length
    author.hasWarning = author.paperCount > 2 // Mark warning if more than 2 papers
  })

  // Detect email conflicts (one email with multiple different author names)
  const emailToNames = new Map<string, Set<string>>()
  papers.forEach(paper => {
    paper.authorEmails.forEach((email, index) => {
      const name = paper.authorNames[index]
      if (!emailToNames.has(email)) {
        emailToNames.set(email, new Set())
      }
      emailToNames.get(email)!.add(name)
    })
  })

  emailToNames.forEach((names, email) => {
    if (names.size > 1) {
      const author = authorMap.get(email)
      if (author) {
        author.hasEmailConflict = true
      }
    }
  })

  return authorMap
}

/**
 * Apply author merges and recalculate merged author statistics
 */
export const applyAuthorMerges = (
  authors: Map<string, AuthorStats>,
  merges: AuthorMerge[]
): Map<string, AuthorStats> => {
  const result = new Map(authors)

  merges.forEach(merge => {
    // Collect all merged authors
    const allEmails = [merge.primaryEmail, ...merge.mergedEmails]
    const allAuthors = allEmails
      .map(email => authors.get(email))
      .filter(a => a !== undefined) as AuthorStats[]

    if (allAuthors.length === 0) return

    // Merge all paper IDs and sort
    const mergedPaperIds = Array.from(
      new Set(allAuthors.flatMap(a => a.paperIds))
    ).sort((a, b) => a - b)

    // Use organization from first author with organization info
    const organization = allAuthors.find(a => a.organization)?.organization || ''

    // Create merged author (using primary)
    const mergedAuthor: AuthorStats = {
      id: merge.primaryEmail,
      name: merge.primaryName,
      email: merge.primaryEmail,
      organization,
      paperCount: mergedPaperIds.length,
      paperIds: mergedPaperIds,
      hasWarning: mergedPaperIds.length > 2,
      hasEmailConflict: false, // Should not have conflict after merge
      hasPotentialDuplicate: false,
    }

    // Remove all merged authors and add the merged author
    allEmails.forEach(email => result.delete(email))
    result.set(merge.primaryEmail, mergedAuthor)
  })

  return result
}

/**
 * Mark paper warning information
 * Mark warnings based on author's paper count and rank
 */
export const markPaperWarnings = (
  papers: Paper[],
  authors: Map<string, AuthorStats>,
  merges: AuthorMerge[] = []
): Paper[] => {
  // Create email -> merged email mapping
  const emailToMergedEmail = new Map<string, string>()
  merges.forEach(merge => {
    const allEmails = [merge.primaryEmail, ...merge.mergedEmails]
    allEmails.forEach(email => {
      emailToMergedEmail.set(email, merge.primaryEmail)
    })
  })

  return papers.map(paper => {
    const warningAuthors: AuthorWarning[] = []

    paper.authorEmails.forEach((email, index) => {
      // Get actual author email (might be merged)
      const actualEmail = emailToMergedEmail.get(email) || email
      const author = authors.get(actualEmail)
      if (!author) return

      if (author.hasWarning) {
        // Find this paper's rank in author's paper list
        const paperRank = author.paperIds.indexOf(paper.paperId) + 1

        // Mark warning if rank > 2
        if (paperRank > 2) {
          warningAuthors.push({
            name: paper.authorNames[index],
            email,
            paperCount: author.paperCount,
            paperRank,
          })
        }
      }
    })

    return {
      ...paper,
      hasWarning: warningAuthors.length > 0,
      warningAuthors,
    }
  })
}

/**
 * Convert Excel row data to Paper object
 */
export const convertExcelRowToPaper = (row: ExcelRow): Paper => {
  // Parse author names and corresponding author markers
  const authorNamesResult = parseAuthorNames(row['Author Names'])
  const authorEmailsResult = parseAuthorEmails(row['Author Emails'])
  const authorOrgsResult = parseAuthorOrganizations(row['Authors'])

  // Merge corresponding author indices from three sources (deduplicate)
  const correspondingIndices = Array.from(
    new Set([
      ...authorNamesResult.correspondingIndices,
      ...authorEmailsResult.correspondingIndices,
      ...authorOrgsResult.correspondingIndices,
    ])
  ).sort((a, b) => a - b)

  return {
    paperId: row['Paper ID'],
    originalPaperId: row['Original Paper ID'] || '',
    title: row['Paper Title'] || '',
    abstract: row['Abstract'] || '',
    primaryContactAuthorName: row['Primary Contact Author Name'] || '',
    primaryContactAuthorEmail: row['Primary Contact Author Email'] || '',
    authorNames: authorNamesResult.names,
    authorEmails: authorEmailsResult.emails,
    authorOrganizations: authorOrgsResult.organizations,
    correspondingAuthorIndices: correspondingIndices,
    trackName: row['Track Name'] || '',
    primarySubjectArea: row['Primary Subject Area'] || '',
    secondarySubjectAreas: parseDelimitedString(row['Secondary Subject Areas']),
    status: row['Status'] || '',
    created: row['Created'] || '',
    lastModified: row['Last Modified'] || '',

    // Review related
    conflicts: row['Conflicts'] || '',
    assigned: row['Assigned'] || '',
    completed: row['Completed'] || '',
    percentCompleted: row['% Completed'] || '',
    bids: row['Bids'] || '',
    discussion: row['Discussion'] || '',

    // Feedback and submission status
    requestedForAuthorFeedback: row['Requested For Author Feedback'] || '',
    authorFeedbackSubmitted: row['Author Feedback Submitted?'] || '',
    requestedForCameraReady: row['Requested For Camera Ready'] || '',
    cameraReadySubmitted: row['Camera Ready Submitted?'] || '',
    requestedForPresentation: row['Requested For Presentation'] || '',

    // File information
    files: row['Files'] || '',
    numberOfFiles: row['Number of Files'] || '',
    supplementaryFiles: row['Supplementary Files'] || '',
    numberOfSupplementaryFiles: row['Number of Supplementary Files'] || '',

    // Reviewer information
    reviewers: row['Reviewers'] || '',
    reviewerEmails: row['Reviewer Emails'] || '',
    metaReviewers: row['MetaReviewers'] || '',
    metaReviewerEmails: row['MetaReviewer Emails'] || '',
    seniorMetaReviewers: row['SeniorMetaReviewers'] || '',
    seniorMetaReviewerEmails: row['SeniorMetaReviewerEmails'] || '',

    // Review statistics
    reviewMinOverallRating: row['[Review] Min (Overall Rating)'] || '',
    reviewMaxOverallRating: row['[Review] Max (Overall Rating)'] || '',
    reviewAvgOverallRating: row['[Review] Avg (Overall Rating)'] || '',
    reviewSpreadOverallRating: row['[Review] Spread (Overall Rating)'] || '',

    // Chair notes
    chairNote: row['Chair Note (Reject reason)'] || '',

    hasWarning: false,
    warningAuthors: [],
  }
}

/**
 * Batch process Excel data, return paper list with statistics and author information
 */
export const processExcelData = (rows: ExcelRow[]): {
  papers: Paper[]
  authors: Map<string, AuthorStats>
} => {
  // Convert to Paper objects
  const papers: Paper[] = rows.map(convertExcelRowToPaper)

  // Calculate author statistics
  const authors = calculateAuthorStats(papers)

  // Mark paper warnings
  const papersWithWarnings = markPaperWarnings(papers, authors)

  return {
    papers: papersWithWarnings,
    authors,
  }
}
