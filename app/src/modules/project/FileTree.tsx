import { useState } from "react"
import { useProjectStore } from "@/store"
import { FileInfo, fileDelete, fileRename, createDir, fileWrite, fileList } from "@/ipc"
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronRightIcon, ChevronDownIcon, FilePlusIcon, FolderPlusIcon, RefreshCwIcon, Trash2Icon, Edit2Icon, PencilIcon, CheckIcon, XIcon } from "lucide-react"
import { Dropdown } from "antd"
import type { MenuProps } from "antd"

interface FileTreeProps {
  onFileSelect: (file: FileInfo) => void
}

interface TreeNode {
  file: FileInfo
  children: TreeNode[]
  depth: number
}

export function FileTree({ onFileSelect }: FileTreeProps) {
  const { files, currentFile, projectDir, projectName, setFiles, setProjectName } = useProjectStore()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]))
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [editedProjectName, setEditedProjectName] = useState(projectName || "")

  // Refresh file list
  const refreshFiles = async () => {
    if (!projectDir) return
    try {
      const updatedFiles = await fileList(projectDir, true)
      setFiles(updatedFiles)
    } catch (error) {
      console.error("Failed to refresh files:", error)
    }
  }

  // Handle project name edit
  const handleStartEditProjectName = () => {
    setEditedProjectName(projectName || "")
    setIsEditingProjectName(true)
  }

  const handleSaveProjectName = () => {
    if (editedProjectName.trim() && editedProjectName.trim() !== projectName) {
      setProjectName(editedProjectName.trim())
      // Note: We don't update the URL to avoid route mismatch issues
      // The URL serves as the initial identifier, but the project name can be changed independently
    }
    setIsEditingProjectName(false)
  }

  const handleCancelEditProjectName = () => {
    setEditedProjectName(projectName || "")
    setIsEditingProjectName(false)
  }

  // Create new file
  const handleNewFile = async () => {
    if (!projectDir) return
    const fileName = prompt("Enter file name (e.g., chapter1.tex):")
    if (!fileName) return

    try {
      const filePath = `${projectDir}/${fileName}`
      await fileWrite(filePath, "", true)
      await refreshFiles()
    } catch (error) {
      console.error("Failed to create file:", error)
      alert(`Failed to create file: ${error}`)
    }
  }

  // Create new folder
  const handleNewFolder = async () => {
    if (!projectDir) return
    const folderName = prompt("Enter folder name:")
    if (!folderName) return

    try {
      const folderPath = `${projectDir}/${folderName}`
      await createDir(folderPath)
      await refreshFiles()
    } catch (error) {
      console.error("Failed to create folder:", error)
      alert(`Failed to create folder: ${error}`)
    }
  }

  // Delete file or folder
  const handleDelete = async (filePath: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return

    try {
      const fullPath = `${projectDir}/${filePath}`
      await fileDelete(fullPath)
      await refreshFiles()
    } catch (error) {
      console.error("Failed to delete:", error)
      alert(`Failed to delete: ${error}`)
    }
  }

  // Start renaming
  const handleStartRename = (filePath: string, fileName: string) => {
    setRenamingPath(filePath)
    setNewName(fileName)
  }

  // Confirm rename
  const handleRename = async (oldPath: string) => {
    if (!newName || !projectDir) return

    try {
      const pathParts = oldPath.split("/")
      pathParts[pathParts.length - 1] = newName
      const newPath = pathParts.join("/")

      const fullOldPath = `${projectDir}/${oldPath}`
      const fullNewPath = `${projectDir}/${newPath}`

      await fileRename(fullOldPath, fullNewPath)
      await refreshFiles()
      setRenamingPath(null)
    } catch (error) {
      console.error("Failed to rename:", error)
      alert(`Failed to rename: ${error}`)
    }
  }

  // Cancel rename
  const handleCancelRename = () => {
    setRenamingPath(null)
    setNewName("")
  }

  // Build tree structure from flat file list
  const buildTree = (fileList: FileInfo[]): TreeNode[] => {
    const tree: TreeNode[] = []
    const pathMap = new Map<string, TreeNode>()

    // Filter visible files
    const visibleFiles = fileList.filter(
      (f) => f.is_dir || f.name.endsWith(".tex") || f.name.endsWith(".bib") || f.name.endsWith(".cls") || f.name.endsWith(".sty")
    )

    // Sort: directories first, then alphabetically
    const sortedFiles = [...visibleFiles].sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1
      if (!a.is_dir && b.is_dir) return 1
      return a.name.localeCompare(b.name)
    })

    // Create nodes for all files
    sortedFiles.forEach((file) => {
      const node: TreeNode = {
        file,
        children: [],
        depth: file.path.split("/").filter(Boolean).length - 1
      }
      pathMap.set(file.path, node)
    })

    // Build parent-child relationships
    sortedFiles.forEach((file) => {
      const node = pathMap.get(file.path)!
      const pathParts = file.path.split("/").filter(Boolean)

      if (pathParts.length === 1) {
        // Root level file
        tree.push(node)
      } else {
        // Find parent
        const parentPath = pathParts.slice(0, -1).join("/")
        const parent = pathMap.get(parentPath)
        if (parent) {
          parent.children.push(node)
        } else {
          // If parent not found, add to root
          tree.push(node)
        }
      }
    })

    return tree
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const renderTree = (nodes: TreeNode[]): JSX.Element[] => {
    return nodes.map((node) => {
      const { file, children, depth } = node
      const isExpanded = expandedFolders.has(file.path)
      const isActive = currentFile === file.path
      const hasChildren = children.length > 0
      const isRenaming = renamingPath === file.path

      // Context menu items
      const menuItems: MenuProps['items'] = [
        {
          key: 'rename',
          label: 'Rename',
          icon: <Edit2Icon className="w-3.5 h-3.5" />,
          onClick: () => handleStartRename(file.path, file.name),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2Icon className="w-3.5 h-3.5" />,
          danger: true,
          onClick: () => handleDelete(file.path, file.name),
        },
      ]

      const fileElement = (
        <div
          onClick={() => {
            if (isRenaming) return
            if (file.is_dir && hasChildren) {
              toggleFolder(file.path)
            } else if (!file.is_dir) {
              onFileSelect(file)
            }
          }}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            transition-all
            ${!file.is_dir || hasChildren ? "cursor-pointer" : "cursor-default"}
            ${
              isActive
                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-2 border-cyan-500"
                : "hover:bg-accent/50 text-foreground border-l-2 border-transparent"
            }
          `}
          style={{ paddingLeft: `${depth * 16 + 10}px` }}
        >
          {file.is_dir && hasChildren ? (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </span>
          ) : (
            <span className="w-3.5" />
          )}

          {file.is_dir ? (
            isExpanded && hasChildren ? (
              <FolderOpenIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            ) : (
              <FolderIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            )
          ) : (
            <FileIcon className="w-4 h-4 flex-shrink-0" />
          )}

          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename(file.path)
                } else if (e.key === "Escape") {
                  handleCancelRename()
                }
              }}
              onBlur={() => handleRename(file.path)}
              className="flex-1 text-sm font-medium text-foreground bg-background border border-cyan-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate font-medium">{file.name}</span>
          )}
        </div>
      )

      return (
        <div key={file.path}>
          <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
            {fileElement}
          </Dropdown>

          {file.is_dir && isExpanded && hasChildren && (
            <div>{renderTree(children)}</div>
          )}
        </div>
      )
    })
  }

  const tree = buildTree(files)

  return (
    <div className="file-tree h-full flex flex-col bg-card">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-2">
        {isEditingProjectName ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="text"
              value={editedProjectName}
              onChange={(e) => setEditedProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSaveProjectName()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  handleCancelEditProjectName()
                }
              }}
              onBlur={handleSaveProjectName}
              className="flex-1 min-w-0 text-sm font-semibold text-foreground bg-background border border-cyan-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              autoFocus
            />
            <button
              onClick={handleSaveProjectName}
              className="p-1 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded transition-colors flex-shrink-0"
              title="Save (Enter)"
            >
              <CheckIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancelEditProjectName}
              className="p-1 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded transition-colors flex-shrink-0"
              title="Cancel (Esc)"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 group cursor-pointer flex-1 min-w-0"
            onClick={handleStartEditProjectName}
          >
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {projectName || "Project"}
            </h3>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <PencilIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleNewFile}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title="New File"
          >
            <FilePlusIcon className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            onClick={handleNewFolder}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title="New Folder"
          >
            <FolderPlusIcon className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            onClick={refreshFiles}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title="Refresh"
          >
            <RefreshCwIcon className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-0.5">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No files</p>
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>
    </div>
  )
}
