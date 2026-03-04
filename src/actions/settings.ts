'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import type { ActionResponse } from '@/types'

// ─── Password ──────────────────────────────────────────────────────────────
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { success: false, error: 'User not found' }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return { success: false, error: 'Current password is incorrect' }

    if (newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters' }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to change password' }
  }
}

// ─── App Settings (DB) ─────────────────────────────────────────────────────
export async function getAppSettings() {
  // Get the single settings row, create if not exists
  let settings = await prisma.appSettings.findFirst()
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        companyName: 'BK Constructions',
        companyTagline: 'Operations',
        currency: 'INR',
      },
    })
  }
  return settings
}

export async function updateAppSettings(
  data: Partial<{
    companyName: string
    companyTagline: string
    logoUrl: string
    currency: string
    address: string
    phone: string
    email: string
    gstNumber: string
    contactPerson: string
  }>
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized — Admin only' }

    let settings = await prisma.appSettings.findFirst()
    if (!settings) {
      await prisma.appSettings.create({ data: { ...data, companyName: data.companyName || 'BK Constructions' } })
    } else {
      await prisma.appSettings.update({ where: { id: settings.id }, data })
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update settings' }
  }
}

// ─── User theme preference ─────────────────────────────────────────────────
export async function saveUserTheme(theme: 'light' | 'dark'): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { theme },
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save theme' }
  }
}

// ─── Stats for admin settings ──────────────────────────────────────────────
export async function getBusinessStats() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const [
    totalSites,
    activeSites,
    budgetSum,
    spentAgg,
    labourAgg,
    materialAgg,
    totalRecords,
    totalWorkers,
    totalMaterials,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: 'ACTIVE' } }),
    prisma.budgetEntry.aggregate({
      _sum: { amount: true },
      where: { isVoided: false },
    }),
    prisma.dailyRecord.aggregate({ _sum: { grandTotal: true } }),
    prisma.dailyRecord.aggregate({ _sum: { totalLabour: true } }),
    prisma.dailyRecord.aggregate({ _sum: { totalMaterial: true } }),
    prisma.dailyRecord.count(),
    prisma.labour.count({ where: { active: true } }),
    prisma.material.count(),
  ])

  return {
    totalSites,
    activeSites,
    totalBudget: budgetSum._sum.amount || 0,
    totalSpent: spentAgg._sum.grandTotal || 0,
    totalLabourPaid: labourAgg._sum.totalLabour || 0,
    totalMaterialSpent: materialAgg._sum.totalMaterial || 0,
    totalRecords,
    totalWorkers,
    totalMaterials,
  }
}

// ─── Stats for supervisor settings ────────────────────────────────────────
export async function getSupervisorStats() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const userId = session.user.id

  const [assignedSites, recentRecords] = await Promise.all([
    prisma.siteUser.findMany({
      where: { userId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            location: true,
            status: true,
          },
        },
      },
    }),
    prisma.dailyRecord.count({
      where: { createdById: userId },
    }),
  ])

  return {
    assignedSites: assignedSites.map((su) => su.site),
    totalRecordsCreated: recentRecords,
  }
}
