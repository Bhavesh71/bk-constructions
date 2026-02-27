'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { materialSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

export async function getMaterials() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return prisma.material.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function getMaterialsWithStats() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const materials = await prisma.material.findMany({
    include: {
      materialEntries: {
        include: {
          dailyRecord: { select: { date: true, site: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return materials.map((m) => ({
    ...m,
    totalSpent: m.materialEntries.reduce((sum, e) => sum + e.total, 0),
    totalQuantity: m.materialEntries.reduce((sum, e) => sum + e.quantity, 0),
    usageCount: m.materialEntries.length,
  }))
}

export async function createMaterial(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = materialSchema.parse(data)
    const material = await prisma.material.create({ data: parsed })

    revalidatePath('/materials')
    return { success: true, data: { id: material.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create material' }
  }
}

export async function updateMaterial(id: string, data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = materialSchema.parse(data)
    await prisma.material.update({ where: { id }, data: parsed })

    revalidatePath('/materials')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update material' }
  }
}

export async function deleteMaterial(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.material.delete({ where: { id } })

    revalidatePath('/materials')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete material' }
  }
}
