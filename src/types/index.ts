import { Role, SiteStatus } from '@prisma/client'

export type { Role, SiteStatus }

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: Date
}

export interface Site {
  id: string
  name: string
  location: string
  status: SiteStatus
  description?: string | null
  expectedRevenue?: number | null
  startDate?: Date | null
  expectedEndDate?: Date | null
  createdAt: Date
  totalBudget?: number
  totalSpent?: number
  remainingBudget?: number
}

export interface DailyRecord {
  id: string
  siteId: string
  date: Date
  totalLabour: number
  totalMaterial: number
  totalOther: number
  grandTotal: number
  notes?: string | null
  createdById: string
  createdAt: Date
  site?: Site
  createdBy?: User
}

export interface Labour {
  id: string
  name: string
  designation: string
  dailyWage: number
  overtimeRate: number
  active: boolean
}

export interface Material {
  id: string
  name: string
  unit: string
  defaultRate: number
  category: string
}

export interface BudgetEntry {
  id: string
  siteId: string
  amount: number
  note?: string | null
  createdById: string
  createdAt: Date
  createdBy?: User
}

export interface KPIData {
  totalSites: number
  activeSites: number
  todayExpense: number
  monthlyExpense: number
  totalBudget: number
  totalSpent: number
  remainingBudget: number
}

export interface MonthlyTrend {
  month: string
  labour: number
  material: number
  other: number
  total: number
}

export interface ActionResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Next-auth session extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }
}
