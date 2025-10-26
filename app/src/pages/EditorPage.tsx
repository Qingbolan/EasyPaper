import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Splitter } from "antd"
import { useProjectStore, useEditorStore } from "@/store"
import { fileRead, fileWrite, fileList, buildCompile, buildClean, FileInfo } from "@/ipc"
import { MonacoEditor } from "@/modules/editor/MonacoEditor"
import { KaTeXPreview } from "@/modules/preview/KaTeXPreview"
import { PDFViewer } from "@/modules/preview/PDFViewer"
import { SidebarTabs } from "@/modules/project/SidebarTabs"
import { BuildPanel } from "@/modules/build/BuildPanel"

export default function EditorPage() {
  const navigate = useNavigate()
  const { projectDir, projectName, setFiles } = useProjectStore()
  const {
    openFile,
    updateFileContent,
    activeFile,
    isBuilding,
    setBuilding,
    setBuildResult,
    lastBuildResult,
    previewMode,
    pdfPath,
    setPdfPath,
    pdfVersion,
    incrementPdfVersion,
    layoutMode,
  } = useEditorStore()

  const [editorContent, setEditorContent] = useState("")
  const [lastCompiledTime, setLastCompiledTime] = useState<string>("")
  const [unsavedChangesCount, setUnsavedChangesCount] = useState(0)

  // Redirect if no project is open
  useEffect(() => {
    if (!projectDir || !projectName) {
      navigate("/")
    }
    // Note: We don't check if papername matches projectName anymore
    // because the project name can be changed independently from the URL
  }, [projectDir, projectName, navigate])

  // Load project files
  useEffect(() => {
    if (!projectDir) return

    const loadFiles = async () => {
      try {
        const files = await fileList(projectDir, true)
        console.log("Loaded files:", files)
        setFiles(files)


        // Auto-open main.tex if it exists
        const mainTex = files.find((f) => f.name === "main.tex")
        if (mainTex && !mainTex.is_dir) {
          console.log("Auto-opening main.tex")
          await handleFileSelect(mainTex)
        } else {
          console.log("main.tex not found in project")
        }
      } catch (error) {
        console.error("Failed to load files:", error)
      }
    }

    loadFiles()
  }, [projectDir])

  // Handle file selection
  const handleFileSelect = async (file: FileInfo) => {
    if (file.is_dir) return

    // Only allow opening text files
    const textExtensions = ['.tex', '.bib', '.txt', '.md', '.sty', '.cls', '.log', '.aux']
    const hasTextExtension = textExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!hasTextExtension) {
      console.warn("Cannot open binary file in editor:", file.name)
      return
    }

    try {
      const fullPath = `${projectDir}/${file.path}`
      console.log("Reading file:", fullPath)
      const content = await fileRead(fullPath)
      openFile(fullPath, content)
      setEditorContent(content)
    } catch (error) {
      console.error("Failed to read file:", error)
      alert(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Handle content change
  const handleContentChange = (value: string) => {
    console.log("Content changed, new length:", value.length)
    setEditorContent(value)
    if (activeFile) {
      console.log("Updating file content in store:", activeFile)
      updateFileContent(activeFile, value)
      // Mark file as dirty when content changes
      const { markFileDirty } = useEditorStore.getState()
      markFileDirty(activeFile, true)
      console.log("File marked as dirty")
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!activeFile || !projectDir) {
      console.warn("Cannot save: activeFile or projectDir is missing")
      return
    }

    try {
      console.log("=== Saving file ===")
      console.log("File path:", activeFile)
      console.log("Content length:", editorContent.length)

      // Write file to disk
      await fileWrite(activeFile, editorContent)
      console.log("✓ File written to disk successfully:", activeFile)

      // Mark file as clean
      const { markFileDirty } = useEditorStore.getState()
      markFileDirty(activeFile, false)
      console.log("✓ File marked as clean")
      console.log("=== Save completed ===")
    } catch (error) {
      console.error("=== Save failed ===", error)
    }
  }

  // Handle save and compile (Cmd+S)
  const handleSaveAndCompile = async () => {
    await handleSave()
    await handleCompile()
  }

  // Handle compile
  const handleCompile = async () => {
    if (!projectDir) {
      console.error("No project directory")
      return
    }

    console.log("=== Starting compilation ===")
    console.log("Project directory:", projectDir)
    setBuilding(true)

    try {
      let savedCount = 0

      // First, save the current active file with latest editorContent
      if (activeFile && editorContent !== undefined) {
        console.log("=== Saving current active file ===")
        console.log("File path:", activeFile)
        console.log("Content length:", editorContent.length)
        console.log("Content preview (first 200 chars):", editorContent.substring(0, 200))

        await fileWrite(activeFile, editorContent)
        console.log("✓ fileWrite completed")

        // Verify the file was written by reading it back
        try {
          const verifyContent = await fileRead(activeFile)
          console.log("✓ Verification read - Content length:", verifyContent.length)
          if (verifyContent === editorContent) {
            console.log("✓✓ VERIFIED: File content matches what we wrote!")
          } else {
            console.error("⚠️ WARNING: File content doesn't match!")
            console.log("Expected length:", editorContent.length)
            console.log("Actual length:", verifyContent.length)
          }
        } catch (verifyError) {
          console.error("Failed to verify file write:", verifyError)
        }

        savedCount++
      }

      // Then save all other dirty files from the store
      const { openFiles } = useEditorStore.getState()
      for (const [path, file] of openFiles.entries()) {
        // Skip the active file as we already saved it
        if (path === activeFile) continue

        if (file.isDirty) {
          console.log("Saving dirty file:", path)
          await fileWrite(path, file.content)
          console.log("✓ File saved:", path)
          savedCount++
        }
      }

      console.log(`✓ Saved ${savedCount} file(s) before compilation`)
      setUnsavedChangesCount(savedCount)

      console.log("Calling buildCompile...")
      const result = await buildCompile(projectDir)
      console.log("Build result received:", JSON.stringify(result, null, 2))

      setBuildResult(result)

      if (result.success && result.pdf_path) {
        console.log("✅ Build successful! PDF path:", result.pdf_path)
        setPdfPath(result.pdf_path)
        incrementPdfVersion()
        console.log("PDF path set in store and version incremented")

        // Update last compiled time
        const now = new Date()
        const timeString = now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        setLastCompiledTime(timeString)
      } else {
        console.log("❌ Build failed or no PDF generated")
        if (result.errors && result.errors.length > 0) {
          console.log("Errors:", result.errors)
        }
      }

      // Mark all files as clean after successful save
      const { markFileDirty } = useEditorStore.getState()
      if (activeFile) {
        markFileDirty(activeFile, false)
      }
      for (const path of openFiles.keys()) {
        markFileDirty(path, false)
      }
      console.log("All files marked as clean")

      // Reset unsaved count after compile completes
      setTimeout(() => setUnsavedChangesCount(0), 3000) // Clear after 3 seconds
    } catch (error) {
      console.error("=== Build error ===", error)
      setBuildResult({
        success: false,
        errors: [{ message: String(error), file: "", line: 0, column: 0 }],
        warnings: [],
        duration_ms: 0,
      })
    } finally {
      setBuilding(false)
      console.log("=== Compilation finished ===")
    }
  }

  // Handle clean
  const handleClean = async () => {
    if (!projectDir) return

    try {
      await buildClean(projectDir)
      setPdfPath(null)
      console.log("Build cleaned")
    } catch (error) {
      console.error("Clean failed:", error)
    }
  }

  // Toggle preview mode
  const togglePreviewMode = () => {
    setPreviewMode(previewMode === "katex" ? "pdf" : "katex")
  }

  // Get file name from active file path
  const getFileName = () => {
    if (!activeFile) return undefined
    const parts = activeFile.split(/[/\\]/)
    return parts[parts.length - 1]
  }

  // Auto-compile when switching to PDF preview mode
  useEffect(() => {
    const checkAndCompile = async () => {
      if (previewMode !== "pdf" || isBuilding || !projectDir) {
        return
      }

      // If no PDF path, definitely compile
      if (!pdfPath) {
        console.log("Auto-compiling for PDF preview (no PDF path)...")
        handleCompile()
        return
      }

      // Check if the PDF file actually exists
      try {
        const { exists } = await import("@tauri-apps/plugin-fs")
        const pdfExists = await exists(pdfPath)
        if (!pdfExists) {
          console.log("Auto-compiling for PDF preview (PDF file not found)...")
          handleCompile()
        }
      } catch (error) {
        console.error("Error checking PDF existence:", error)
        // If we can't check, try compiling anyway
        console.log("Auto-compiling for PDF preview (error checking file)...")
        handleCompile()
      }
    }

    checkAndCompile()
  }, [previewMode])

  if (!projectDir) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Build Panel with Project Title */}
      <BuildPanel
        onClean={handleClean}
        lastCompiledTime={lastCompiledTime}
        savedFilesCount={unsavedChangesCount}
      />

      {/* Main Content with Splitter */}
      <div className="flex-1 overflow-hidden min-h-0">
        {layoutMode === "preview-only" ? (
          // Preview Only Mode - No sidebar, no editor
          <div className="h-full bg-background">
            {previewMode === "katex" ? (
              <KaTeXPreview content={editorContent} />
            ) : (
              <PDFViewer
                pdfPath={pdfPath}
                pdfVersion={pdfVersion}
                onCompile={handleCompile}
                isCompiling={isBuilding}
                buildResult={lastBuildResult}
              />
            )}
          </div>
        ) : (
          // Split or Editor-only Mode
          <Splitter
            style={{ height: "100%", boxShadow: "none", backgroundColor: "transparent" }}
          >
            {/* Left: Sidebar Tabs (File Tree, Search, etc.) */}
            <Splitter.Panel
              defaultSize="20%"
              min="15%"
              max="30%"
              style={{
                overflow: "hidden"
              }}
            >
              <SidebarTabs onFileSelect={handleFileSelect} />
            </Splitter.Panel>

            {/* Middle & Right */}
            <Splitter.Panel>
              <Splitter style={{ backgroundColor: "transparent" }}>
                {/* Middle: Editor */}
                <Splitter.Panel
                  defaultSize="50%"
                  min="30%"
                >
                  {activeFile ? (
                    <MonacoEditor
                      value={editorContent}
                      onChange={handleContentChange}
                      onSave={handleSaveAndCompile}
                      fileName={getFileName()}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Select a file to edit</p>
                    </div>
                  )}
                </Splitter.Panel>

                {/* Right: Preview */}
                <Splitter.Panel
                  defaultSize="50%"
                  min="30%"
                >
                  <div className="h-full bg-background">
                    {previewMode === "katex" ? (
                      <KaTeXPreview content={editorContent} />
                    ) : (
                      <PDFViewer
                        pdfPath={pdfPath}
                        pdfVersion={pdfVersion}
                        onCompile={handleCompile}
                        isCompiling={isBuilding}
                        buildResult={lastBuildResult}
                      />
                    )}
                  </div>
                </Splitter.Panel>
              </Splitter>
            </Splitter.Panel>
          </Splitter>
        )}
      </div>
    </div>
  )
}
