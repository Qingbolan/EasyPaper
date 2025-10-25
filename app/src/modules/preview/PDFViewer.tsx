import { useState, useEffect, useRef, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  RotateCwIcon
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
      {/* Toolbar */}
      <div className={`flex items-center gap-2 p-3 border-b shrink-0 ${
        isFullscreen
          ? (isDark ? 'bg-black/90 border-gray-800' : 'bg-gray-900/90 border-gray-700')
          : (isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200')
      } ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className={`p-2 border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'border-gray-700 hover:bg-gray-800'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm min-w-[100px] text-center font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className={`p-2 border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'border-gray-700 hover:bg-gray-800'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className={`p-2 border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'border-gray-700 hover:bg-gray-800'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title="Zoom out"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <span className="text-sm min-w-[60px] text-center font-medium">
            {autoFit ? "Fit" : `${Math.round(scale * 100)}%`}
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className={`p-2 border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'border-gray-700 hover:bg-gray-800'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title="Zoom in"
          >
            <ZoomInIcon className="w-4 h-4" />
          </button>
        </div>

        <div className={`w-px h-6 mx-2 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

        {/* Rotation */}
        <button
          onClick={rotate}
          className={`p-2 border rounded transition-colors ${
            isDark
              ? 'border-gray-700 hover:bg-gray-800'
              : 'border-gray-300 hover:bg-gray-100'
          }`}
          title="Rotate 90°"
        >
          <RotateCwIcon className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className={`p-2 border rounded transition-colors ${
            isDark
              ? 'border-gray-700 hover:bg-gray-800'
              : 'border-gray-300 hover:bg-gray-100'
          }`}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <MinimizeIcon className="w-4 h-4" />
          ) : (
            <MaximizeIcon className="w-4 h-4" />
          )}
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
          <div className={`${isDark ? 'bg-white' : 'bg-white'} shadow-2xl`}>
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
    </div>
  )
}
