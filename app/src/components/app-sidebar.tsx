import { Link, useLocation } from "react-router-dom"
import { GlobeIcon } from "@/components/icons"
import { Home, FileEdit, Settings as SettingsIcon, PanelLeftIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRBSidebar } from "@/components/reactbits/sidebar"

export function AppSidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { locale, setLocale, t } = useI18n()
  const { collapsed, toggle } = useRBSidebar()

  const navigation = [
    {
      name: t("nav.welcome"),
      href: "/",
      icon: Home,
    },
    {
      name: t("nav.projects"),
      href: "/easypaper/projects",
      icon: FileEdit,
    },
    {
      name: t("nav.settings"),
      href: "/easypaper/settings",
      icon: SettingsIcon,
    },
  ]

  const toggleLocale = () => {
    setLocale(locale === "en" ? "zh" : "en")
  }

  return (
    <div
      className="flex h-full w-full flex-col border-r relative overflow-hidden"
      style={{
        backgroundColor: 'var(--colorNeutralBackground2)',
        borderColor: 'var(--colorNeutralStroke2)',
      }}
    >
      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center justify-between border-b border-sidebar-border transition-all",
          collapsed ? "px-2 cursor-pointer hover:bg-sidebar-accent" : "px-4"
        )}
        onClick={collapsed ? toggle : undefined}
      >
        <div className={cn(
          "flex items-center gap-3 flex-1 min-w-0",
          collapsed && "justify-center"
        )}>
          <div className="relative h-8 w-8 flex-shrink-0">
            <img
              src="/logo.png"
              alt="EasyPaper Logo"
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold whitespace-nowrap overflow-hidden">
              EasyPaper
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto overscroll-y-contain">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href === "/easypaper/projects" && pathname.startsWith("/easypaper/project/"))
          return (
            <Link
              key={item.name}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group flex items-center rounded-lg py-2.5 text-sm font-medium fluent-transition",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-primary/10 text-primary fluent-shadow-xs"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4">
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* Language Toggle */}
      <div className="p-4">
        <button
          onClick={toggleLocale}
          title={collapsed ? (locale === "en" ? "中文" : "English") : undefined}
          className={cn(
            "w-full gap-2 transition-all px-3 py-2 rounded-lg border border-border hover:bg-accent",
            collapsed ? "justify-center px-2" : "justify-start flex items-center"
          )}
        >
          <GlobeIcon className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>{locale === "en" ? "中文" : "English"}</span>}
        </button>
      </div>
      </div>
    </div>
  )
}
