import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useProjectStore } from "@/store"
import { open } from "@tauri-apps/plugin-dialog"
import { ArrowLeftIcon, FolderIcon, CheckIcon } from "lucide-react"
import { getDefaultProjectLocation } from "@/lib/paths"

export default function SettingsPage() {
  const navigate = useNavigate()
  const { defaultProjectLocation, setDefaultProjectLocation } = useProjectStore()
  const [tempLocation, setTempLocation] = useState(defaultProjectLocation)
  const [isSaved, setIsSaved] = useState(false)

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Default Project Location",
        defaultPath: tempLocation || defaultProjectLocation,
      })

      if (selected && typeof selected === "string") {
        setTempLocation(selected)
        setIsSaved(false)
      }
    } catch (error) {
      console.error("Failed to browse location:", error)
    }
  }

  const handleSave = () => {
    if (tempLocation) {
      setDefaultProjectLocation(tempLocation)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }

  const handleReset = async () => {
    const defaultLoc = await getDefaultProjectLocation()
    setTempLocation(defaultLoc)
    setDefaultProjectLocation(defaultLoc)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-8">
        <div className="space-y-8">
          {/* Project Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Project Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Default Project Location
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  New projects will be created in this directory by default
                </p>

                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2 border border-border rounded-md bg-muted/30 flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">
                      {tempLocation || defaultProjectLocation || "Not set"}
                    </span>
                  </div>
                  <button
                    onClick={handleBrowse}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Browse
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSave}
                    disabled={tempLocation === defaultProjectLocation}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaved ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Editor Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Editor Settings</h2>
            <p className="text-sm text-muted-foreground">
              Editor settings will be added in future updates
            </p>
          </section>

          {/* Build Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Build Settings</h2>
            <p className="text-sm text-muted-foreground">
              Build engine preferences will be available soon
            </p>
          </section>

          {/* About */}
          <section className="pt-8 border-t border-border">
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>EasyPaper</strong> v0.1.0
              </p>
              <p className="text-muted-foreground">
                A modern LaTeX editor with AI-powered features
              </p>
              <p className="text-muted-foreground">
                Built with Tauri, React, and Rust
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
