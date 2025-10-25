import { Link, useLocation } from "react-router-dom"
import { Breadcrumb } from "antd"
import { useI18n } from "@/lib/i18n"
import { useProjectStore } from "@/store"
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb"

export function BreadcrumbNav() {
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useI18n()
  const { projectName } = useProjectStore()

  const brandName = "EasyPaper"

  // Route name mapping
  const routeNames: Record<string, string> = {
    "/": t("nav.welcome"),
    "/settings": t("nav.settings"),
  }

  // Generate breadcrumb items
  const items: BreadcrumbItemType[] = []

  // Add brand name (always linked to home unless we're on home)
  if (pathname === "/") {
    items.push({
      title: brandName,
    })
  } else {
    items.push({
      title: <Link to="/">{brandName}</Link>,
    })

    // Handle different routes
    if (pathname.startsWith("/project/") && projectName) {
      // For project route, show project name (non-editable)
      items.push({
        title: projectName,
      })
    } else if (pathname === "/settings") {
      items.push({
        title: routeNames[pathname],
      })
    }
  }

  return (
    <Breadcrumb
      items={items}
      separator="/"
      style={{
        fontSize: '14px',
        color: '#888',
      }}
      className="[&_*]:!text-[#888] [&_a]:hover:!text-[#555]"
    />
  )
}
