import { create } from "zustand"
import type { BuildResult } from "@/ipc"

interface OpenFile {
  path: string
  content: string
  isDirty: boolean
}

interface EditorState {
  // Open files
  openFiles: Map<string, OpenFile>
  activeFile: string | null

  // Editor settings
  fontSize: number
  wordWrap: boolean
  showLineNumbers: boolean

  // Build state
  isBuilding: boolean
  lastBuildResult: BuildResult | null

  // Preview state
  previewMode: "katex" | "pdf"
  pdfPath: string | null

  // Actions
  openFile: (path: string, content: string) => void
  closeFile: (path: string) => void
  updateFileContent: (path: string, content: string) => void
  markFileDirty: (path: string, isDirty: boolean) => void
  setActiveFile: (path: string | null) => void
  setFontSize: (size: number) => void
  setWordWrap: (wrap: boolean) => void
  setShowLineNumbers: (show: boolean) => void
  setBuilding: (building: boolean) => void
  setBuildResult: (result: BuildResult | null) => void
  setPreviewMode: (mode: "katex" | "pdf") => void
  setPdfPath: (path: string | null) => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  // Initial state
  openFiles: new Map(),
  activeFile: null,
  fontSize: 14,
  wordWrap: true,
  showLineNumbers: true,
  isBuilding: false,
  lastBuildResult: null,
  previewMode: "katex",
  pdfPath: null,

  // Actions
  openFile: (path, content) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles)
      newOpenFiles.set(path, { path, content, isDirty: false })
      return {
        openFiles: newOpenFiles,
        activeFile: path,
      }
    }),

  closeFile: (path) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles)
      newOpenFiles.delete(path)
      return {
        openFiles: newOpenFiles,
        activeFile: state.activeFile === path ? null : state.activeFile,
      }
    }),

  updateFileContent: (path, content) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles)
      const file = newOpenFiles.get(path)
      if (file) {
        newOpenFiles.set(path, { ...file, content, isDirty: true })
      }
      return { openFiles: newOpenFiles }
    }),

  markFileDirty: (path, isDirty) =>
    set((state) => {
      const newOpenFiles = new Map(state.openFiles)
      const file = newOpenFiles.get(path)
      if (file) {
        newOpenFiles.set(path, { ...file, isDirty })
      }
      return { openFiles: newOpenFiles }
    }),

  setActiveFile: (path) => set({ activeFile: path }),

  setFontSize: (size) => set({ fontSize: size }),

  setWordWrap: (wrap) => set({ wordWrap: wrap }),

  setShowLineNumbers: (show) => set({ showLineNumbers: show }),

  setBuilding: (building) => set({ isBuilding: building }),

  setBuildResult: (result) => set({ lastBuildResult: result }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  setPdfPath: (path) => set({ pdfPath: path }),
}))
