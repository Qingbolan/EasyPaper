import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Splitter } from "antd"
import { useProjectStore, useEditorStore } from "@/store"
import { fileRead, fileWrite, fileList, buildCompile, buildClean, FileInfo } from "@/ipc"
import { MonacoEditor } from "@/modules/editor/MonacoEditor"
import { KaTeXPreview } from "@/modules/preview/KaTeXPreview"
import { PDFViewer } from "@/modules/preview/PDFViewer"
import { FileTree } from "@/modules/project/FileTree"
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
    previewMode,
    pdfPath,
    setPdfPath,
  } = useEditorStore()

  const [editorContent, setEditorContent] = useState("")

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
          await handleFileSelect(mainTex)
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

    try {
      const fullPath = `${projectDir}/${file.path}`
      console.log("Reading file:", fullPath)
      const content = await fileRead(fullPath)
      openFile(fullPath, content)
      setEditorContent(content)
    } catch (error) {
      console.error("Failed to read file:", error)
    }
  }

  // Handle content change
  const handleContentChange = (value: string) => {
    setEditorContent(value)
    if (activeFile) {
      updateFileContent(activeFile, value)
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!activeFile) return

    try {
      await fileWrite(activeFile, editorContent)
      console.log("File saved:", activeFile)
    } catch (error) {
      console.error("Failed to save file:", error)
    }
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
      // Save current file before compiling
      if (activeFile) {
        console.log("Saving active file:", activeFile)
        await fileWrite(activeFile, editorContent)
      }

      console.log("Calling buildCompile...")
      const result = await buildCompile(projectDir)
      console.log("Build result received:", JSON.stringify(result, null, 2))

      setBuildResult(result)

      if (result.success && result.pdf_path) {
        console.log("✅ Build successful! PDF path:", result.pdf_path)
        setPdfPath(result.pdf_path)
        console.log("PDF path set in store")
      } else {
        console.log("❌ Build failed or no PDF generated")
        if (result.errors && result.errors.length > 0) {
          console.log("Errors:", result.errors)
        }
      }
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

  // Auto-compile when switching to PDF preview mode
  useEffect(() => {
    if (previewMode === "pdf" && !pdfPath && !isBuilding && projectDir) {
      console.log("Auto-compiling for PDF preview...")
      handleCompile()
    }
  }, [previewMode])

  if (!projectDir) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Build Panel with Project Title */}
      <BuildPanel
        onCompile={handleCompile}
        onClean={handleClean}
      />

      {/* Main Content with Splitter */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Splitter
          style={{ height: "100%", boxShadow: "none", backgroundColor: "transparent" }}
        >
          {/* Left: File Tree */}
          <Splitter.Panel
            defaultSize="20%"
            min="15%"
            max="30%"
            style={{
              overflow: "auto"
            }}
          >
            <FileTree onFileSelect={handleFileSelect} />
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
                    onSave={handleSave}
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
                    <PDFViewer pdfPath={pdfPath} />
                  )}
                </div>
              </Splitter.Panel>
            </Splitter>
          </Splitter.Panel>
        </Splitter>
      </div>
    </div>
  )
}
