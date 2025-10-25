import { useEditorStore } from "@/store"
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react"
import { BreadcrumbNav } from "@/components/breadcrumb"

interface BuildPanelProps {
  onClean?: () => void
}

export function BuildPanel({ onClean }: BuildPanelProps) {
  const { lastBuildResult, previewMode, setPreviewMode } = useEditorStore()
  return (
    <div className="top-0 build-panel border-b border-border bg-card px-6 py-3 flex items-center gap-3 shadow-sm">
      {/* Breadcrumb Navigation */}
      <div className="flex-shrink-0">
        <BreadcrumbNav />
      </div>

      <div className="w-px h-6 bg-border flex-shrink-0" />

      {/* Build Status */}
      {lastBuildResult && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-background">
          {lastBuildResult.success ? (
            <>
              <CheckCircleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Build successful ({lastBuildResult.duration_ms}ms)
              </span>
            </>
          ) : (
            <>
              <AlertCircleIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300 font-medium">
                Build failed ({lastBuildResult.errors.length} errors)
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Preview Mode Toggle */}
      <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
        <button
          onClick={() => setPreviewMode("katex")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
            previewMode === "katex"
              ? "bg-cyan-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          Markdown
        </button>
        <button
          onClick={() => setPreviewMode("pdf")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
            previewMode === "pdf"
              ? "bg-cyan-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          PDF
        </button>
      </div>

      {/* Clean Button */}
      {onClean && (
        <button
          onClick={onClean}
          className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent hover:border-accent-foreground transition-all font-medium"
        >
          Clean
        </button>
      )}
    </div>
  )
}
