'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'
import type { ActionResponse } from '@/types'

export async function getUsers() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') throw new Error('Unauthorized')

  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createUser(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const parsed = userSchema.parse(data)
    const hashedPassword = await bcrypt.hash(parsed.password, 12)

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } })
    if (existing) return { success: false, error: 'Email already in use' }

    const user = await prisma.user.create({
      data: { ...parsed, password: hashedPassword },
    })

    revalidatePath('/users')
    return { success: true, data: { id: user.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create user' }
  }
}

export async function updateUser(id: string, data: { name: string; role: string }): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.user.update({
      where: { id },
      data: { name: data.name, role: data.role as any },
    })

    revalidatePath('/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user' }
  }
}

export async function deleteUser(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    if (id === session.user.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    await prisma.user.delete({ where: { id } })

    revalidatePath('/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete user' }
  }
}
