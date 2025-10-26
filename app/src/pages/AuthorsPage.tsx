import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertTriangle,
  Users,
  Search,
  Mail,
  Download,
  X,
  Edit,
  CheckCircle2,
  Database,
  Link2,
  FolderOpen,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePaperStore } from '@/store/paper-store'
import {
  searchAuthors,
  filterAuthors,
  sortAuthors,
  exportAuthorsToCSV,
} from '@/lib/paper-utils'
import { exportAuthorsToExcel } from '@/algorithms'
import type { AuthorStats } from '@/store/paper-types'

export default function AuthorsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const getAllAuthors = usePaperStore(state => state.getAllAuthors)
  const getAuthorsWithWarning = usePaperStore(state => state.getAuthorsWithWarning)
  const getAuthorsWithEmailConflict = usePaperStore(state => state.getAuthorsWithEmailConflict)
  const updateAuthorEmail = usePaperStore(state => state.updateAuthorEmail)
  const updateAuthorName = usePaperStore(state => state.updateAuthorName)
  const mergeAuthors = usePaperStore(state => state.mergeAuthors)
  const unmergeAuthors = usePaperStore(state => state.unmergeAuthors)
  const removeAuthorFromMerge = usePaperStore(state => state.removeAuthorFromMerge)
  const authorMerges = usePaperStore(state => state.authorMerges)
  const datasets = usePaperStore(state => state.getDatasets())
  const currentDatasetId = usePaperStore(state => state.currentDatasetId)
  const setCurrentDataset = usePaperStore(state => state.setCurrentDataset)

  const authors = getAllAuthors()
  const papers = usePaperStore(state => state.papers)

  // Get author organization dynamically from papers
  const getAuthorOrganization = (email: string): string => {
    for (const paper of papers) {
      const index = paper.authorEmails.indexOf(email)
      if (index !== -1 && paper.authorOrganizations[index]) {
        return paper.authorOrganizations[index]
      }
    }
    return ''
  }

  // Convert organization name to initials/abbreviation
  const getOrganizationAbbreviation = (orgName: string): string => {
    if (!orgName) return 'N/A'

    // Split words and take only uppercase initials
    const words = orgName
      .trim()
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 0)
      .filter(word => {
        // Filter out common prepositions and articles
        const ignore = ['of', 'the', 'and', 'for', 'in', 'at', 'to', 'a', 'an']
        return !ignore.includes(word.toLowerCase())
      })

    // Take first letter of each word and convert to uppercase
    return words.map(word => word[0].toUpperCase()).join('')
  }

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [showWarningOnly, setShowWarningOnly] = useState(false)
  const [showEmailConflictOnly, setShowEmailConflictOnly] = useState(false)
  const [showDuplicateNameOnly, setShowDuplicateNameOnly] = useState(false)
  const [showLinkedOnly, setShowLinkedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'paperCount' | 'organization'>('paperCount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Edit dialog
  const [editingAuthor, setEditingAuthor] = useState<AuthorStats | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  // Link selection (multiple authors can be selected to link together)
  const [selectedAuthorsForLink, setSelectedAuthorsForLink] = useState<Set<string>>(new Set())

  // Unlink dialog
  const [unlinkingAuthor, setUnlinkingAuthor] = useState<AuthorStats | null>(null)
  const [selectedEmailToRemove, setSelectedEmailToRemove] = useState<string>('')

  // Export success dialog
  const [showExportSuccess, setShowExportSuccess] = useState(false)
  const [exportedFilePath, setExportedFilePath] = useState<string>('')

  // Helper functions for merge groups
  const getMergeGroupId = (email: string): string | null => {
    const merge = authorMerges.find(m =>
      m.primaryEmail === email || m.mergedEmails.includes(email)
    )
    return merge ? merge.id : null
  }

  const isAuthorLinked = (email: string): boolean => {
    return getMergeGroupId(email) !== null
  }

  const getMergeGroupEmails = (email: string): string[] => {
    const merge = authorMerges.find(m =>
      m.primaryEmail === email || m.mergedEmails.includes(email)
    )
    return merge ? [merge.primaryEmail, ...merge.mergedEmails] : [email]
  }

  // Calculate duplicate name authors (same name but different email)
  const duplicateNameEmails = useMemo(() => {
    const nameToEmails = new Map<string, string[]>()

    authors.forEach(author => {
      const normalizedName = author.name.trim().toLowerCase()
      if (!nameToEmails.has(normalizedName)) {
        nameToEmails.set(normalizedName, [])
      }
      nameToEmails.get(normalizedName)!.push(author.email)
    })

    // Find all authors with duplicate names
    const duplicateEmails = new Set<string>()
    nameToEmails.forEach((emails) => {
      if (emails.length > 1) {
        emails.forEach(email => duplicateEmails.add(email))
      }
    })

    return duplicateEmails
  }, [authors])

  // Calculate linked authors
  const linkedEmails = useMemo(() => {
    const linked = new Set<string>()
    authorMerges.forEach(merge => {
      linked.add(merge.primaryEmail)
      merge.mergedEmails.forEach(email => linked.add(email))
    })
    return linked
  }, [authorMerges])

  // If no datasets exist at all
  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('authors.noAuthorsLoaded')}</h2>
            <p className="text-muted-foreground max-w-md">
              {t('authors.pleaseImport')}
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/import')}>
            <Download className="h-5 w-5 mr-2" />
            {t('authors.importData')}
          </Button>
        </div>
      </div>
    )
  }

  // Calculate filtered author list
  const filteredAuthors = useMemo(() => {
    let result = authors

    // Search
    if (searchQuery) {
      result = searchAuthors(result, searchQuery)
    }

    // Filter
    result = filterAuthors(result, {
      showWarningOnly,
      showEmailConflictOnly,
      showDuplicateNameOnly,
      showLinkedOnly,
      duplicateNameEmails,
      linkedEmails,
    })

    // Sort
    result = sortAuthors(result, sortBy, sortOrder)

    // Group by merge - put authors in the same merge group together
    const processed = new Set<string>()
    const grouped: typeof result = []

    result.forEach(author => {
      if (processed.has(author.email)) return

      const groupEmails = getMergeGroupEmails(author.email)

      // Find all authors in this group that are in the result
      const groupAuthors = result.filter(a => groupEmails.includes(a.email))

      // Mark as processed
      groupAuthors.forEach(a => processed.add(a.email))

      // Add to result
      grouped.push(...groupAuthors)
    })

    return grouped
  }, [authors, searchQuery, showWarningOnly, showEmailConflictOnly, showDuplicateNameOnly, showLinkedOnly, duplicateNameEmails, linkedEmails, sortBy, sortOrder, authorMerges])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: authors.length,
      withWarning: getAuthorsWithWarning().length,
      withEmailConflict: getAuthorsWithEmailConflict().length,
      duplicateName: duplicateNameEmails.size,
      linked: linkedEmails.size,
      withinQuota: authors.filter(a => !a.hasWarning).length,
    }
  }, [authors, getAuthorsWithWarning, getAuthorsWithEmailConflict, duplicateNameEmails, linkedEmails])

  // Export to Excel
  const handleExport = async () => {
    try {
      // Get current dataset label
      let datasetLabel = 'All Datasets'
      if (currentDatasetId && currentDatasetId !== 'all') {
        const currentDataset = datasets.find(d => d.id === currentDatasetId)
        if (currentDataset) {
          datasetLabel = currentDataset.label
        }
      }

      // Build filter info string
      const filterParts: string[] = []
      if (showWarningOnly) {
        filterParts.push('Warning Only')
      }
      if (showEmailConflictOnly) {
        filterParts.push('Email Conflict Only')
      }
      if (showDuplicateNameOnly) {
        filterParts.push('Duplicate Name Only')
      }
      if (showLinkedOnly) {
        filterParts.push('Linked Only')
      }
      if (searchQuery) {
        filterParts.push(`Search: "${searchQuery}"`)
      }
      const filterInfo = filterParts.length > 0 ? filterParts.join(', ') : 'No filters applied'

      // Use the export function from algorithms
      const excelBuffer = await exportAuthorsToExcel(filteredAuthors, authorMerges, papers, datasetLabel, filterInfo)

      // Check if we're in Tauri environment
      const isTauri = '__TAURI__' in window

      if (isTauri) {
        // Tauri environment - use native save dialog
        const { save } = await import('@tauri-apps/plugin-dialog')
        const { writeFile } = await import('@tauri-apps/plugin-fs')

        const defaultFileName = `authors_export_${new Date().toISOString().split('T')[0]}.xlsx`
        const filePath = await save({
          defaultPath: defaultFileName,
          filters: [{
            name: 'Excel',
            extensions: ['xlsx']
          }]
        })

        if (!filePath) {
          // User canceled the save dialog
          return
        }

        // Write file using Tauri API
        await writeFile(filePath, new Uint8Array(excelBuffer))

        // Show success dialog
        setExportedFilePath(filePath)
        setShowExportSuccess(true)
      } else {
        // Browser environment - use blob download
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', `authors_export_${new Date().toISOString().split('T')[0]}.xlsx`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // Show success dialog (without file path for browser)
        setExportedFilePath('')
        setShowExportSuccess(true)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  // Handle showing file in explorer
  const handleShowInExplorer = async () => {
    try {
      // macOS: use 'open -R' to reveal file in Finder
      const { Command } = await import('@tauri-apps/plugin-shell')
      const command = Command.create('open', ['-R', exportedFilePath])
      await command.execute()
      setShowExportSuccess(false)
    } catch (error) {
      console.error('Failed to show file in explorer:', error)
    }
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // Open edit dialog
  const openEditDialog = (author: AuthorStats) => {
    setEditingAuthor(author)
    setEditName(author.name)
    setEditEmail(author.email)
  }

  // Save edit
  const handleSaveEdit = () => {
    if (!editingAuthor) return

    if (editEmail !== editingAuthor.email) {
      updateAuthorEmail(editingAuthor.email, editEmail)
    }
    if (editName !== editingAuthor.name) {
      updateAuthorName(editEmail, editName)
    }

    setEditingAuthor(null)
  }

  // Toggle author selection for linking
  const toggleAuthorForLink = (email: string) => {
    const newSelected = new Set(selectedAuthorsForLink)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedAuthorsForLink(newSelected)
  }

  // Clear link selection
  const clearLinkSelection = () => {
    setSelectedAuthorsForLink(new Set())
  }

  // Get author name abbreviation (first letter of first and last name)
  const getNameAbbreviation = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return 'N/A'
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    // First letter of first name + first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Link selected authors
  const handleLinkSelectedAuthors = () => {
    if (selectedAuthorsForLink.size < 2) {
      alert('Please select at least 2 authors to link')
      return
    }

    const selectedAuthorsList = Array.from(selectedAuthorsForLink)
      .map(email => authors.find(a => a.email === email))
      .filter(a => a !== undefined)

    // Select the first author as primary
    const primaryAuthor = selectedAuthorsList[0]!
    const mergedEmails = selectedAuthorsList.slice(1).map(a => a!.email)
    const mergedNames = selectedAuthorsList.slice(1).map(a => a!.name)

    // Call store's mergeAuthors method
    mergeAuthors({
      primaryEmail: primaryAuthor.email,
      primaryName: primaryAuthor.name,
      mergedEmails,
      mergedNames,
      note: `Linked ${selectedAuthorsList.length} authors together`,
    })

    clearLinkSelection()
  }

  // Open unlink dialog
  const openUnlinkDialog = (author: AuthorStats) => {
    setUnlinkingAuthor(author)
    setSelectedEmailToRemove(author.email) // Default to current author
  }

  // Handle remove single author from link
  const handleRemoveFromLink = () => {
    if (!unlinkingAuthor || !selectedEmailToRemove) return

    const mergeGroupId = getMergeGroupId(unlinkingAuthor.email)
    if (mergeGroupId) {
      removeAuthorFromMerge(mergeGroupId, selectedEmailToRemove)
    }

    setUnlinkingAuthor(null)
    setSelectedEmailToRemove('')
  }

  // Handle unlink all (dissolve the entire group)
  const handleUnlinkAll = () => {
    if (!unlinkingAuthor) return

    const mergeGroupId = getMergeGroupId(unlinkingAuthor.email)
    if (mergeGroupId) {
      unmergeAuthors(mergeGroupId)
    }

    setUnlinkingAuthor(null)
    setSelectedEmailToRemove('')
  }

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <PageHeader
        title={t('authors.title')}
        description={t('authors.description')}
      >
        {/* Dataset Selector */}
        {datasets.length > 0 && (
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <Select value={currentDatasetId} onValueChange={setCurrentDataset}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t('authors.selectDataset')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('authors.allDatasets')}</SelectItem>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('authors.totalAuthors')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('authors.overQuota')}</p>
              <p className="text-2xl font-bold text-warning">{stats.withWarning}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Mail className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('authors.emailConflicts')}</p>
              <p className="text-2xl font-bold text-destructive">{stats.withEmailConflict}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('authors.duplicateNames')}</p>
              <p className="text-2xl font-bold text-orange-500">{stats.duplicateName}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('authors.linked')}</p>
              <p className="text-2xl font-bold text-purple-500">{stats.linked}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('authors.withinQuota')}</p>
              <p className="text-2xl font-bold text-success">{stats.withinQuota}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <Card className="flex-1 p-6">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('authors.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('authors.export')}
            </Button>
          </div>
          <br/>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                id="warning-filter"
                checked={showWarningOnly}
                onCheckedChange={setShowWarningOnly}
              />
              <Label htmlFor="warning-filter">{t('authors.quotaViolations')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="email-conflict-filter"
                checked={showEmailConflictOnly}
                onCheckedChange={setShowEmailConflictOnly}
              />
              <Label htmlFor="email-conflict-filter">{t('authors.emailConflictsFilter')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="duplicate-name-filter"
                checked={showDuplicateNameOnly}
                onCheckedChange={setShowDuplicateNameOnly}
              />
              <Label htmlFor="duplicate-name-filter">{t('authors.duplicateNamesFilter')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="linked-filter"
                checked={showLinkedOnly}
                onCheckedChange={setShowLinkedOnly}
              />
              <Label htmlFor="linked-filter">{t('authors.linkedAuthors')}</Label>
            </div>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('authors.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t('authors.name')}</SelectItem>
                <SelectItem value="email">{t('authors.email')}</SelectItem>
                <SelectItem value="paperCount">{t('authors.paperCount')}</SelectItem>
                <SelectItem value="organization">{t('authors.organization')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={toggleSortOrder}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>

            {(showWarningOnly || showEmailConflictOnly || showDuplicateNameOnly || showLinkedOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowWarningOnly(false)
                  setShowEmailConflictOnly(false)
                  setShowDuplicateNameOnly(false)
                  setShowLinkedOnly(false)
                }}
              >
                <X className="h-4 w-4 mr-2" />
                {t('authors.clearFilters')}
              </Button>
            )}
            <div className="text-sm text-muted-foreground">
              {t('authors.showingCount')
                .replace('{count}', String(filteredAuthors.length))
                .replace('{total}', String(stats.total))}
            </div>
          </div>
        </Card>

        {/* Selected Authors for Linking */}
        <Card className="w-80 p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t('authors.selectedForLink')}</h3>
              {selectedAuthorsForLink.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLinkSelection}
                  className="h-6 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('authors.clear')}
                </Button>
              )}
            </div>

            {selectedAuthorsForLink.size === 0 ? (
              <div className="text-center py-4">
                <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('authors.clickToSelect')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedAuthorsForLink).map(email => {
                    const author = authors.find(a => a.email === email)
                    if (!author) return null
                    return (
                      <TooltipProvider key={email}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="cursor-pointer hover:bg-destructive/10"
                              onClick={() => toggleAuthorForLink(email)}
                            >
                              {getNameAbbreviation(author.name)}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">{author.name}</p>
                              <p className="text-xs text-muted-foreground">{author.email}</p>
                              <p className="text-xs">{author.paperCount} {t('authors.papers')}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>

                <Button
                  onClick={handleLinkSelectedAuthors}
                  disabled={selectedAuthorsForLink.size < 2}
                  className="w-full"
                  size="sm"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {t('authors.linkAuthors').replace('{count}', String(selectedAuthorsForLink.size))}
                </Button>

                {selectedAuthorsForLink.size === 1 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t('authors.selectOneMore')}
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Authors Table */}
      <Card className="!transition-none hover:!scale-100 hover:!shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('authors.name')}</TableHead>
                <TableHead>{t('authors.email')}</TableHead>
                <TableHead>{t('authors.organizationColumn')}</TableHead>
                <TableHead>{t('authors.papersColumn')}</TableHead>
                <TableHead>{t('authors.paperIds')}</TableHead>
                <TableHead>{t('authors.statusColumn')}</TableHead>
                <TableHead className="w-[100px]">{t('authors.actionsColumn')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuthors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('authors.noAuthorsMatch')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAuthors.map((author, idx) => {
                  const mergeGroupId = getMergeGroupId(author.email)
                  const isLinked = isAuthorLinked(author.email)
                  const groupEmails = getMergeGroupEmails(author.email)

                  // Check if this is the first member of a merge group
                  const isFirstInGroup = idx === 0 || getMergeGroupId(filteredAuthors[idx - 1].email) !== mergeGroupId
                  const isLastInGroup = idx === filteredAuthors.length - 1 || getMergeGroupId(filteredAuthors[idx + 1].email) !== mergeGroupId

                  // Add border and background color for linked author groups
                  let rowClassName = `transition-none ${
                    author.hasWarning || author.hasEmailConflict ? 'bg-warning/5' : ''
                  }`

                  if (isLinked && groupEmails.length > 1) {
                    // Add purple border and light purple background
                    rowClassName += ' border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                    if (isFirstInGroup) {
                      rowClassName += ' border-t-2 border-t-purple-400/50'
                    }
                    if (isLastInGroup) {
                      rowClassName += ' border-b-2 border-b-purple-400/50'
                    }
                  }

                  return (
                    <TableRow
                      key={author.id}
                      className={rowClassName}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{author.name}</span>
                          {isLinked && (() => {
                            // Get all linked author information
                            const mergeGroup = authorMerges.find(m =>
                              m.primaryEmail === author.email || m.mergedEmails.includes(author.email)
                            )

                            if (!mergeGroup) return null

                            // Collect all names (including primary and merged)
                            const allNames = [mergeGroup.primaryName, ...mergeGroup.mergedNames]

                            // Check if all names are the same
                            const uniqueNames = new Set(allNames.map(n => n.trim().toLowerCase()))
                            const allNamesSame = uniqueNames.size === 1

                            // Calculate label to display
                            let linkLabel = ''
                            if (allNamesSame) {
                              // All names are the same, show count
                              linkLabel = `(${allNames.length})`
                            } else {
                              // Different names, show +number (excluding the currently displayed name)
                              linkLabel = `+${allNames.length - 1}`
                            }

                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openUnlinkDialog(author)
                                      }}
                                      className="inline-flex items-center gap-1 hover:bg-purple-500/10 rounded px-1 py-0.5 transition-colors"
                                    >
                                      <Link2 className="h-3.5 w-3.5 text-purple-500" />
                                      <span className="text-xs text-purple-500 font-medium">{linkLabel}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold">{t('authors.linkedAuthorsCount').replace('{count}', String(groupEmails.length))}</p>

                                      {/* Primary Author */}
                                      <div className="space-y-1 pb-2 border-b">
                                        <p className="text-xs font-medium text-purple-500">{t('authors.primary')}</p>
                                        <p className="text-xs">{mergeGroup.primaryName}</p>
                                        <p className="text-xs text-muted-foreground">{mergeGroup.primaryEmail}</p>
                                      </div>

                                      {/* Merged Authors */}
                                      {mergeGroup.mergedEmails.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium text-purple-500">{t('authors.merged')}</p>
                                          {mergeGroup.mergedEmails.map((email, idx) => (
                                            <div key={email} className="space-y-0.5 ml-2">
                                              <p className="text-xs">{mergeGroup.mergedNames[idx]}</p>
                                              <p className="text-xs text-muted-foreground">{email}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <p className="text-xs text-muted-foreground pt-2 border-t">{t('authors.clickToUnlink')}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })()}
                        </div>
                      </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{author.email}</span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const fullOrg = getAuthorOrganization(author.email)
                        const abbr = getOrganizationAbbreviation(fullOrg)

                        if (!fullOrg) {
                          return <span className="text-sm text-muted-foreground">N/A</span>
                        }

                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help font-mono">
                                  {abbr}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{fullOrg}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${author.hasWarning ? 'text-warning' : ''}`}>
                          {author.paperCount}
                        </span>
                        <span className="text-muted-foreground text-sm">/ 2</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {author.paperIds.map((paperId, idx) => (
                          <Badge
                            key={idx}
                            variant={idx >= 2 ? 'destructive' : 'secondary'}
                            className="text-xs font-mono"
                          >
                            #{paperId}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {author.hasWarning && (
                          <Badge variant="destructive" className="text-xs w-fit">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t('authors.overQuotaBadge')}
                          </Badge>
                        )}
                        {author.hasEmailConflict && (
                          <Badge variant="outline" className="border-destructive text-destructive text-xs w-fit">
                            <Mail className="h-3 w-3 mr-1" />
                            {t('authors.emailConflictBadge')}
                          </Badge>
                        )}
                        {!author.hasWarning && !author.hasEmailConflict && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {t('authors.ok')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(author)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('authors.editAuthor')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={selectedAuthorsForLink.has(author.email) ? "default" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleAuthorForLink(author.email)}
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{selectedAuthorsForLink.has(author.email) ? t('authors.deselectForLinking') : t('authors.selectForLinking')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer info */}
      <div className="text-sm text-muted-foreground text-center">
        {t('authors.showingCount')
          .replace('{count}', String(filteredAuthors.length))
          .replace('{total}', String(stats.total))}
        {searchQuery && ` (${t('authors.filteredBy').replace('{query}', searchQuery)})`}
      </div>

      {/* Edit Author Dialog */}
      <Dialog open={!!editingAuthor} onOpenChange={() => setEditingAuthor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('authors.editAuthorInfo')}</DialogTitle>
            <DialogDescription>
              {t('authors.editAuthorDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('authors.authorName')}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t('authors.authorName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('authors.emailAddress')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="author@example.com"
              />
            </div>

            {editingAuthor?.paperIds && editingAuthor.paperIds.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">{t('authors.associatedPapers')}</p>
                <div className="flex flex-wrap gap-1">
                  {editingAuthor.paperIds.map((paperId, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      #{paperId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAuthor(null)}>
              {t('authors.cancel')}
            </Button>
            <Button onClick={handleSaveEdit}>
              {t('authors.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Authors Dialog */}
      <Dialog open={!!unlinkingAuthor} onOpenChange={() => {
        setUnlinkingAuthor(null)
        setSelectedEmailToRemove('')
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('authors.manageLinkedAuthors')}</DialogTitle>
            <DialogDescription>
              {t('authors.manageLinkedDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {unlinkingAuthor && (() => {
              const mergeGroup = authorMerges.find(m =>
                m.primaryEmail === unlinkingAuthor.email || m.mergedEmails.includes(unlinkingAuthor.email)
              )

              if (!mergeGroup) return null

              // Build all linked author information (including original names and emails)
              const linkedAuthorsInfo = [
                { name: mergeGroup.primaryName, email: mergeGroup.primaryEmail, isPrimary: true },
                ...mergeGroup.mergedEmails.map((email, idx) => ({
                  name: mergeGroup.mergedNames[idx],
                  email,
                  isPrimary: false,
                }))
              ]

              return (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-3">{t('authors.selectToRemove').replace('{count}', String(linkedAuthorsInfo.length))}</p>
                    <div className="space-y-2">
                      {linkedAuthorsInfo.map((authorInfo) => {
                        // Get author paper statistics (from original data)
                        const originalAuthor = authors.find(a => a.email === authorInfo.email)
                        const isSelected = selectedEmailToRemove === authorInfo.email

                        return (
                          <div
                            key={authorInfo.email}
                            onClick={() => setSelectedEmailToRemove(authorInfo.email)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-primary/10 border-primary shadow-sm'
                                : 'bg-background border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                              }`}>
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                              </div>
                              <p className="font-semibold">{authorInfo.name}</p>
                              {authorInfo.isPrimary && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">{t('authors.primaryBadge')}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">{authorInfo.email}</p>
                            {originalAuthor && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {originalAuthor.paperCount} {originalAuthor.paperCount > 1 ? t('authors.paperPlural') : t('authors.paperSingular')}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {linkedAuthorsInfo.length > 2 && selectedEmailToRemove && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>{t('authors.removeNote')
                          .replace('{name}', linkedAuthorsInfo.find(a => a.email === selectedEmailToRemove)?.name || '')
                          .replace('{count}', String(linkedAuthorsInfo.length - 1))
                          .replace('{s}', linkedAuthorsInfo.length - 1 > 1 ? 's' : '')}</strong>
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setUnlinkingAuthor(null)
              setSelectedEmailToRemove('')
            }} className="w-full sm:w-auto">
              {t('authors.cancel')}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="destructive"
                onClick={handleUnlinkAll}
                className="flex-1 sm:flex-initial"
              >
                {t('authors.unlinkAll')}
              </Button>
              <Button
                onClick={handleRemoveFromLink}
                disabled={!selectedEmailToRemove}
                className="flex-1 sm:flex-initial"
              >
                {t('authors.removeSelected')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export success dialog */}
      <AlertDialog open={showExportSuccess} onOpenChange={setShowExportSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <AlertDialogTitle>{t('authors.exportSuccess')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {exportedFilePath ? (
                <>
                  {t('authors.exportedTo')}
                  <div className="mt-2 p-2 bg-muted rounded text-sm font-mono break-all">
                    {exportedFilePath}
                  </div>
                </>
              ) : (
                t('authors.downloadedTo')
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('authors.close')}</AlertDialogCancel>
            {exportedFilePath && (
              <AlertDialogAction onClick={handleShowInExplorer}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('authors.showInFinder')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
