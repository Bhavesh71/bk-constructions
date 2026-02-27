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

  const sites = await prisma.site.findMany({
    where: isAdmin ? {} : {
      assignedUsers: { some: { userId: session.user.id } },
    },
    include: {
      budgetEntries: { select: { amount: true } },
      dailyRecords: { select: { grandTotal: true } },
      _count: { select: { dailyRecords: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return sites.map((site) => ({
    ...site,
    totalBudget: site.budgetEntries.reduce((sum, b) => sum + b.amount, 0),
    totalSpent: site.dailyRecords.reduce((sum, r) => sum + r.grandTotal, 0),
    remainingBudget:
      site.budgetEntries.reduce((sum, b) => sum + b.amount, 0) -
      site.dailyRecords.reduce((sum, r) => sum + r.grandTotal, 0),
    recordCount: site._count.dailyRecords,
  }))
}

export async function getSiteById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      budgetEntries: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      dailyRecords: {
        orderBy: { date: 'desc' },
        take: 30,
        include: {
          createdBy: { select: { name: true } },
        },
      },
      assignedUsers: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      _count: { select: { dailyRecords: true } },
    },
  })

  if (!site) throw new Error('Site not found')

  const totalBudget = site.budgetEntries.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = site.dailyRecords.reduce((sum, r) => sum + r.grandTotal, 0)

  return {
    ...site,
    totalBudget,
    totalSpent,
    remainingBudget: totalBudget - totalSpent,
  }
}

export async function createSite(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = siteSchema.parse(data)

    const site = await prisma.site.create({
      data: {
        ...parsed,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        expectedEndDate: parsed.expectedEndDate ? new Date(parsed.expectedEndDate) : null,
      },
    })

    revalidatePath('/sites')
    revalidatePath('/dashboard')
    return { success: true, data: { id: site.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create site' }
  }
}

export async function updateSite(id: string, data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = siteSchema.parse(data)

    await prisma.site.update({
      where: { id },
      data: {
        ...parsed,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        expectedEndDate: parsed.expectedEndDate ? new Date(parsed.expectedEndDate) : null,
      },
    })

    revalidatePath(`/sites/${id}`)
    revalidatePath('/sites')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update site' }
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
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete site' }
  }
}

export async function addBudgetEntry(data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = budgetEntrySchema.parse(data)

    await prisma.budgetEntry.create({
      data: {
        ...parsed,
        createdById: session.user.id,
      },
    })

    revalidatePath(`/sites/${parsed.siteId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add budget entry' }
  }
}

export async function assignUserToSite(siteId: string, userId: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.siteUser.create({ data: { siteId, userId } })
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to assign user' }
  }
}

export async function removeUserFromSite(siteId: string, userId: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.siteUser.deleteMany({ where: { siteId, userId } })
    revalidatePath(`/sites/${siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove user' }
  }
}
