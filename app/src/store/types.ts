// Brand Information Types
export interface BrandInfo {
  id: string
  name: string
  website: string
  industry: string
  founded: string
  tagline: string
  description: string
  logo?: string
}

// Product Types
export interface Product {
  id: string
  name: string
  category: string
  description: string
  status: "active" | "inactive"
  visibilityScore: number
  mentions: number
  citations: number
}

// Competitor Types
export interface Competitor {
  id: string
  name: string
  category: string
  website: string
  status: "monitoring" | "inactive"
}

// Key Message Types
export interface KeyMessage {
  id: string
  title: string
  content: string
  priority: "high" | "medium" | "low"
}

// Settings Types
export interface BrandSettings {
  aiMonitoring: boolean
  autoUpdateBrandInfo: boolean
  sentimentAlerts: boolean
}
