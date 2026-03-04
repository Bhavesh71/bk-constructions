'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dailyRecordSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

export async function getDailyRecord(siteId: string, date: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const record = await prisma.dailyRecord.findUnique({
    where: { siteId_date: { siteId, date: new Date(date) } },
    include: {
      labourEntries: { include: { labour: true } },
      materialEntries: { include: { material: true } },
      otherExpenses: true,
      createdBy: { select: { name: true } },
    },
  })

  return record
}

export async function getDailyRecords(siteId?: string, limit = 50) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'

  return prisma.dailyRecord.findMany({
    where: {
      ...(siteId ? { siteId } : {}),
      ...(!isAdmin ? { site: { assignedUsers: { some: { userId: session.user.id } } } } : {}),
    },
    select: {
      id: true, date: true, totalLabour: true, totalMaterial: true,
      totalOther: true, grandTotal: true, notes: true, siteId: true, createdAt: true,
      site: { select: { name: true, location: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
}

export async function getFullDailyRecords(filters: {
  siteId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'
  const where: any = {
    ...(!isAdmin ? { site: { assignedUsers: { some: { userId: session.user.id } } } } : {}),
  }

  if (filters.siteId) where.siteId = filters.siteId
  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo)
  }

  return prisma.dailyRecord.findMany({
    where,
    include: {
      site: { select: { name: true, location: true } },
      createdBy: { select: { name: true } },
      labourEntries: {
        include: { labour: { select: { name: true, designation: true } } },
      },
      materialEntries: {
        include: { material: { select: { name: true, unit: true, category: true } } },
      },
      otherExpenses: true,
    },
    orderBy: { date: 'desc' },
    take: filters.limit || 500,
  })
}

// ─── Save / Update daily record — OT removed, rate is now stored per entry ─
export async function saveDailyRecord(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const parsed = dailyRecordSchema.parse(data)
    const dateObj = new Date(parsed.date)

    let totalLabour = 0
    const labourEntriesData = parsed.labourEntries
      .filter((e) => e.present)
      .map((entry) => {
        // Use the rate sent from the client (which was pre-filled from Labour.dailyWage but can be edited)
        const rate = (entry as any).rate ?? 0
        const cost = rate
        totalLabour += cost
        return {
          labourId: entry.labourId,
          present: true,
          rate,
          cost,
        }
      })

    let totalMaterial = 0
    const materialEntriesData = parsed.materialEntries.map((entry) => {
      const total = entry.quantity * entry.rate
      totalMaterial += total
      return { materialId: entry.materialId, quantity: entry.quantity, rate: entry.rate, total }
    })

    let totalOther = 0
    const otherExpensesData = parsed.otherExpenses.map((entry) => {
      totalOther += entry.amount
      return entry
    })

    const grandTotal = totalLabour + totalMaterial + totalOther

    const record = await prisma.$transaction(async (tx) => {
      // Delete existing record for same site+date (upsert via delete+create)
      await tx.dailyRecord.deleteMany({ where: { siteId: parsed.siteId, date: dateObj } })
      return tx.dailyRecord.create({
        data: {
          siteId: parsed.siteId,
          date: dateObj,
          totalLabour,
          totalMaterial,
          totalOther,
          grandTotal,
          notes: parsed.notes,
          createdById: session.user.id,
          labourEntries: { create: labourEntriesData },
          materialEntries: { create: materialEntriesData },
          otherExpenses: { create: otherExpensesData },
        },
      })
    })

    revalidatePath('/daily-entry')
    revalidatePath(`/sites/${parsed.siteId}`)
    revalidatePath('/dashboard')
    revalidatePath('/records')
    return { success: true, data: { id: record.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save daily record' }
  }
}

export async function deleteDailyRecord(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const record = await prisma.dailyRecord.delete({ where: { id } })
    revalidatePath('/daily-entry')
    revalidatePath(`/sites/${record.siteId}`)
    revalidatePath('/dashboard')
    revalidatePath('/records')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete record' }
  }
}

// ─── Dashboard — all queries parallelized ─────────────────────────────────
export async function getDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'
  const siteWhere = isAdmin ? {} : { assignedUsers: { some: { userId: session.user.id } } }
  const recordWhere = isAdmin ? {} : { site: { assignedUsers: { some: { userId: session.user.id } } } }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)

  const [
    totalSites,
    activeSites,
    budgetAggregate,
    spentAggregate,
    todayExpense,
    monthlyExpense,
    monthlyRecords,
    recentRecords,
    sitesForChart,
  ] = await Promise.all([
    prisma.site.count({ where: siteWhere }),
    prisma.site.count({ where: { ...siteWhere, status: 'ACTIVE' } }),
    // Exclude voided budget entries from totals
    prisma.budgetEntry.aggregate({
      where: { site: siteWhere, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.dailyRecord.aggregate({ where: recordWhere, _sum: { grandTotal: true } }),
    prisma.dailyRecord.aggregate({
      where: { ...recordWhere, date: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } },
      _sum: { grandTotal: true },
    }),
    prisma.dailyRecord.aggregate({
      where: { ...recordWhere, date: { gte: monthStart } },
      _sum: { grandTotal: true },
    }),
    prisma.dailyRecord.findMany({
      where: { ...recordWhere, date: { gte: sixMonthsAgo } },
      select: { date: true, totalLabour: true, totalMaterial: true, totalOther: true, grandTotal: true },
      orderBy: { date: 'asc' },
    }),
    prisma.dailyRecord.findMany({
      where: recordWhere,
      select: {
        id: true, date: true, totalLabour: true, totalMaterial: true, grandTotal: true,
        site: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.site.findMany({
      where: siteWhere,
      select: {
        id: true, name: true,
        budgetEntries: { select: { amount: true }, where: { isVoided: false } },
      },
      take: 10,
    }),
  ])

  const siteIds = sitesForChart.map((s) => s.id)
  const spentPerSite = siteIds.length > 0
    ? await prisma.dailyRecord.groupBy({
        by: ['siteId'],
        where: { siteId: { in: siteIds } },
        _sum: { grandTotal: true },
      })
    : []
  const spentMap = new Map(spentPerSite.map((s) => [s.siteId, s._sum.grandTotal || 0]))

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const trendMap = new Map<string, { labour: number; material: number; other: number; total: number }>()
  for (const r of monthlyRecords) {
    const d = new Date(r.date)
    const key = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    const ex = trendMap.get(key) || { labour: 0, material: 0, other: 0, total: 0 }
    trendMap.set(key, {
      labour: ex.labour + r.totalLabour,
      material: ex.material + r.totalMaterial,
      other: ex.other + r.totalOther,
      total: ex.total + r.grandTotal,
    })
  }

  return {
    kpi: {
      totalSites,
      activeSites,
      todayExpense: todayExpense._sum.grandTotal || 0,
      monthlyExpense: monthlyExpense._sum.grandTotal || 0,
      totalBudget: budgetAggregate._sum.amount || 0,
      totalSpent: spentAggregate._sum.grandTotal || 0,
      remainingBudget: (budgetAggregate._sum.amount || 0) - (spentAggregate._sum.grandTotal || 0),
    },
    monthlyTrend: Array.from(trendMap.entries()).map(([month, data]) => ({ month, ...data })),
    siteComparison: sitesForChart.map((site) => ({
      name: site.name.length > 14 ? site.name.substring(0, 14) + '…' : site.name,
      budget: site.budgetEntries.reduce((sum, b) => sum + b.amount, 0),
      spent: spentMap.get(site.id) || 0,
    })),
    recentRecords,
  }
}
