import { useState, useEffect, useRef, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  RotateCwIcon,
  DownloadIcon
} from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF.js worker using CDN for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  pdfPath: string | null
}

export function PDFViewer({ pdfPath }: PDFViewerProps) {
  const { resolvedTheme } = useTheme()
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [autoFit, setAutoFit] = useState<boolean>(true)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [containerHeight, setContainerHeight] = useState<number>(0)

  // Memoize the file prop to prevent unnecessary reloads
  const fileData = useMemo(() => {
    return pdfData ? { data: pdfData } : null
  }, [pdfData])

  // Load PDF file using Tauri
  useEffect(() => {
    if (!pdfPath) {
      setPdfData(null)
      setError(null)
      return
    }

    const loadPDF = async () => {
      try {
        console.log("Loading PDF:", pdfPath)
        const { readFile } = await import("@tauri-apps/plugin-fs")
        const data = await readFile(pdfPath)
        const uint8Array = new Uint8Array(data)
        setPdfData(uint8Array)
        setError(null)
        console.log("PDF loaded successfully")
      } catch (err: any) {
        console.error("Error loading PDF:", err)
        setError(`Failed to load PDF: ${err.message || err}`)
        setPdfData(null)
      }
    }

    loadPDF()
  }, [pdfPath])

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
  }, [isFullscreen])

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

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

  if (!pdfPath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Compile to generate PDF preview</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>{error}</p>
      </div>
    )
  }

  if (!pdfData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Loading PDF...</p>
      </div>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full ${isFullscreen ? (isDark ? 'bg-black' : 'bg-gray-900') : (isDark ? 'bg-gray-950' : 'bg-gray-100')}`}
    >
      {/* Top Toolbar - Controls */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b shrink-0 bg-card border-border">
        {/* Zoom Controls */}
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

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 border border-border rounded transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <MinimizeIcon className="w-4 h-4" />
          ) : (
            <MaximizeIcon className="w-4 h-4" />
          )}
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Download */}
        <button
          onClick={handleDownload}
          className="p-2 border border-border rounded transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
          title="Download PDF"
        >
          <DownloadIcon className="w-4 h-4" />
        </button>
      </div>

      {/* PDF Display */}
      <div
        ref={pageContainerRef}
        className="flex-1 overflow-auto p-6 flex justify-center items-center min-h-0"
      >
        <Document
          file={fileData}
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
              width={autoFit ? Math.min(containerWidth, containerWidth) : undefined}
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
