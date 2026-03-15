'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dailyRecordSchema, attendanceSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

// ─── Date helper ───────────────────────────────────────────────────────────
// All @db.Date values must be stored as UTC midnight.
// Using Date.UTC ensures timezone-independent round-trips to PostgreSQL.
function safeDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// ─── Get single record (for DailyEntryForm pre-fill) ──────────────────────
export async function getDailyRecord(siteId: string, date: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return prisma.dailyRecord.findUnique({
    where: { siteId_date: { siteId, date: safeDate(date) } },
    include: {
      labourEntries: {
        include: { labour: { select: { name: true, designation: true, labourType: true } } },
        orderBy: { createdAt: 'asc' },
      },
      materialEntries: { include: { material: true } },
      // Exclude Advance OtherExpenses from the Daily Entry form.
      // Advances are managed exclusively via the Labour page.
      // Showing them here would allow accidental deletion and corrupt budget totals.
      otherExpenses: { where: { category: { not: 'Advance' } } },
      // Include advances for the read-only summary display
      labourAdvances: {
        select: { id: true, amount: true, labour: { select: { name: true } } },
      },
      createdBy: { select: { name: true } },
    },
  })
}

// ─── Get records list (lightweight, for Records browser sidebar) ───────────
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

// ─── Get full records (for Records browser + Reports) ─────────────────────
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
    if (filters.dateFrom) where.date.gte = safeDate(filters.dateFrom)
    if (filters.dateTo)   where.date.lte = safeDate(filters.dateTo)
  }

  return prisma.dailyRecord.findMany({
    where,
    include: {
      site: { select: { name: true, location: true } },
      createdBy: { select: { name: true } },
      labourEntries: {
        include: { labour: { select: { name: true, designation: true } } },
        orderBy: { createdAt: 'asc' },
      },
      materialEntries: { include: { material: { select: { name: true, unit: true, category: true } } } },
      otherExpenses: true,
      labourAdvances: {
        include: { labour: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { date: 'desc' },
    take: filters.limit || 500,
  })
}

// ─── Save Expenses (materials + other only) ────────────────────────────────
// Labour attendance is saved via saveAttendance() — a separate flow.
//
// KEY RULES enforced here:
//  1. Advance OtherExpenses (category='Advance') are PRESERVED when updating —
//     they are owned by the Labour flow and must never be touched here.
//  2. totalLabour is NEVER modified here — it's set only in recordWeeklySalary().
//  3. grandTotal = totalMaterial + totalOther(incl advances) + totalLabour(paid wages)
export async function saveDailyRecord(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const parsed = dailyRecordSchema.parse(data)
    const dateObj = safeDate(parsed.date)

    let totalMaterial = 0
    const materialEntriesData = parsed.materialEntries.map((entry) => {
      const total = entry.quantity * entry.rate
      totalMaterial += total
      return { materialId: entry.materialId, quantity: entry.quantity, rate: entry.rate, total }
    })

    let totalOtherNew = 0
    const otherExpensesData = parsed.otherExpenses.map((entry) => {
      totalOtherNew += entry.amount
      return { category: entry.category, amount: entry.amount, description: entry.description }
    })

    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.dailyRecord.findUnique({
        where: { siteId_date: { siteId: parsed.siteId, date: dateObj } },
        select: { id: true, totalLabour: true },
      })

      if (existing) {
        // Delete non-advance expense entries and re-create from form data
        await tx.materialEntry.deleteMany({ where: { dailyRecordId: existing.id } })
        await tx.otherExpense.deleteMany({
          where: { dailyRecordId: existing.id, category: { not: 'Advance' } },
        })

        // Re-aggregate surviving Advance OtherExpenses so their total stays in grandTotal
        const advanceAgg = await tx.otherExpense.aggregate({
          where: { dailyRecordId: existing.id, category: 'Advance' },
          _sum: { amount: true },
        })
        const advanceTotal = advanceAgg._sum.amount || 0

        const totalOtherFinal = totalOtherNew + advanceTotal
        const grandTotal = totalMaterial + totalOtherFinal + existing.totalLabour

        await tx.dailyRecord.update({
          where: { id: existing.id },
          data: {
            totalMaterial,
            totalOther:    totalOtherFinal,
            grandTotal,
            notes:         parsed.notes,
            materialEntries: { create: materialEntriesData },
            otherExpenses:   { create: otherExpensesData },
          },
        })
        return { id: existing.id }
      } else {
        // New record — totalLabour starts at 0 (not paid yet)
        const grandTotal = totalMaterial + totalOtherNew
        const created = await tx.dailyRecord.create({
          data: {
            siteId:        parsed.siteId,
            date:          dateObj,
            totalLabour:   0,
            totalMaterial,
            totalOther:    totalOtherNew,
            grandTotal,
            notes:         parsed.notes,
            createdById:   session.user.id,
            materialEntries: { create: materialEntriesData },
            otherExpenses:   { create: otherExpensesData },
          },
        })
        return { id: created.id }
      }
    })

    revalidatePath('/daily-entry')
    revalidatePath(`/sites/${parsed.siteId}`)
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/reports')
    return { success: true, data: record }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save daily record' }
  }
}

// ─── Save Attendance (labour tracking) ────────────────────────────────────
// Creates/updates LabourEntry rows for a given site+date.
//
// KEY RULES:
//  • Does NOT touch totalLabour or grandTotal — those are updated only on payment.
//  • Never deletes PAID entries — paid wages cannot be un-tracked.
//  • Only absent workers (present=false) are excluded from LabourEntries.
export async function saveAttendance(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const parsed = attendanceSchema.parse(data)
    const dateObj = safeDate(parsed.date)
    const presentEntries = parsed.entries.filter((e) => e.present)

    const record = await prisma.$transaction(async (tx) => {
      let rec = await tx.dailyRecord.findUnique({
        where: { siteId_date: { siteId: parsed.siteId, date: dateObj } },
        select: { id: true },
      })

      if (!rec) {
        rec = await tx.dailyRecord.create({
          data: {
            siteId:       parsed.siteId,
            date:         dateObj,
            totalLabour:  0,
            totalMaterial: 0,
            totalOther:   0,
            grandTotal:   0,
            createdById:  session.user.id,
          },
        })
      }

      // Delete only UNPAID entries — paid entries have already been processed in salary
      await tx.labourEntry.deleteMany({
        where: { dailyRecordId: rec.id, isPaid: false },
      })

      // Fetch workers who already have a PAID entry on this record.
      // We must NOT create a new unpaid entry for them — doing so would cause
      // double-counting when recordWeeklySalary picks up the new unpaid entry.
      const alreadyPaid = await tx.labourEntry.findMany({
        where: { dailyRecordId: rec.id, isPaid: true },
        select: { labourId: true },
      })
      const paidLabourIds = new Set(alreadyPaid.map((e) => e.labourId))

      // Create entries only for present workers who are NOT already paid for this day.
      // Also deduplicate by labourId — guards against double-submit / React double-render
      // sending the same worker twice (no DB unique constraint exists to catch this).
      const seen = new Set<string>()
      const entriesToCreate = presentEntries.filter((e) => {
        if (paidLabourIds.has(e.labourId)) return false  // already paid — skip
        if (seen.has(e.labourId))          return false  // duplicate in input — skip
        seen.add(e.labourId)
        return true
      })

      if (entriesToCreate.length > 0) {
        await tx.labourEntry.createMany({
          data: entriesToCreate.map((e) => ({
            dailyRecordId: rec!.id,
            labourId:      e.labourId,
            present:       true,
            rate:          e.rate,
            cost:          e.rate,
            isPaid:        false,
          })),
          skipDuplicates: true,  // DB-level safety net
        })
      }

      return { id: rec.id }
    })

    revalidatePath('/labour')
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/reports')
    return { success: true, data: record }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save attendance' }
  }
}

// ─── Get attendance for a specific site+date ───────────────────────────────
export async function getAttendanceRecord(siteId: string, date: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return prisma.dailyRecord.findUnique({
    where: { siteId_date: { siteId, date: safeDate(date) } },
    select: {
      id: true,
      labourEntries: {
        where: { present: true },
        select: {
          labourId: true, rate: true, cost: true, isPaid: true,
          labour: { select: { name: true, designation: true } },
        },
      },
    },
  })
}

// ─── Delete record (Admin only) ────────────────────────────────────────────
export async function deleteDailyRecord(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const record = await prisma.dailyRecord.delete({ where: { id } })
    revalidatePath('/daily-entry')
    revalidatePath(`/sites/${record.siteId}`)
    revalidatePath('/sites', 'layout')
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/reports')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete record' }
  }
}

// ─── Dashboard data ────────────────────────────────────────────────────────
// Financial definitions:
//  • totalLabour  = paid wages only (updated on salary payment)
//  • totalOther   = other expenses + advances (advances hit immediately)
//  • grandTotal   = totalMaterial + totalOther + totalLabour
//  → "Today's expense" and "Monthly expense" reflect ACTUAL cash spent.
//    Unpaid wages (pending salary) are intentionally excluded.
export async function getDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'
  const siteWhere   = isAdmin ? {} : { assignedUsers: { some: { userId: session.user.id } } }
  const recordWhere = isAdmin ? {} : { site: { assignedUsers: { some: { userId: session.user.id } } } }

  // Use UTC date boundaries so they align with UTC-midnight stored records
  const now = new Date()
  const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate()
  const todayStart    = new Date(Date.UTC(y, mo, d))
  const tomorrowStart = new Date(Date.UTC(y, mo, d + 1))
  const monthStart    = new Date(Date.UTC(y, mo, 1))
  const sixMonthsAgo  = new Date(Date.UTC(y, mo - 5, 1))

  const [
    totalSites, activeSites, budgetAggregate, totalSpentAgg,
    todayExpenseAgg, monthlyExpenseAgg, monthlyTrendRecords,
    recentRecords, sitesForChart,
  ] = await Promise.all([
    prisma.site.count({ where: siteWhere }),
    prisma.site.count({ where: { ...siteWhere, status: 'ACTIVE' } }),
    prisma.budgetEntry.aggregate({ where: { site: siteWhere, isVoided: false }, _sum: { amount: true } }),
    prisma.dailyRecord.aggregate({ where: recordWhere, _sum: { grandTotal: true } }),
    prisma.dailyRecord.aggregate({
      where: { ...recordWhere, date: { gte: todayStart, lt: tomorrowStart } },
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
        id: true, date: true, totalLabour: true, totalMaterial: true,
        totalOther: true, grandTotal: true,
        site: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
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

  const totalSpent  = totalSpentAgg._sum.grandTotal || 0
  const totalBudget = budgetAggregate._sum.amount   || 0

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

  for (const r of monthlyTrendRecords) {
    const dt = new Date(r.date)
    // Use UTC month to match UTC-midnight stored dates
    const key = `${monthNames[dt.getUTCMonth()]} ${String(dt.getUTCFullYear()).slice(2)}`
    const ex = trendMap.get(key) || { labour: 0, material: 0, other: 0, total: 0 }
    trendMap.set(key, {
      labour:   ex.labour   + r.totalLabour,
      material: ex.material + r.totalMaterial,
      other:    ex.other    + r.totalOther,
      total:    ex.total    + r.grandTotal,
    })
  }

  return {
    kpi: {
      totalSites,
      activeSites,
      todayExpense:    todayExpenseAgg._sum.grandTotal   || 0,
      monthlyExpense:  monthlyExpenseAgg._sum.grandTotal || 0,
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
    },
    monthlyTrend:   Array.from(trendMap.entries()).map(([month, data]) => ({ month, ...data })),
    siteComparison: sitesForChart.map((site) => ({
      name:   site.name.length > 14 ? site.name.substring(0, 14) + '…' : site.name,
      budget: site.budgetEntries.reduce((sum, b) => sum + b.amount, 0),
      spent:  spentMap.get(site.id) || 0,
    })),
    recentRecords,
  }
}
