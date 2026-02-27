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

  const dateObj = new Date(date)

  const record = await prisma.dailyRecord.findUnique({
    where: { siteId_date: { siteId, date: dateObj } },
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

  const records = await prisma.dailyRecord.findMany({
    where: siteId ? { siteId } : undefined,
    include: {
      site: { select: { name: true, location: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })

  return records
}

export async function saveDailyRecord(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const parsed = dailyRecordSchema.parse(data)
    const dateObj = new Date(parsed.date)

    // Get labour data for cost calculation
    const labourIds = parsed.labourEntries.filter((e) => e.present).map((e) => e.labourId)
    const labourData = await prisma.labour.findMany({ where: { id: { in: labourIds } } })
    const labourMap = new Map(labourData.map((l) => [l.id, l]))

    // Calculate totals
    let totalLabour = 0
    const labourEntriesData = parsed.labourEntries
      .filter((e) => e.present)
      .map((entry) => {
        const labour = labourMap.get(entry.labourId)
        if (!labour) throw new Error(`Labour not found: ${entry.labourId}`)
        const cost = labour.dailyWage + entry.overtimeHours * labour.overtimeRate
        totalLabour += cost
        return {
          labourId: entry.labourId,
          present: entry.present,
          overtimeHours: entry.overtimeHours,
          cost,
        }
      })

    let totalMaterial = 0
    const materialEntriesData = parsed.materialEntries.map((entry) => {
      const total = entry.quantity * entry.rate
      totalMaterial += total
      return {
        materialId: entry.materialId,
        quantity: entry.quantity,
        rate: entry.rate,
        total,
      }
    })

    let totalOther = 0
    const otherExpensesData = parsed.otherExpenses.map((entry) => {
      totalOther += entry.amount
      return entry
    })

    const grandTotal = totalLabour + totalMaterial + totalOther

    // Use transaction to ensure atomicity
    const record = await prisma.$transaction(async (tx) => {
      // Delete existing record if it exists (for editing)
      await tx.dailyRecord.deleteMany({
        where: { siteId: parsed.siteId, date: dateObj },
      })

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
    return { success: true, data: { id: record.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save daily record' }
  }
}

export async function deleteDailyRecord(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const record = await prisma.dailyRecord.delete({ where: { id } })

    revalidatePath('/daily-entry')
    revalidatePath(`/sites/${record.siteId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete record' }
  }
}

export async function getDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'

  const siteWhere = isAdmin
    ? {}
    : { assignedUsers: { some: { userId: session.user.id } } }

  const [totalSites, activeSites, sites, monthlyRecords, recentRecords] = await Promise.all([
    prisma.site.count({ where: siteWhere }),
    prisma.site.count({ where: { ...siteWhere, status: 'ACTIVE' } }),
    prisma.site.findMany({
      where: siteWhere,
      include: {
        budgetEntries: { select: { amount: true } },
        dailyRecords: { select: { grandTotal: true, totalLabour: true, totalMaterial: true, totalOther: true, date: true } },
      },
    }),
    prisma.dailyRecord.findMany({
      where: {
        date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) },
        ...(isAdmin ? {} : { site: { assignedUsers: { some: { userId: session.user.id } } } }),
      },
      select: { date: true, grandTotal: true, totalLabour: true, totalMaterial: true, totalOther: true },
    }),
    prisma.dailyRecord.findMany({
      where: isAdmin ? {} : { site: { assignedUsers: { some: { userId: session.user.id } } } },
      include: {
        site: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  // Today's expense
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayExpense = await prisma.dailyRecord.aggregate({
    where: {
      date: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
      ...(isAdmin ? {} : { site: { assignedUsers: { some: { userId: session.user.id } } } }),
    },
    _sum: { grandTotal: true },
  })

  // Monthly expense (current month)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthlyExpense = await prisma.dailyRecord.aggregate({
    where: {
      date: { gte: monthStart },
      ...(isAdmin ? {} : { site: { assignedUsers: { some: { userId: session.user.id } } } }),
    },
    _sum: { grandTotal: true },
  })

  const totalBudget = sites.reduce(
    (sum, s) => sum + s.budgetEntries.reduce((bs, b) => bs + b.amount, 0),
    0
  )
  const totalSpent = sites.reduce(
    (sum, s) => sum + s.dailyRecords.reduce((rs, r) => rs + r.grandTotal, 0),
    0
  )

  // Monthly trends
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const trendMap = new Map<string, { labour: number; material: number; other: number; total: number }>()

  for (const r of monthlyRecords) {
    const d = new Date(r.date)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    const existing = trendMap.get(key) || { labour: 0, material: 0, other: 0, total: 0 }
    trendMap.set(key, {
      labour: existing.labour + r.totalLabour,
      material: existing.material + r.totalMaterial,
      other: existing.other + r.totalOther,
      total: existing.total + r.grandTotal,
    })
  }

  const monthlyTrend = Array.from(trendMap.entries()).map(([month, data]) => ({ month, ...data }))

  // Site comparison
  const siteComparison = sites.map((site) => ({
    name: site.name.length > 15 ? site.name.substring(0, 15) + '…' : site.name,
    budget: site.budgetEntries.reduce((sum, b) => sum + b.amount, 0),
    spent: site.dailyRecords.reduce((sum, r) => sum + r.grandTotal, 0),
  }))

  return {
    kpi: {
      totalSites,
      activeSites,
      todayExpense: todayExpense._sum.grandTotal || 0,
      monthlyExpense: monthlyExpense._sum.grandTotal || 0,
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
    },
    monthlyTrend,
    siteComparison,
    recentRecords,
  }
}
