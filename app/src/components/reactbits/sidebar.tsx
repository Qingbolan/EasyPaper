
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type SidebarContextValue = {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
  expandedWidth: number
  collapsedWidth: number
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useRBSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error("useRBSidebar must be used within RBSidebarProvider")
  return ctx
}

export function RBSidebarProvider({
  children,
  expandedWidth = 260,
  collapsedWidth = 64,
}: {
  children: React.ReactNode
  expandedWidth?: number
  collapsedWidth?: number
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      const v = localStorage.getItem("rb_sidebar_collapsed")
      return v === "1"
    } catch {
      return false
    }
  })

  const applyWidthVar = useCallback(
    (isCollapsed: boolean) => {
      const w = isCollapsed ? collapsedWidth : expandedWidth
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--rb-sidebar-width", `${w}px`)
      }
    },
    [collapsedWidth, expandedWidth],
  )

  useEffect(() => {
    applyWidthVar(collapsed)
    try {
      localStorage.setItem("rb_sidebar_collapsed", collapsed ? "1" : "0")
    } catch {}
  }, [collapsed, applyWidthVar])

  useEffect(() => {
    // Ensure initial var is set on mount
    applyWidthVar(collapsed)
  }, [])

  const toggle = useCallback(() => setCollapsed((v) => !v), [])

  const value = useMemo(
    () => ({ collapsed, toggle, setCollapsed, expandedWidth, collapsedWidth }),
    [collapsed, toggle, expandedWidth, collapsedWidth],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function RBSidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  // The aside visual shell; width driven by CSS var and transitions
  return (
    <aside
      className={className}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "var(--rb-sidebar-width)",
        height: "100vh",
        zIndex: 30,
        overflow: "hidden",
        borderRight: "1px solid var(--sidebar-border)",
        background: "var(--sidebar)",
        transition: "width 200ms ease",
      }}
    >
      {children}
      <RBSidebarToggleFloating />
    </aside>
  )
}

export function RBSidebarToggleFloating() {
  const { collapsed, toggle } = useRBSidebar()

  const handleClick = () => {
    console.log('🔘 Sidebar toggle button clicked!')
    console.log('Current collapsed state:', collapsed)
    toggle()
    console.log('Toggle function called, new state should be:', !collapsed)
  }

  // Only show arrow in expanded state (for collapsing)
  if (collapsed) {
    return null
  }

  return (
    <button
      aria-label="Collapse sidebar"
      onClick={handleClick}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid var(--sidebar-border)",
        background: "color-mix(in oklab, var(--sidebar), transparent 10%)",
        color: "var(--sidebar-foreground)",
        zIndex: 100,
        cursor: "pointer",
      }}
      className="fluent-transition hover:opacity-80"
    >
      ←
    </button>
  )
}

export function RBMainOffset({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        marginLeft: "var(--rb-sidebar-width)",
        transition: "margin-left 200ms ease",
      }}
    >
      {children}
    </div>
  )
}

