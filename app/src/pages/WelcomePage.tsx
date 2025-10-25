import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useProjectStore } from "@/store"
import { templateList, templateApply, Template } from "@/ipc"
import { open } from "@tauri-apps/plugin-dialog"
import { FolderIcon, FileTextIcon, ClockIcon, SettingsIcon, UploadIcon } from "lucide-react"
import { getDefaultProjectLocation, initializeDefaultLocation } from "@/lib/paths"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function WelcomePage() {
  const navigate = useNavigate()
  const {
    setProject,
    recentProjects,
    addRecentProject,
    defaultProjectLocation,
    setDefaultProjectLocation
  } = useProjectStore()
  const [templates, setTemplates] = useState<Template[]>([])
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [projectName, setProjectName] = useState("")
  const [projectPath, setProjectPath] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Initializing WelcomePage...")
        console.log("Is Tauri?", typeof window !== 'undefined' && '__TAURI__' in window)

        // Load templates (will use mock data in non-Tauri environment)
        const tmpl = await templateList()
        console.log("Templates loaded:", tmpl)
        setTemplates(tmpl)
        if (tmpl.length > 0) {
          setSelectedTemplate(tmpl[0].id)
        }

        // Set default project location
        console.log("defaultProjectLocation from store:", defaultProjectLocation)
        if (!defaultProjectLocation) {
          const defaultLoc = await initializeDefaultLocation()
          console.log("Initialized default location:", defaultLoc)
          setDefaultProjectLocation(defaultLoc)
          setProjectPath(defaultLoc)
        } else {
          console.log("Using existing default location:", defaultProjectLocation)
          setProjectPath(defaultProjectLocation)
        }
      } catch (error) {
        console.error("Failed to initialize:", error)
      }
    }

    initialize()
  }, [])

  const openProject = async (projectPath: string) => {
    try {
      addRecentProject(projectPath)
      const projectName = projectPath.split("/").pop() || "Project"
      setProject(projectPath, projectName, {
        version: 1,
        name: projectName,
        main: "main.tex",
        engine: { type: "tectonic", args: [] },
        compile: {
          synctex: true,
          shell_escape: false,
          outdir: "out",
          min_interval_ms: 600,
        },
      })
      // Navigate to the new route format: /project/:papername
      navigate(`/project/${encodeURIComponent(projectName)}`)
    } catch (error) {
      console.error("Failed to open project:", error)
    }
  }

  const handleOpenProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open Project Directory",
      })

      if (selected && typeof selected === "string") {
        await openProject(selected)
      }
    } catch (error) {
      console.error("Failed to open project:", error)
    }
  }

  const handleCreateProject = async () => {
    console.log("handleCreateProject called")
    console.log("projectName:", projectName)
    console.log("projectPath:", projectPath)
    console.log("selectedTemplate:", selectedTemplate)

    if (!projectName || !projectPath || !selectedTemplate) {
      alert("Please fill in all fields")
      return
    }

    setIsCreating(true)

    try {
      const fullPath = `${projectPath}/${projectName.replace(/\s+/g, "-")}`
      console.log("Creating project at:", fullPath)
      console.log("Is Tauri?", '__TAURI__' in window)

      await templateApply(fullPath, selectedTemplate, projectName)
      console.log("Template applied successfully")

      await openProject(fullPath)
      console.log("Project opened successfully")
    } catch (error) {
      console.error("Failed to create project:", error)
      alert(`Failed to create project: ${error}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleBrowseLocation = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Location",
        defaultPath: projectPath || defaultProjectLocation,
      })

      if (selected && typeof selected === "string") {
        setProjectPath(selected)
      }
    } catch (error) {
      console.error("Failed to browse location:", error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    // Note: Tauri doesn't support file drag & drop the same way as web
    // This is a placeholder - actual implementation would require Tauri's file drop API
    console.log("Drop event:", e.dataTransfer.files)
    alert("Drag & drop support coming soon! Please use 'Open Project' button for now.")
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="text-center">
            <UploadIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-lg font-semibold">Drop project folder here</p>
          </div>
        </div>
      )}

      {/* Settings Button */}
      <button
        onClick={() => navigate("/settings")}
        className="absolute top-8 right-8 p-2 rounded-lg hover:bg-accent transition-colors"
        title="Settings"
      >
        <SettingsIcon className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Title */}
      <div className="text-center max-w-3xl mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          EasyPaper
        </h1>
        <p className="text-lg text-muted-foreground">
          A modern LaTeX editor with AI-powered features
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mb-8">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all group"
          onClick={() => setShowNewProjectDialog(true)}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileTextIcon className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
            <CardTitle className="mb-2">New Project</CardTitle>
            <CardDescription>Start from a template</CardDescription>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all group"
          onClick={handleOpenProject}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FolderIcon className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
            <CardTitle className="mb-2">Open Project</CardTitle>
            <CardDescription>Open existing folder</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      {recentProjects && recentProjects.length > 0 && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Recent Projects</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentProjects.slice(0, 5).map((path) => (
              <button
                key={path}
                onClick={() => openProject(path)}
                className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors text-left"
              >
                <FolderIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{path.split("/").pop()}</p>
                  <p className="text-xs text-muted-foreground truncate">{path}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state for no recent projects */}
      {(!recentProjects || recentProjects.length === 0) && (
        <div className="text-center text-muted-foreground mt-8">
          <p className="text-sm">No recent projects</p>
          <p className="text-xs">Create or open a project to get started</p>
        </div>
      )}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Project</CardTitle>
              <CardDescription>Create a new LaTeX project from a template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Paper"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Default location can be changed in Settings
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="Select project location"
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                  />
                  <button
                    onClick={handleBrowseLocation}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent whitespace-nowrap"
                  >
                    Browse
                  </button>
                </div>
                {projectPath && projectName && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                    📁 {projectPath}/{projectName.replace(/\s+/g, "-")}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} - {tmpl.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateProject}
                  disabled={isCreating || !projectName || !projectPath}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setShowNewProjectDialog(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
