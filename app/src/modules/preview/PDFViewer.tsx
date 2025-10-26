import { useState, useEffect, useRef, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  PanelLeftIcon,
  RotateCwIcon,
  DownloadIcon,
  PlayIcon,
  BellIcon
} from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useEditorStore } from "@/store"
import type { BuildResult } from "@/ipc"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF.js worker using CDN for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  pdfPath: string | null
  pdfVersion?: number
  onCompile?: () => void
  isCompiling?: boolean
  buildResult?: BuildResult | null
}

export function PDFViewer({ pdfPath, pdfVersion = 0, onCompile, isCompiling, buildResult }: PDFViewerProps) {
  const { resolvedTheme } = useTheme()
  const { layoutMode, setLayoutMode } = useEditorStore()
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [autoFit, setAutoFit] = useState<boolean>(true)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [containerHeight, setContainerHeight] = useState<number>(0)
  const [showBuildInfo, setShowBuildInfo] = useState<boolean>(false)

  // Load/reload PDF file using Tauri
  // Note: we depend on pdfVersion so that when a build finishes and the
  // PDF path stays the same, we still reload the updated bytes from disk.
  useEffect(() => {
    if (!pdfPath) {
      // Revoke previous URL to avoid memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
      setPdfUrl(null)
      setError(null)
      setNumPages(0)
      setPageNumber(1)
      return
    }

    const loadPDF = async () => {
      try {
        console.log(`Loading PDF (version ${pdfVersion}):`, pdfPath)

        // Revoke previous URL to avoid memory leaks
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl)
        }

        setError(null)

        const { readFile } = await import("@tauri-apps/plugin-fs")
        const data = await readFile(pdfPath)

        // Create a Blob from the data
        const blob = new Blob([data], { type: 'application/pdf' })

        // Create an object URL for the blob
        const url = URL.createObjectURL(blob)

        setPdfUrl(url)
        console.log("PDF loaded successfully, version:", pdfVersion)
      } catch (err: any) {
        console.error("Error loading PDF:", err)
        setError(`Failed to load PDF: ${err.message || err}`)
        setPdfUrl(null)
      }
    }

    loadPDF()

    // Cleanup: revoke URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfPath, pdfVersion])

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (pageContainerRef.current) {
        setContainerWidth(pageContainerRef.current.clientWidth - 48) // padding
        setContainerHeight(pageContainerRef.current.clientHeight - 48) // padding
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [layoutMode])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    console.log("PDF document loaded, pages:", numPages)
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error)
    setError(`Failed to load PDF: ${error.message}`)
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages))
  }

  const previousPage = () => changePage(-1)
  const nextPage = () => changePage(1)

  const zoomIn = () => {
    setAutoFit(false)
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setAutoFit(false)
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleDownload = async () => {
    if (!pdfPath) return

    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { copyFile } = await import('@tauri-apps/plugin-fs')

      // Get default file name from path
      const fileName = pdfPath.split(/[/\\]/).pop() || 'document.pdf'

      // Show save dialog
      const savePath = await save({
        defaultPath: fileName,
        filters: [{
          name: 'PDF',
          extensions: ['pdf']
        }]
      })

      if (savePath) {
        // Copy file to selected location
        await copyFile(pdfPath, savePath)
        console.log('PDF downloaded to:', savePath)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Check if there are errors or warnings
  const hasErrors = buildResult?.errors && buildResult.errors.length > 0
  const hasWarnings = buildResult?.warnings && buildResult.warnings.length > 0
  const hasIssues = hasErrors || hasWarnings

  const isDark = resolvedTheme === 'dark'

  // Show build info when explicitly toggled OR when there's a build failure
  const shouldShowBuildInfo = showBuildInfo || (buildResult && !buildResult.success && !pdfUrl) || (error !== null)

  // Debug logging
  useEffect(() => {
    console.log('PDFViewer state:', {
      pdfPath,
      pdfVersion,
      hasPdfUrl: !!pdfUrl,
      error,
      showBuildInfo,
      shouldShowBuildInfo,
      buildResult: buildResult ? {
        success: buildResult.success,
        errorsCount: buildResult.errors?.length || 0,
        warningsCount: buildResult.warnings?.length || 0
      } : null
    })
  }, [pdfPath, pdfVersion, pdfUrl, error, showBuildInfo, shouldShowBuildInfo, buildResult])

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full ${isDark ? 'bg-gray-950' : 'bg-gray-100'}`}
    >
      {/* Top Toolbar - Controls */}
      <div className="flex items-center justify-between gap-2 px-4 h-10 border-b shrink-0 bg-card border-border">
        {/* Left: Compile Button */}
        {onCompile && (
          <button
            onClick={onCompile}
            disabled={isCompiling}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Compile LaTeX"
          >
            <PlayIcon className="w-4 h-4" />
            {isCompiling ? "Compiling..." : "Compile"}
          </button>
        )}

        <div className="flex-1" />

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 border border-border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground text-foreground"
            title="Zoom out"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-2 border border-border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground text-foreground"
            title="Zoom in"
          >
            <ZoomInIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Rotation */}
          <button
            onClick={rotate}
            className="p-2 border border-border rounded transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
            title="Rotate 90°"
          >
            <RotateCwIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Layout Toggle Buttons */}
          {layoutMode === "split" ? (
            <button
              onClick={() => setLayoutMode("preview-only")}
              className="p-2 border border-border rounded transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
              title="Preview only"
            >
              <MaximizeIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setLayoutMode("split")}
              className="p-2 border border-border rounded transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
              title="Show editor and preview"
            >
              <PanelLeftIcon className="w-4 h-4" />
            </button>
          )}

          <div className="w-px h-6 bg-border mx-1" />

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 border border-border rounded transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
            title="Download PDF"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Build Info Bell */}
          <button
            onClick={() => setShowBuildInfo(!showBuildInfo)}
            className={`p-2 border rounded transition-colors relative ${
              showBuildInfo
                ? "bg-cyan-500 text-white border-cyan-500"
                : "border-border hover:bg-accent hover:text-accent-foreground text-foreground"
            }`}
            title={showBuildInfo ? "Hide build information" : "Show build information"}
          >
            <BellIcon className="w-4 h-4" />
            {hasIssues && !showBuildInfo && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={pageContainerRef}
        className="flex-1 overflow-auto p-6 min-h-0"
      >
        {shouldShowBuildInfo ? (
          /* Build Information Display */
          <div className="h-full flex items-start justify-center">
            <div className="max-w-3xl w-full space-y-4 py-4">
              {!buildResult && !error ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Compile to generate PDF preview</p>
                </div>
              ) : error ? (
                <div className="text-center text-destructive py-8">
                  <p>{error}</p>
                </div>
              ) : buildResult ? (
                <>
                  {/* Build Status */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-2">Build Status</h3>
                    <p className={buildResult.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {buildResult.success ? "✓ Build successful" : "✗ Build failed"}
                    </p>
                    {buildResult.duration_ms > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">Duration: {buildResult.duration_ms}ms</p>
                    )}
                  </div>

                  {/* Errors */}
                  {hasErrors && buildResult.errors && (
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-medium text-red-600 dark:text-red-400 mb-3">
                        Errors ({buildResult.errors.length})
                      </h3>
                      <div className="space-y-2">
                        {buildResult.errors.map((error, idx) => (
                          <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm">
                            {error.file && (
                              <div className="font-medium text-red-700 dark:text-red-300 mb-1">
                                {error.file}
                                {error.line && `:${error.line}`}
                              </div>
                            )}
                            <div className="text-red-800 dark:text-red-200 whitespace-pre-wrap">{error.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {hasWarnings && buildResult.warnings && (
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h3 className="font-medium text-amber-600 dark:text-amber-400 mb-3">
                        Warnings ({buildResult.warnings.length})
                      </h3>
                      <div className="space-y-2">
                        {buildResult.warnings.map((warning, idx) => (
                          <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-sm">
                            {warning.file && (
                              <div className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                                {warning.file}
                                {warning.line && `:${warning.line}`}
                              </div>
                            )}
                            <div className="text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{warning.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success with no issues */}
                  {buildResult.success && !hasErrors && !hasWarnings && (
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-muted-foreground text-center">
                        No errors or warnings - Build completed successfully
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>No build information available</p>
                </div>
              )}
            </div>
          </div>
        ) : !pdfUrl ? (
          /* Loading State */
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Loading PDF...</p>
          </div>
        ) : (
          /* PDF Display */
          <div className="h-full flex justify-center items-center">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading document...</p>
                </div>
              }
            >
              <div className="bg-white shadow-2xl">
                <Page
                  pageNumber={pageNumber}
                  scale={autoFit ? undefined : scale}
                  width={autoFit ? containerWidth : undefined}
                  height={autoFit ? containerHeight : undefined}
                  rotate={rotation}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <p className="text-gray-600">Loading page...</p>
                    </div>
                  }
                  className="max-w-full max-h-full"
                />
              </div>
            </Document>
          </div>
        )}
      </div>

      {/* Bottom Toolbar - Page Info */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card border-border text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="p-1.5 border border-border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground text-foreground"
              title="Previous page"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="min-w-[100px] text-center font-medium text-foreground">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className="p-1.5 border border-border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground text-foreground"
              title="Next page"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-muted-foreground">
            {autoFit ? "Fit to page" : `${Math.round(scale * 100)}%`}
          </div>
        </div>
      </div>
    </div>
  )
}
