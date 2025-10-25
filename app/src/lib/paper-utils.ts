/**
 * Paper and author utility functions
 */

import type { Paper, AuthorStats, AuthorWarning } from '@/store/paper-types'

/**
 * Get paper warning level
 */
export const getPaperWarningLevel = (paper: Paper): 'none' | 'warning' | 'critical' => {
  if (!paper.hasWarning) return 'none'

  // If multiple authors exceed quota, mark as critical
  if (paper.warningAuthors.length > 1) return 'critical'

  return 'warning'
}

/**
 * Get author warning level
 */
export const getAuthorWarningLevel = (author: AuthorStats): 'none' | 'warning' | 'critical' => {
  if (!author.hasWarning && !author.hasEmailConflict) return 'none'

  // Email conflict and papers exceed 2, mark as critical
  if (author.hasEmailConflict && author.hasWarning) return 'critical'

  if (author.hasWarning || author.hasEmailConflict) return 'warning'

  return 'none'
}

/**
 * Format author list display
 */
export const formatAuthorList = (
  authorNames: string[],
  authorEmails: string[],
  maxDisplay: number = 3
): string => {
  if (authorNames.length === 0) return 'No authors'

  if (authorNames.length <= maxDisplay) {
    return authorNames.join(', ')
  }

  const displayed = authorNames.slice(0, maxDisplay).join(', ')
  const remaining = authorNames.length - maxDisplay

  return `${displayed} +${remaining} more`
}

/**
 * Get paper warning message
 */
export const getPaperWarningMessage = (paper: Paper): string => {
  if (!paper.hasWarning) return ''

  const authors = paper.warningAuthors.map(a => a.name).join(', ')

  if (paper.warningAuthors.length === 1) {
    const author = paper.warningAuthors[0]
    return `Author "${author.name}" has ${author.paperCount} papers (this is paper #${author.paperRank})`
  }

  return `Multiple authors (${authors}) exceed the 2-paper quota`
}

/**
 * Get author warning message
 */
export const getAuthorWarningMessage = (author: AuthorStats): string => {
  const messages: string[] = []

  if (author.hasWarning) {
    messages.push(`${author.paperCount} papers submitted (quota exceeded)`)
  }

  if (author.hasEmailConflict) {
    messages.push(`Email associated with multiple author names`)
  }

  if (author.hasPotentialDuplicate) {
    messages.push(`Potential duplicate author`)
  }

  return messages.join(' • ')
}

/**
 * Search papers (title, abstract, authors)
 */
export const searchPapers = (papers: Paper[], query: string): Paper[] => {
  if (!query.trim()) return papers

  const lowerQuery = query.toLowerCase()

  return papers.filter(paper => {
    return (
      paper.title.toLowerCase().includes(lowerQuery) ||
      paper.abstract.toLowerCase().includes(lowerQuery) ||
      paper.authorNames.some(name => name.toLowerCase().includes(lowerQuery)) ||
      paper.authorEmails.some(email => email.toLowerCase().includes(lowerQuery)) ||
      paper.paperId.toString().includes(lowerQuery)
    )
  })
}

/**
 * Search authors
 */
export const searchAuthors = (authors: AuthorStats[], query: string): AuthorStats[] => {
  if (!query.trim()) return authors

  const lowerQuery = query.toLowerCase()

  return authors.filter(author => {
    return (
      author.name.toLowerCase().includes(lowerQuery) ||
      author.email.toLowerCase().includes(lowerQuery) ||
      author.organization?.toLowerCase().includes(lowerQuery)
    )
  })
}

/**
 * Filter papers
 */
export const filterPapers = (
  papers: Paper[],
  filters: {
    showWarningOnly?: boolean
    status?: string
    track?: string
  }
): Paper[] => {
  let filtered = [...papers]

  if (filters.showWarningOnly) {
    filtered = filtered.filter(p => p.hasWarning)
  }

  if (filters.status) {
    filtered = filtered.filter(p => p.status === filters.status)
  }

  if (filters.track) {
    filtered = filtered.filter(p => p.trackName === filters.track)
  }

  return filtered
}

/**
 * Filter authors
 */
export const filterAuthors = (
  authors: AuthorStats[],
  filters: {
    showWarningOnly?: boolean
    showEmailConflictOnly?: boolean
    showDuplicateNameOnly?: boolean
    showLinkedOnly?: boolean
    minPapers?: number
    duplicateNameEmails?: Set<string> // Email set of authors with duplicate names
    linkedEmails?: Set<string> // Email set of linked authors
  }
): AuthorStats[] => {
  let filtered = [...authors]

  if (filters.showWarningOnly) {
    filtered = filtered.filter(a => a.hasWarning)
  }

  if (filters.showEmailConflictOnly) {
    filtered = filtered.filter(a => a.hasEmailConflict)
  }

  if (filters.showDuplicateNameOnly && filters.duplicateNameEmails) {
    filtered = filtered.filter(a => filters.duplicateNameEmails!.has(a.email))
  }

  if (filters.showLinkedOnly && filters.linkedEmails) {
    filtered = filtered.filter(a => filters.linkedEmails!.has(a.email))
  }

  if (filters.minPapers) {
    filtered = filtered.filter(a => a.paperCount >= filters.minPapers)
  }

  return filtered
}

/**
 * Sort papers
 */
export const sortPapers = (
  papers: Paper[],
  sortBy: 'paperId' | 'title' | 'authorCount' | 'created' | 'warning',
  order: 'asc' | 'desc' = 'asc'
): Paper[] => {
  const sorted = [...papers].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'paperId':
        comparison = a.paperId - b.paperId
        break
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'authorCount':
        comparison = a.authorNames.length - b.authorNames.length
        break
      case 'created':
        comparison = new Date(a.created).getTime() - new Date(b.created).getTime()
        break
      case 'warning':
        // Papers with warnings come first
        comparison = (b.hasWarning ? 1 : 0) - (a.hasWarning ? 1 : 0)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Sort authors
 */
export const sortAuthors = (
  authors: AuthorStats[],
  sortBy: 'name' | 'email' | 'paperCount' | 'organization',
  order: 'asc' | 'desc' = 'asc'
): AuthorStats[] => {
  const sorted = [...authors].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'email':
        comparison = a.email.localeCompare(b.email)
        break
      case 'paperCount':
        comparison = a.paperCount - b.paperCount
        break
      case 'organization':
        const orgA = a.organization || ''
        const orgB = b.organization || ''
        comparison = orgA.localeCompare(orgB)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Export CSV data (for download)
 */
export const exportPapersToCSV = (papers: Paper[]): string => {
  const headers = [
    'Paper ID',
    'Title',
    'Authors',
    'Emails',
    'Organizations',
    'Corresponding Authors',
    'Has Warning',
    'Warning Authors',
    'Status',
    'Track',
  ]

  const rows = papers.map(paper => {
    // Mark corresponding authors
    const correspondingAuthors = paper.authorNames
      .filter((_, idx) => paper.correspondingAuthorIndices.includes(idx))
      .join('; ')

    return [
      paper.paperId,
      `"${paper.title.replace(/"/g, '""')}"`,
      `"${paper.authorNames.join('; ')}"`,
      `"${paper.authorEmails.join('; ')}"`,
      `"${paper.authorOrganizations.join('; ')}"`,
      `"${correspondingAuthors}"`,
      paper.hasWarning ? 'Yes' : 'No',
      `"${paper.warningAuthors.map(a => a.name).join('; ')}"`,
      paper.status,
      paper.trackName,
    ]
  })

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

/**
 * Export authors CSV data
 */
export const exportAuthorsToCSV = (authors: AuthorStats[]): string => {
  const headers = [
    'Name',
    'Email',
    'Paper Count',
    'Paper IDs',
    'Has Warning',
    'Has Email Conflict',
    'Organization',
  ]

  const rows = authors.map(author => [
    `"${author.name.replace(/"/g, '""')}"`,
    author.email,
    author.paperCount,
    `"${author.paperIds.join('; ')}"`,
    author.hasWarning ? 'Yes' : 'No',
    author.hasEmailConflict ? 'Yes' : 'No',
    `"${(author.organization || '').replace(/"/g, '""')}"`,
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}
