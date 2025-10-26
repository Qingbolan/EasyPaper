/**
 * Paper and author data models
 */

// Paper data model
export interface Paper {
  paperId: number
  originalPaperId: string
  title: string
  abstract: string
  primaryContactAuthorName: string
  primaryContactAuthorEmail: string
  authorNames: string[] // Author name list (formatted)
  authorEmails: string[] // Author email list
  authorOrganizations: string[] // Author organization list
  correspondingAuthorIndices: number[] // Index positions of corresponding authors
  trackName: string
  primarySubjectArea: string
  secondarySubjectAreas: string[]
  status: string
  created: string
  lastModified: string

  // Review related
  conflicts: string
  assigned: string
  completed: string
  percentCompleted: string
  bids: string
  discussion: string

  // Feedback and submission status
  requestedForAuthorFeedback: string
  authorFeedbackSubmitted: string
  requestedForCameraReady: string
  cameraReadySubmitted: string
  requestedForPresentation: string

  // File information
  files: string
  numberOfFiles: string
  supplementaryFiles: string
  numberOfSupplementaryFiles: string

  // Reviewer information
  reviewers: string
  reviewerEmails: string
  metaReviewers: string
  metaReviewerEmails: string
  seniorMetaReviewers: string
  seniorMetaReviewerEmails: string

  // Rating statistics
  reviewMinOverallRating: string
  reviewMaxOverallRating: string
  reviewAvgOverallRating: string
  reviewSpreadOverallRating: string

  // Chair notes
  chairNote: string

  // Computed fields
  hasWarning: boolean // Whether contains authors exceeding quota
  warningAuthors: AuthorWarning[] // Authors exceeding quota
}

// Author warning information
export interface AuthorWarning {
  name: string
  email: string
  paperCount: number // Total paper count for this author
  paperRank: number // Rank of this paper among author's papers (sorted by paperId)
}

// Author statistics information
export interface AuthorStats {
  id: string // Unique ID (email as key)
  name: string
  email: string
  paperCount: number
  paperIds: number[] // All paper IDs for this author (sorted by ID)
  organization?: string // Extracted from notes or other fields
  hasWarning: boolean // Whether exceeds quota (>2 papers)
  // Used to mark issues
  hasEmailConflict: boolean // Whether one email corresponds to multiple author names
  hasPotentialDuplicate: boolean // Whether potentially a duplicate author (manually marked)
}

// Email to author name mapping (for conflict detection)
export interface EmailAuthorMapping {
  email: string
  authorNames: Set<string> // All author names using this email
  hasConflict: boolean // Whether multiple different author names exist
}

// Author merge record (for manually marking authors as the same person)
export interface AuthorMerge {
  id: string
  primaryEmail: string // Primary email to use
  primaryName: string // Primary name to use
  mergedEmails: string[] // Other merged emails
  mergedNames: string[] // Other merged names
  note: string // Note/description
  createdAt: string
}

// Excel raw data row
export interface ExcelRow {
  'Paper ID': number
  'Original Paper ID': string
  'Created': string
  'Last Modified': string
  'Paper Title': string
  'Abstract': string
  'Primary Contact Author Name': string
  'Primary Contact Author Email': string
  'Authors': string // May be delimiter-separated string
  'Author Names': string // May be delimiter-separated string
  'Author Emails': string // May be delimiter-separated string
  'Track Name': string
  'Primary Subject Area': string
  'Secondary Subject Areas': string
  'Status': string
  [key: string]: any // Other fields
}

// Dataset
export interface Dataset {
  id: string // Unique ID
  label: string // Dataset label, e.g. "Research -> October 2025"
  fileName: string // Original file name
  importedAt: string // Import time
  papers: Paper[]
  authors: Map<string, AuthorStats>
}
