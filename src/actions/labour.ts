'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { labourSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

export async function getLabours() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return prisma.labour.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
}

export async function getLabourWithStats() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const labours = await prisma.labour.findMany({
    include: {
      labourEntries: {
        include: {
          dailyRecord: { select: { date: true, site: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })

  return labours.map((l) => ({
    ...l,
    totalEarnings: l.labourEntries.reduce((sum, e) => sum + e.cost, 0),
    daysWorked: l.labourEntries.filter((e) => e.present).length,
    recentEntries: l.labourEntries.slice(0, 5),
  }))
}

export async function createLabour(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = labourSchema.parse(data)
    const labour = await prisma.labour.create({ data: parsed })

    revalidatePath('/labour')
    return { success: true, data: { id: labour.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create labour' }
  }
}

export async function updateLabour(id: string, data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = labourSchema.parse(data)
    await prisma.labour.update({ where: { id }, data: parsed })

    revalidatePath('/labour')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update labour' }
  }
}

export async function deleteLabour(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.labour.delete({ where: { id } })

    revalidatePath('/labour')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete labour' }
  }
}
