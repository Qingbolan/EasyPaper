import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { AnimatedCard } from '@/components/magic/animated-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Clock,
  Trash2,
} from 'lucide-react'
import { usePaperStore } from '@/store/paper-store'
import { useI18n } from '@/lib/i18n'
import { parseExcelFile, isValidExcelFile } from '@/algorithms'

interface ImportHistory {
  id: string
  datasetId: string // Associated dataset ID
  fileName: string
  timestamp: string
  papersCount: number
  authorsCount: number
  warningsCount: number
}

export default function DataImportPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const importExcelData = usePaperStore(state => state.importExcelData)
  const deleteDataset = usePaperStore(state => state.deleteDataset)
  const setCurrentDataset = usePaperStore(state => state.setCurrentDataset)
  const datasets = usePaperStore(state => state.getDatasets())

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [importStats, setImportStats] = useState<{
    papers: number
    authors: number
    warnings: number
  } | null>(null)

  // Import history stored in localStorage
  const [importHistory, setImportHistory] = useState<ImportHistory[]>(() => {
    const stored = localStorage.getItem('import-history')
    return stored ? JSON.parse(stored) : []
  })

  // Clean up invalid history records
  useEffect(() => {
    const stored = localStorage.getItem('import-history')
    if (!stored) return

    const history = JSON.parse(stored)
    const validHistory = history.filter((record: ImportHistory) => {
      return record.datasetId && datasets.some(ds => ds.id === record.datasetId)
    })

    // If count changed after cleanup, update state and localStorage
    if (validHistory.length !== history.length) {
      setImportHistory(validHistory)
      localStorage.setItem('import-history', JSON.stringify(validHistory))
    }
  }, [datasets.length]) // Execute cleanup when datasets count changes

  const saveToHistory = (datasetId: string, fileName: string, stats: { papers: number; authors: number; warnings: number }) => {
    const newRecord: ImportHistory = {
      id: `import-${Date.now()}`,
      datasetId,
      fileName,
      timestamp: new Date().toISOString(),
      papersCount: stats.papers,
      authorsCount: stats.authors,
      warningsCount: stats.warnings,
    }
    const updated = [newRecord, ...importHistory].slice(0, 10) // Keep only the last 10 records
    setImportHistory(updated)
    localStorage.setItem('import-history', JSON.stringify(updated))
  }

  const deleteHistoryItem = (id: string) => {
    // Find corresponding history record
    const record = importHistory.find(item => item.id === id)
    if (record) {
      // Also delete dataset from store
      deleteDataset(record.datasetId)
    }

    // Delete history record
    const updated = importHistory.filter(item => item.id !== id)
    setImportHistory(updated)
    localStorage.setItem('import-history', JSON.stringify(updated))
  }

  const handleCardClick = (datasetId: string) => {
    // Set current dataset
    setCurrentDataset(datasetId)
    // Navigate to papers page
    navigate('/papers')
  }

  const processExcelFile = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setProgress(0)
      setError(null)
      setImportStats(null)

      try {
        // Parse Excel file using algorithm module
        setProgress(20)
        const parseResult = await parseExcelFile(file)

        setProgress(60)

        // Import data to store
        setProgress(80)
        const datasetId = importExcelData(parseResult.data, parseResult.label, file.name)

        // Calculate statistics from the newly imported dataset
        const store = usePaperStore.getState()
        const newDataset = store.datasets.find(ds => ds.id === datasetId)

        if (!newDataset) {
          throw new Error('Failed to find newly imported dataset')
        }

        const stats = {
          papers: newDataset.papers.length,
          authors: newDataset.authors.size,
          warnings: newDataset.papers.filter(p => p.hasWarning).length,
        }

        setImportStats(stats)
        saveToHistory(datasetId, file.name, stats)
        setProgress(100)

        // Navigate to papers page after 2 seconds
        setTimeout(() => {
          navigate('/papers')
        }, 2000)
      } catch (err) {
        console.error('Import error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setProgress(0)
      } finally {
        setIsProcessing(false)
      }
    },
    [importExcelData, navigate, importHistory]
  )

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isValidExcelFile(file)) {
      setError('Please select a valid Excel file (.xlsx or .xls)')
      return
    }

    processExcelFile(file)
  }

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const file = event.dataTransfer.files?.[0]
      if (!file) return

      if (!isValidExcelFile(file)) {
        setError('Please select a valid Excel file (.xlsx or .xls)')
        return
      }

      processExcelFile(file)
    },
    [processExcelFile]
  )

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // Show current status if data already exists
  const hasExistingData = datasets.length > 0
  const totalPapers = datasets.reduce((sum, ds) => sum + ds.papers.length, 0)

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <PageHeader
        title={t('import.title')}
        description={t('import.description')}
      />

      {hasExistingData && !isProcessing && !importStats && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {t('import.existingData')} {totalPapers} {t('import.papers')} in {datasets.length} dataset{datasets.length > 1 ? 's' : ''}
            <Button
              variant="link"
              className="ml-2 h-auto p-0"
              onClick={() => navigate('/papers')}
            >
              {t('import.viewPapers')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <AnimatedCard delay={0.1}>
        <div
          className="p-8"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-12 w-12 text-primary" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {t('import.uploadTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('import.uploadDescription')}
              </p>
            </div>

            <div className="w-full">
              <label htmlFor="file-upload">
                <div className="flex justify-center">
                  <Button
                    variant="default"
                    size="lg"
                    disabled={isProcessing}
                    onClick={() =>
                      document.getElementById('file-upload')?.click()
                    }
                  >
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    {isProcessing
                      ? t('import.processing')
                      : t('import.selectFile')}
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('import.dragAndDrop')}
            </p>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-6 space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {t('import.processingFile')} {progress}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {importStats && (
            <Alert className="mt-6 border-success bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                <p className="font-semibold text-success mb-2">
                  {t('import.success')}
                </p>
                <ul className="text-sm space-y-1">
                  <li>
                    {importStats.papers} {t('import.stats.papers')}
                  </li>
                  <li>
                    {importStats.authors} {t('import.stats.authors')}
                  </li>
                  <li>
                    {importStats.warnings} {t('import.stats.warnings')}
                  </li>
                </ul>
                <p className="text-xs mt-2 text-muted-foreground">
                  {t('import.redirecting')}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </AnimatedCard>

      {/* Import History - Only show when history exists */}
      {importHistory.length > 0 && (
        <AnimatedCard delay={0.3}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('import.history')}
              </h3>
              <Badge variant="secondary">{importHistory.length}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {importHistory.map((record) => {
                const dataset = datasets.find(ds => ds.id === record.datasetId)
                return (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleCardClick(record.datasetId)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-primary flex-shrink-0" />
                          <p className="font-medium text-sm truncate">
                            {dataset?.label || 'Deleted Dataset'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate pl-6">
                          {record.fileName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteHistoryItem(record.id)
                        }}
                        className="flex-shrink-0 h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                      {formatTimestamp(record.timestamp)}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {record.papersCount}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {record.authorsCount}
                      </Badge>
                      {record.warningsCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {record.warningsCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
