'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { siteSchema, budgetEntrySchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

export async function getSites() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'
  const siteWhere = isAdmin ? {} : { assignedUsers: { some: { userId: session.user.id } } }

  const [sites, budgetSums, spentSums, recordCounts] = await Promise.all([
    prisma.site.findMany({
      where: siteWhere,
      select: {
        id: true, name: true, location: true, status: true, description: true,
        startDate: true, expectedEndDate: true, expectedRevenue: true, createdAt: true,
        assignedUsers: { select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Only count non-voided budget entries
    prisma.budgetEntry.groupBy({
      by: ['siteId'],
      where: { site: siteWhere, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.dailyRecord.groupBy({
      by: ['siteId'],
      where: { site: siteWhere },
      _sum: { grandTotal: true },
    }),
    prisma.dailyRecord.groupBy({
      by: ['siteId'],
      where: { site: siteWhere },
      _count: { id: true },
    }),
  ])

  const budgetMap = new Map(budgetSums.map((b) => [b.siteId, b._sum.amount || 0]))
  const spentMap = new Map(spentSums.map((s) => [s.siteId, s._sum.grandTotal || 0]))
  const countMap = new Map(recordCounts.map((c) => [c.siteId, c._count.id]))

  return sites.map((site) => {
    const totalBudget = budgetMap.get(site.id) || 0
    const totalSpent = spentMap.get(site.id) || 0
    return {
      ...site,
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
      recordCount: countMap.get(site.id) || 0,
    }
  })
}

// BUG-5 FIX: Only ACTIVE sites for attendance/daily-entry dropdowns
export async function getActiveSites() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const isAdmin = session.user.role === 'ADMIN'
  const siteWhere = isAdmin
    ? { status: 'ACTIVE' as const }
    : { status: 'ACTIVE' as const, assignedUsers: { some: { userId: session.user.id } } }

  return prisma.site.findMany({
    where: siteWhere,
    select: { id: true, name: true, location: true, status: true },
    orderBy: { createdAt: 'desc' },
  })
}


export async function getSiteById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const [site, spentAgg, advanceAgg] = await Promise.all([
    prisma.site.findUnique({
      where: { id },
      include: {
        budgetEntries: {
          include: {
            createdBy: { select: { name: true } },
            editedBy: { select: { name: true } },
            voidedBy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        // Recent records for display — all records for totals handled separately
        // Include otherExpenses so per-row advance reclassification works in DailyRecordsTab
        dailyRecords: {
          orderBy: { date: 'desc' },
          take: 50,
          include: {
            createdBy: { select: { name: true } },
            otherExpenses: { select: { category: true, amount: true } },
          },
        },
        assignedUsers: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        _count: { select: { dailyRecords: true } },
      },
    }),
    // Aggregate ALL records for correct totals — not just the recent 50
    prisma.dailyRecord.aggregate({
      where: { siteId: id },
      _sum: { grandTotal: true, totalLabour: true, totalMaterial: true, totalOther: true },
    }),
    // Sum ALL advance amounts across this site — to reclassify Other → Labour
    prisma.otherExpense.aggregate({
      where: { dailyRecord: { siteId: id }, category: 'Advance' },
      _sum: { amount: true },
    }),
  ])

  if (!site) throw new Error('Site not found')

  // Supervisors can only view sites they are assigned to
  const isAdmin = session.user.role === 'ADMIN'
  const isAssigned = site.assignedUsers.some((su: any) => su.userId === session.user.id)
  if (!isAdmin && !isAssigned) throw new Error('Access denied')

  const totalBudget   = site.budgetEntries.filter((b) => !b.isVoided).reduce((sum, b) => sum + b.amount, 0)
  const totalSpent    = spentAgg._sum.grandTotal    ?? 0
  const advanceTotal  = advanceAgg._sum.amount      ?? 0

  // Reclassify advances: move them out of Other and into Labour so UI totals are accurate
  const totalLabour   = (spentAgg._sum.totalLabour   ?? 0) + advanceTotal
  const totalMaterial =  spentAgg._sum.totalMaterial ?? 0
  const totalOther    = (spentAgg._sum.totalOther    ?? 0) - advanceTotal

  return {
    ...site,
    totalBudget,
    totalSpent,
    remainingBudget: totalBudget - totalSpent,
    totalLabour,
    totalMaterial,
    totalOther,
  }
}

export async function createSite(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const parsed = siteSchema.parse(data)
    const site = await prisma.site.create({ data: parsed })
    revalidatePath('/sites')
    return { success: true, data: { id: site.id } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateSite(id: string, data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const parsed = siteSchema.parse(data)
    await prisma.site.update({ where: { id }, data: parsed })
    revalidatePath('/sites')
    revalidatePath(`/sites/${id}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Budget: Add ───────────────────────────────────────────────────────────
export async function addBudgetEntry(
  siteId: string,
  data: { amount: number; note?: string }
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Admin only' }

    const parsed = budgetEntrySchema.parse(data)
    await prisma.budgetEntry.create({
      data: { siteId, createdById: session.user.id, ...parsed },
    })
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Budget: Edit (Admin only) ─────────────────────────────────────────────
export async function editBudgetEntry(
  entryId: string,
  data: { amount: number; note?: string }
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Admin only' }

    const entry = await prisma.budgetEntry.findUnique({ where: { id: entryId } })
    if (!entry) return { success: false, error: 'Budget entry not found' }
    if (entry.isVoided) return { success: false, error: 'Cannot edit a voided entry' }

    const parsed = budgetEntrySchema.parse(data)
    await prisma.budgetEntry.update({
      where: { id: entryId },
      data: {
        amount: parsed.amount,
        note: parsed.note,
        editedById: session.user.id,
      },
    })

    revalidatePath(`/sites/${entry.siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Budget: Void / Soft-delete (Admin only, never hard-deletes) ──────────
export async function voidBudgetEntry(
  entryId: string,
  reason?: string
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Admin only' }

    const entry = await prisma.budgetEntry.findUnique({ where: { id: entryId } })
    if (!entry) return { success: false, error: 'Budget entry not found' }
    if (entry.isVoided) return { success: false, error: 'Already voided' }

    await prisma.budgetEntry.update({
      where: { id: entryId },
      data: {
        isVoided: true,
        voidedAt: new Date(),
        voidedById: session.user.id,
        voidReason: reason || null,
      },
    })

    revalidatePath(`/sites/${entry.siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function assignUserToSite(siteId: string, userId: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await prisma.siteUser.upsert({
      where: { siteId_userId: { siteId, userId } },
      create: { siteId, userId },
      update: {},
    })
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function removeUserFromSite(siteId: string, userId: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await prisma.siteUser.delete({ where: { siteId_userId: { siteId, userId } } })
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteSite(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.site.delete({ where: { id } })
    revalidatePath('/sites')
    return { success: true }
  } catch (error) {
    console.error('deleteSite error:', error)
    return { success: false, error: 'Failed to delete site' }
  }
}
