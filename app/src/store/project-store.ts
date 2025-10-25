import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ProjectConfig, FileInfo } from "@/ipc"

interface ProjectState {
  // Current project
  projectDir: string | null
  projectName: string | null
  projectConfig: ProjectConfig | null

  // Project files
  files: FileInfo[]
  currentFile: string | null

  // Recent projects
  recentProjects: string[]

  // Settings
  defaultProjectLocation: string

  // Actions
  setProject: (dir: string, name: string, config: ProjectConfig) => void
  setProjectName: (name: string) => void
  closeProject: () => void
  setFiles: (files: FileInfo[]) => void
  setCurrentFile: (file: string | null) => void
  addRecentProject: (dir: string) => void
  clearRecentProjects: () => void
  setDefaultProjectLocation: (location: string) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      // Initial state
      projectDir: null,
      projectName: null,
      projectConfig: null,
      files: [],
      currentFile: null,
      recentProjects: [],
      defaultProjectLocation: "", // Will be set from localStorage or default

      // Actions
      setProject: (dir, name, config) =>
        set({
          projectDir: dir,
          projectName: name,
          projectConfig: config,
        }),

      setProjectName: (name) => set((state) => ({
        projectName: name,
        projectConfig: state.projectConfig ? { ...state.projectConfig, name } : null,
      })),

      closeProject: () =>
        set({
          projectDir: null,
          projectName: null,
          projectConfig: null,
          files: [],
          currentFile: null,
        }),

      setFiles: (files) => set({ files }),

      setCurrentFile: (file) => set({ currentFile: file }),

      addRecentProject: (dir) =>
        set((state) => ({
          recentProjects: [
            dir,
            ...state.recentProjects.filter((p) => p !== dir),
          ].slice(0, 10),
        })),

      clearRecentProjects: () => set({ recentProjects: [] }),

      setDefaultProjectLocation: (location) =>
        set({ defaultProjectLocation: location }),
    }),
    {
      name: "project-storage",
      partialize: (state) => ({
        recentProjects: state.recentProjects,
        defaultProjectLocation: state.defaultProjectLocation,
      }),
    }
  )
)
