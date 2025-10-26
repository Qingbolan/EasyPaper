import { useState } from "react"
import { FileIcon, SearchIcon, GitBranchIcon, PackageIcon } from "lucide-react"
import { FileTree } from "./FileTree"
import { FileInfo } from "@/ipc"

interface SidebarTabsProps {
  onFileSelect: (file: FileInfo) => void
}

type TabId = "files" | "search" | "git" | "extensions"

interface Tab {
  id: TabId
  icon: React.ReactNode
  label: string
  content: React.ReactNode
}

export function SidebarTabs({ onFileSelect }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("files")

  const tabs: Tab[] = [
    {
      id: "files",
      icon: <FileIcon className="w-4 h-4" />,
      label: "Explorer",
      content: <FileTree onFileSelect={onFileSelect} />
    },
    {
      id: "search",
      icon: <SearchIcon className="w-4 h-4" />,
      label: "Search",
      content: (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Search functionality coming soon</p>
        </div>
      )
    },
    {
      id: "git",
      icon: <GitBranchIcon className="w-4 h-4" />,
      label: "Source Control",
      content: (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Git integration coming soon</p>
        </div>
      )
    },
    {
      id: "extensions",
      icon: <PackageIcon className="w-4 h-4" />,
      label: "Extensions",
      content: (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Extensions coming soon</p>
        </div>
      )
    },
  ]

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons - horizontal bar on top */}
      <div className="flex items-center justify-center gap-1 px-4 h-10 bg-card border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              p-1.5 rounded transition-all relative
              ${
                activeTab === tab.id
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }
            `}
            title={tab.label}
          >
            {tab.icon}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-cyan-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTabContent}
      </div>
    </div>
  )
}
