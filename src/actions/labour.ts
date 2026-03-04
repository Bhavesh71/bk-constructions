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

  const [labours, earnings] = await Promise.all([
    prisma.labour.findMany({ orderBy: { name: 'asc' } }),
    prisma.labourEntry.groupBy({
      by: ['labourId'],
      where: { present: true },
      _sum: { cost: true },
      _count: { id: true },
    }),
  ])

  const earningsMap = new Map(earnings.map(e => [e.labourId, e]))

  return labours.map(l => ({
    ...l,
    totalEarnings: earningsMap.get(l.id)?._sum.cost || 0,
    daysWorked: earningsMap.get(l.id)?._count.id || 0,
  }))
}

export async function createLabour(data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const parsed = labourSchema.parse(data)
    await prisma.labour.create({ data: parsed })
    revalidatePath('/labour')
    revalidatePath('/daily-entry')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateLabour(id: string, data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const parsed = labourSchema.parse(data)
    await prisma.labour.update({ where: { id }, data: parsed })
    revalidatePath('/labour')
    revalidatePath('/daily-entry')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteLabour(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await prisma.labour.update({ where: { id }, data: { active: false } })
    revalidatePath('/labour')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
