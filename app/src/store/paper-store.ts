import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Paper, AuthorStats, AuthorMerge, ExcelRow, Dataset } from './paper-types'
import { processExcelData, calculateAuthorStats, markPaperWarnings, applyAuthorMerges } from '@/algorithms'

/**
 * Paper and Author Data Management Store
 */
interface PaperStore {
  // Data
  datasets: Dataset[]
  currentDatasetId: string // "all" or specific dataset id
  papers: Paper[] // Papers from currently selected dataset (computed property)
  authors: Map<string, AuthorStats> // Authors from currently selected dataset (computed property)
  authorMerges: AuthorMerge[] // Manually marked author merge records

  // Loading state
  isLoading: boolean
  error: string | null

  // Dataset operations
  getDatasets: () => Dataset[]
  setCurrentDataset: (datasetId: string) => void
  deleteDataset: (datasetId: string) => void

  // Data import
  importExcelData: (rows: ExcelRow[], label: string, fileName: string) => string // Returns datasetId

  // Paper operations
  getPaperById: (paperId: number) => Paper | undefined
  getPapersWithWarning: () => Paper[]

  // Author operations
  getAuthorByEmail: (email: string) => AuthorStats | undefined
  getAuthorsWithWarning: () => AuthorStats[]
  getAuthorsWithEmailConflict: () => AuthorStats[]
  getAllAuthors: () => AuthorStats[]

  // Author merge operations
  mergeAuthors: (merge: Omit<AuthorMerge, 'id' | 'createdAt'>) => void
  unmergeAuthors: (mergeId: string) => void
  removeAuthorFromMerge: (mergeId: string, emailToRemove: string) => void
  updateAuthorMerge: (mergeId: string, updates: Partial<AuthorMerge>) => void

  // Update author information (manual correction)
  updateAuthorEmail: (oldEmail: string, newEmail: string) => void
  updateAuthorName: (email: string, newName: string) => void

  // Utility methods
  reset: () => void
}


/**
 * Merge papers and authors from multiple datasets (for "All" view)
 */
const mergeDatasets = (datasets: Dataset[]): { papers: Paper[], authors: Map<string, AuthorStats> } => {
  if (datasets.length === 0) {
    return { papers: [], authors: new Map() }
  }

  // Merge all papers
  const allPapers: Paper[] = []
  datasets.forEach(ds => {
    allPapers.push(...ds.papers)
  })

  // Recalculate author statistics (since they may span datasets)
  const authors = calculateAuthorStats(allPapers)

  // Re-mark warnings
  const papersWithWarnings = markPaperWarnings(allPapers, authors)

  return { papers: papersWithWarnings, authors }
}

/**
 * Create Paper Store
 */
export const usePaperStore = create<PaperStore>()(
  persist(
    (set, get) => ({
      // Initial state
      datasets: [],
      currentDatasetId: 'all',
      papers: [],
      authors: new Map(),
      authorMerges: [],
      isLoading: false,
      error: null,

      // Get all datasets
      getDatasets: () => {
        return get().datasets
      },

      // Switch current dataset
      setCurrentDataset: (datasetId: string) => {
        const { datasets, authorMerges } = get()

        if (datasetId === 'all') {
          // Merge all datasets
          let { papers, authors } = mergeDatasets(datasets)

          // Apply author merges
          authors = applyAuthorMerges(authors, authorMerges)

          // Re-mark paper warnings (considering merges)
          papers = markPaperWarnings(papers, authors, authorMerges)

          set({ currentDatasetId: 'all', papers, authors })
        } else {
          // Find specific dataset
          const dataset = datasets.find(ds => ds.id === datasetId)
          if (dataset) {
            let authors = dataset.authors
            let papers = dataset.papers

            // Apply author merges
            authors = applyAuthorMerges(authors, authorMerges)

            // Re-mark paper warnings (considering merges)
            papers = markPaperWarnings(papers, authors, authorMerges)

            set({
              currentDatasetId: datasetId,
              papers,
              authors,
            })
          }
        }
      },

      // Delete dataset
      deleteDataset: (datasetId: string) => {
        const { datasets, currentDatasetId } = get()
        const newDatasets = datasets.filter(ds => ds.id !== datasetId)
        set({ datasets: newDatasets })

        // If deleted dataset is current, switch to "all"
        if (currentDatasetId === datasetId) {
          get().setCurrentDataset('all')
        }
      },

      // Import Excel data
      importExcelData: (rows: ExcelRow[], label: string, fileName: string) => {
        try {
          set({ isLoading: true, error: null })

          // Process data using algorithm module
          const { papers: papersWithWarnings, authors } = processExcelData(rows)

          // Create new dataset
          const newDataset: Dataset = {
            id: `dataset-${Date.now()}`,
            label,
            fileName,
            importedAt: new Date().toISOString(),
            papers: papersWithWarnings,
            authors,
          }

          // Add to datasets
          const newDatasets = [...get().datasets, newDataset]
          set({ datasets: newDatasets, isLoading: false })

          // Auto switch to newly imported dataset
          get().setCurrentDataset(newDataset.id)

          return newDataset.id
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          })
          throw error
        }
      },

      // Get single paper
      getPaperById: (paperId: number) => {
        return get().papers.find(p => p.paperId === paperId)
      },

      // Get papers with warning
      getPapersWithWarning: () => {
        return get().papers.filter(p => p.hasWarning)
      },

      // Get author info
      getAuthorByEmail: (email: string) => {
        return get().authors.get(email)
      },

      // Get authors with warning
      getAuthorsWithWarning: () => {
        return Array.from(get().authors.values()).filter(a => a.hasWarning)
      },

      // Get authors with email conflict
      getAuthorsWithEmailConflict: () => {
        return Array.from(get().authors.values()).filter(a => a.hasEmailConflict)
      },

      // Get all authors
      getAllAuthors: () => {
        return Array.from(get().authors.values())
      },

      // Merge authors
      mergeAuthors: (merge) => {
        const newMerge: AuthorMerge = {
          ...merge,
          id: `merge-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }

        set({
          authorMerges: [...get().authorMerges, newMerge],
        })

        // Reset current dataset to apply merge
        const currentDatasetId = get().currentDatasetId
        get().setCurrentDataset(currentDatasetId)
      },

      // Unmerge authors
      unmergeAuthors: (mergeId: string) => {
        set({
          authorMerges: get().authorMerges.filter(m => m.id !== mergeId),
        })

        // Reset current dataset to remove merge effect
        const currentDatasetId = get().currentDatasetId
        get().setCurrentDataset(currentDatasetId)
      },

      // Remove single author from merge group
      removeAuthorFromMerge: (mergeId: string, emailToRemove: string) => {
        const merge = get().authorMerges.find(m => m.id === mergeId)
        if (!merge) return

        // If removing primary email
        if (merge.primaryEmail === emailToRemove) {
          // If no other authors, delete entire merge
          if (merge.mergedEmails.length === 0) {
            get().unmergeAuthors(mergeId)
            return
          }

          // Promote first merged as new primary
          const newPrimaryEmail = merge.mergedEmails[0]
          const newPrimaryName = merge.mergedNames[0]

          const updatedMerge = {
            ...merge,
            primaryEmail: newPrimaryEmail,
            primaryName: newPrimaryName,
            mergedEmails: merge.mergedEmails.slice(1),
            mergedNames: merge.mergedNames.slice(1),
          }

          set({
            authorMerges: get().authorMerges.map(m => m.id === mergeId ? updatedMerge : m),
          })
        } else {
          // Removing a merged email
          const index = merge.mergedEmails.indexOf(emailToRemove)
          if (index === -1) return

          // If only primary left after removal, delete entire merge
          if (merge.mergedEmails.length === 1) {
            get().unmergeAuthors(mergeId)
            return
          }

          const updatedMerge = {
            ...merge,
            mergedEmails: merge.mergedEmails.filter((_, i) => i !== index),
            mergedNames: merge.mergedNames.filter((_, i) => i !== index),
          }

          set({
            authorMerges: get().authorMerges.map(m => m.id === mergeId ? updatedMerge : m),
          })
        }

        // Reset current dataset to apply changes
        const currentDatasetId = get().currentDatasetId
        get().setCurrentDataset(currentDatasetId)
      },

      // Update merge record
      updateAuthorMerge: (mergeId: string, updates: Partial<AuthorMerge>) => {
        set({
          authorMerges: get().authorMerges.map(m =>
            m.id === mergeId ? { ...m, ...updates } : m
          ),
        })
      },

      // Update author email
      updateAuthorEmail: (oldEmail: string, newEmail: string) => {
        const author = get().authors.get(oldEmail)
        if (!author) return

        const authors = new Map(get().authors)
        authors.delete(oldEmail)
        authors.set(newEmail, { ...author, email: newEmail, id: newEmail })

        set({ authors })
      },

      // Update author name
      updateAuthorName: (email: string, newName: string) => {
        const author = get().authors.get(email)
        if (!author) return

        const authors = new Map(get().authors)
        authors.set(email, { ...author, name: newName })

        set({ authors })
      },

      // Reset
      reset: () => {
        set({
          datasets: [],
          currentDatasetId: 'all',
          papers: [],
          authors: new Map(),
          authorMerges: [],
          isLoading: false,
          error: null,
        })
      },
    }),
    {
      name: 'authcheck-paper-storage',
      storage: createJSONStorage(() => localStorage),
      // Map requires special serialization handling
      partialize: (state) => ({
        datasets: state.datasets.map(ds => ({
          ...ds,
          authors: Array.from(ds.authors.entries()),
        })),
        currentDatasetId: state.currentDatasetId,
        papers: state.papers,
        authors: Array.from(state.authors.entries()),
        authorMerges: state.authorMerges,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migrate old data format: if has papers but no datasets, create a default dataset
          // @ts-ignore
          if (state.papers && state.papers.length > 0 && (!state.datasets || state.datasets.length === 0)) {
            console.log('Migrating old data format to new dataset structure')
            // @ts-ignore
            const oldPapers = state.papers
            // @ts-ignore
            const oldAuthors = Array.isArray(state.authors) ? new Map(state.authors) : state.authors

            const migratedDataset = {
              id: `dataset-migrated-${Date.now()}`,
              label: 'Migrated Dataset',
              fileName: 'legacy-data.xlsx',
              importedAt: new Date().toISOString(),
              papers: oldPapers,
              authors: oldAuthors,
            }

            // @ts-ignore
            state.datasets = [migratedDataset]
            // @ts-ignore
            state.currentDatasetId = migratedDataset.id
            // @ts-ignore
            state.papers = oldPapers
            // @ts-ignore
            state.authors = oldAuthors
          }

          // Restore authors Map in datasets
          if (Array.isArray(state.datasets)) {
            // @ts-ignore
            state.datasets = state.datasets.map(ds => ({
              ...ds,
              authors: ds.authors instanceof Map ? ds.authors : new Map(ds.authors || []),
            }))
          } else {
            // @ts-ignore
            state.datasets = []
          }

          // Restore current authors Map
          if (Array.isArray(state.authors)) {
            // @ts-ignore
            state.authors = new Map(state.authors)
          } else if (!(state.authors instanceof Map)) {
            // @ts-ignore
            state.authors = new Map()
          }

          // Ensure papers is array
          // @ts-ignore
          if (!Array.isArray(state.papers)) {
            // @ts-ignore
            state.papers = []
          }

          // Ensure currentDatasetId exists
          // @ts-ignore
          if (!state.currentDatasetId) {
            // @ts-ignore
            state.currentDatasetId = 'all'
          }
        }
      },
    }
  )
)
