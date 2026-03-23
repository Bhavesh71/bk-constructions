'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { labourSchema, labourAdvanceSchema, weeklySalarySchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'

// ─── Date helpers ──────────────────────────────────────────────────────────
// All @db.Date columns are stored as UTC midnight (Date.UTC).
// ALL arithmetic must stay in UTC to match stored values.

function safeDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * FIX: Use UTC day/date methods so week boundaries align with UTC-midnight
 * dates stored in the DB.  Previously local setHours(0,0,0,0) would shift
 * boundaries by the server's UTC offset (e.g. IST = UTC+5:30), causing wrong
 * records to fall in or outside the "this week" window.
 */
function getWeekBoundsUTC(refDate = new Date()) {
  const dayUTC  = refDate.getUTCDay()               // 0=Sun … 6=Sat
  const diffToMon = dayUTC === 0 ? -6 : 1 - dayUTC  // offset to Monday

  const weekStart = new Date(Date.UTC(
    refDate.getUTCFullYear(),
    refDate.getUTCMonth(),
    refDate.getUTCDate() + diffToMon,
  ))
  const weekEnd = new Date(Date.UTC(
    weekStart.getUTCFullYear(),
    weekStart.getUTCMonth(),
    weekStart.getUTCDate() + 6,
    23, 59, 59, 999,
  ))
  return { weekStart, weekEnd }
}

/** UTC-safe YYYY-MM-DD formatter used for weekStart/weekEnd display strings. */
function toDateStr(dt: Date): string {
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── OtherExpense ↔ LabourAdvance linkage helpers ─────────────────────────
//
// The schema has no FK between LabourAdvance and OtherExpense.
// FIX: We embed the LabourAdvance ID inside the OtherExpense description
//      using the marker "[ADV:<id>]".  This lets us do a PRECISE lookup
//      during edit/delete — even when multiple advances exist for the same
//      site+date.
//
// Legacy records (created before this convention) lack the marker; for those
// we fall back to matching on amount + labour name (best-effort).

function buildAdvanceDesc(advanceId: string, labourName: string, reason?: string | null): string {
  const base = `[ADV:${advanceId}] Advance to ${labourName}`
  return reason ? `${base} — ${reason}` : base
}

async function findLinkedOtherExpense(
  tx: any,
  dailyRecordId: string,
  advanceId: string,
  amount: number,
  labourName: string,
) {
  // Precise match — works for all records created with the new convention
  const precise = await tx.otherExpense.findFirst({
    where: {
      dailyRecordId,
      category: 'Advance',
      description: { contains: `[ADV:${advanceId}]` },
    },
  })
  if (precise) return precise

  // Legacy fallback: same amount + description contains worker name
  return tx.otherExpense.findFirst({
    where: {
      dailyRecordId,
      category: 'Advance',
      amount,
      description: { contains: labourName },
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── Get all ACTIVE workers with summary stats ────────────────────────────
export async function getLabours() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const { weekStart, weekEnd } = getWeekBoundsUTC()

  const [labours, weeklyAttendance, unpaidAttendance, pendingAdvances, actualEarnings] = await Promise.all([
    prisma.labour.findMany({
      where: { active: true },
      orderBy: [{ labourType: 'asc' }, { name: 'asc' }],
    }),
    prisma.labourEntry.groupBy({
      by: ['labourId'],
      where: { present: true, dailyRecord: { date: { gte: weekStart, lte: weekEnd } } },
      _sum: { cost: true },
      _count: { id: true },
    }),
    prisma.labourEntry.groupBy({
      by: ['labourId'],
      where: { present: true, isPaid: false },
      _sum: { cost: true },
      _count: { id: true },
    }),
    prisma.labourAdvance.groupBy({
      by: ['labourId'],
      where: { isSettled: false },
      _sum: { amount: true },
    }),
    prisma.weeklySalary.groupBy({
      by: ['labourId'],
      _sum: { netPaid: true },
    }),
  ])

  const weekMap     = new Map(weeklyAttendance.map((e) => [e.labourId, e]))
  const unpaidMap   = new Map(unpaidAttendance.map((e) => [e.labourId, e]))
  const advanceMap  = new Map(pendingAdvances.map((e) => [e.labourId, e._sum.amount || 0]))
  const earningsMap = new Map(actualEarnings.map((e) => [e.labourId, e._sum.netPaid || 0]))

  return labours.map((l) => ({
    ...l,
    totalEarnings:  earningsMap.get(l.id) || 0,
    unpaidDays:     unpaidMap.get(l.id)?._count.id || 0,
    unpaidWage:     unpaidMap.get(l.id)?._sum.cost  || 0,
    thisWeekDays:   weekMap.get(l.id)?._count.id    || 0,
    thisWeekWage:   weekMap.get(l.id)?._sum.cost    || 0,
    pendingAdvance: advanceMap.get(l.id) || 0,
  }))
}

export async function getAllLabours() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  return prisma.labour.findMany({
    orderBy: [{ active: 'desc' }, { labourType: 'asc' }, { name: 'asc' }],
  })
}

// ─── CRUD ──────────────────────────────────────────────────────────────────
export async function createLabour(data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }
    const parsed = labourSchema.parse(data)
    await prisma.labour.create({ data: parsed })
    revalidatePath('/labour')
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

export async function reactivateLabour(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }
    await prisma.labour.update({ where: { id }, data: { active: true } })
    revalidatePath('/labour')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Add Advance ───────────────────────────────────────────────────────────
// RULE: Advance payments MUST immediately appear in daily spending (OtherExpense).
// FIX:  Create the LabourAdvance FIRST to get its ID, then embed that ID in the
//       OtherExpense.description so edit/delete can find the exact record later.
export async function addLabourAdvance(data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const parsed = labourAdvanceSchema.parse(data)
    const labour = await prisma.labour.findUnique({
      where: { id: parsed.labourId },
      select: { name: true },
    })
    if (!labour) return { success: false, error: 'Worker not found' }

    if (!parsed.siteId || !parsed.date) {
      return { success: false, error: 'Site and date are required to record an advance' }
    }

    {
      const dateObj = safeDate(parsed.date)

      await prisma.$transaction(async (tx) => {
        // 1. Get or create DailyRecord for this site+date
        let rec = await tx.dailyRecord.findUnique({
          where: { siteId_date: { siteId: parsed.siteId!, date: dateObj } },
          select: { id: true, totalOther: true, totalMaterial: true, totalLabour: true },
        })
        if (!rec) {
          rec = await tx.dailyRecord.create({
            data: {
              siteId: parsed.siteId!,
              date: dateObj,
              totalLabour: 0,
              totalMaterial: 0,
              totalOther: 0,
              grandTotal: 0,
              createdById: session.user.id,
            },
          })
        }

        // 2. Create LabourAdvance first — we need its ID for the description
        const advance = await tx.labourAdvance.create({
          data: {
            labourId:      parsed.labourId,
            amount:        parsed.amount,
            reason:        parsed.reason,
            dailyRecordId: rec.id,
          },
        })

        // 3. Create OtherExpense with the advance ID embedded in description
        const desc = buildAdvanceDesc(advance.id, labour.name, parsed.reason)
        await tx.otherExpense.create({
          data: {
            dailyRecordId: rec.id,
            category:      'Advance',
            amount:        parsed.amount,
            description:   desc,
          },
        })

        // 4. Update DailyRecord totals
        const newTotalOther = rec.totalOther + parsed.amount
        await tx.dailyRecord.update({
          where: { id: rec.id },
          data: {
            totalOther: newTotalOther,
            grandTotal: rec.totalMaterial + newTotalOther + rec.totalLabour,
          },
        })
      }, { timeout: 15000 })
    }

    revalidatePath('/labour')
    revalidatePath('/daily-entry')
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/sites')
    if (parsed.siteId) revalidatePath(`/sites/${parsed.siteId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Edit Advance ──────────────────────────────────────────────────────────
// FIX: Uses findLinkedOtherExpense which does a PRECISE lookup by [ADV:<id>]
//      marker — no longer confused by multiple advances on the same day/site.
export async function editLabourAdvance(
  id: string,
  data: { amount: number; reason?: string },
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const advance = await prisma.labourAdvance.findUnique({
      where: { id },
      include: {
        dailyRecord: { select: { id: true, totalOther: true, totalMaterial: true, totalLabour: true } },
        labour: { select: { name: true } },
      },
    })
    if (!advance) return { success: false, error: 'Not found' }
    if (advance.isSettled) return { success: false, error: 'Cannot edit a settled advance' }

    const diff = data.amount - advance.amount

    await prisma.$transaction(async (tx) => {
      await tx.labourAdvance.update({
        where: { id },
        data: { amount: data.amount, reason: data.reason },
      })

      if (advance.dailyRecord) {
        const linked = await findLinkedOtherExpense(
          tx,
          advance.dailyRecord.id,
          advance.id,
          advance.amount,
          advance.labour.name,
        )
        if (linked) {
          await tx.otherExpense.update({
            where: { id: linked.id },
            data: {
              amount:      data.amount,
              description: buildAdvanceDesc(advance.id, advance.labour.name, data.reason),
            },
          })
        }

        const newTotalOther = advance.dailyRecord.totalOther + diff
        await tx.dailyRecord.update({
          where: { id: advance.dailyRecord.id },
          data: {
            totalOther: newTotalOther,
            grandTotal: advance.dailyRecord.totalMaterial + newTotalOther + advance.dailyRecord.totalLabour,
          },
        })
      }
    }, { timeout: 15000 })

    revalidatePath('/labour')
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/sites')
    if (advance.dailyRecord) {
      const rec = await prisma.dailyRecord.findUnique({
        where: { id: advance.dailyRecord.id },
        select: { siteId: true },
      })
      if (rec) revalidatePath(`/sites/${rec.siteId}`)
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Delete Advance ────────────────────────────────────────────────────────
export async function deleteLabourAdvance(id: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const advance = await prisma.labourAdvance.findUnique({
      where: { id },
      include: {
        dailyRecord: { select: { id: true, totalOther: true, totalMaterial: true, totalLabour: true } },
        labour: { select: { name: true } },
      },
    })
    if (!advance) return { success: false, error: 'Not found' }
    if (advance.isSettled) return { success: false, error: 'Cannot delete a settled advance' }

    await prisma.$transaction(async (tx) => {
      if (advance.dailyRecord) {
        const linked = await findLinkedOtherExpense(
          tx,
          advance.dailyRecord.id,
          advance.id,
          advance.amount,
          advance.labour.name,
        )
        if (linked) {
          await tx.otherExpense.delete({ where: { id: linked.id } })
        }

        const newTotalOther = Math.max(0, advance.dailyRecord.totalOther - advance.amount)
        await tx.dailyRecord.update({
          where: { id: advance.dailyRecord.id },
          data: {
            totalOther: newTotalOther,
            grandTotal: advance.dailyRecord.totalMaterial + newTotalOther + advance.dailyRecord.totalLabour,
          },
        })
      }

      await tx.labourAdvance.delete({ where: { id } })
    }, { timeout: 15000 })

    revalidatePath('/labour')
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/sites')
    if (advance.dailyRecord) {
      const rec = await prisma.dailyRecord.findUnique({
        where: { id: advance.dailyRecord.id },
        select: { siteId: true },
      })
      if (rec) revalidatePath(`/sites/${rec.siteId}`)
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getLabourAdvancesAll(labourId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return prisma.labourAdvance.findMany({
    where: { labourId },
    include: {
      dailyRecord: {
        select: { date: true, site: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Attendance sheet ──────────────────────────────────────────────────────
export async function getAttendanceSheet(siteId: string, date: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const [labours, existingRecord] = await Promise.all([
    prisma.labour.findMany({
      where: { active: true },
      orderBy: [{ labourType: 'asc' }, { name: 'asc' }],
    }),
    prisma.dailyRecord.findUnique({
      where: { siteId_date: { siteId, date: safeDate(date) } },
      select: {
        id: true,
        labourEntries: { select: { labourId: true, rate: true, isPaid: true } },
      },
    }),
  ])

  const entryMap = new Map(
    (existingRecord?.labourEntries || []).map((e) => [e.labourId, e]),
  )

  return labours.map((l) => {
    const existing = entryMap.get(l.id)
    return {
      labourId:    l.id,
      name:        l.name,
      designation: l.designation,
      labourType:  l.labourType,
      rate:        existing?.rate ?? l.dailyWage,
      present:     !!existing,
      isPaid:      existing?.isPaid ?? false,
    }
  })
}

// ─── Unpaid summary (for Pay modal) ───────────────────────────────────────
export async function getUnpaidSummary(labourId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const { weekStart, weekEnd } = getWeekBoundsUTC()

  const [entries, advances] = await Promise.all([
    prisma.labourEntry.findMany({
      where: { labourId, present: true, isPaid: false },
      include: {
        dailyRecord: { select: { date: true, site: { select: { name: true } } } },
      },
      orderBy: { dailyRecord: { date: 'asc' } },
    }),
    prisma.labourAdvance.findMany({
      where: { labourId, isSettled: false },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return {
    weekStart: toDateStr(weekStart),
    weekEnd:   toDateStr(weekEnd),
    entries,
    daysWorked: entries.length,
    totalWage:  entries.reduce((s, e) => s + e.cost, 0),
    pendingAdvances:     advances,
    totalPendingAdvance: advances.reduce((s, a) => s + a.amount, 0),
  }
}

export async function getPaymentHistory(labourId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  return prisma.weeklySalary.findMany({
    where: { labourId },
    include: { paidBy: { select: { name: true } } },
    orderBy: { paidAt: 'desc' },
    take: 20,
  })
}

// ─── Record Weekly Salary Payment ─────────────────────────────────────────
//
// Financial rules implemented here:
//  • Unpaid wages are NOT in DailyRecord.totalLabour until this function runs
//  • DailyRecord.totalLabour = GROSS labour cost (sum of all paid LabourEntry.cost)
//  • Advance deductions reduce only WeeklySalary.netPaid — not the DailyRecord
//  • This means site budget reports always show TRUE labour cost, not cash-in-hand
export async function recordWeeklySalary(data: unknown): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Unauthorized' }

    const parsed = weeklySalarySchema.parse(data)

    await prisma.$transaction(async (tx) => {
      // 1. Create the WeeklySalary record
      const salary = await tx.weeklySalary.create({
        data: {
          labourId:        parsed.labourId,
          weekStart:       safeDate(parsed.weekStart),
          weekEnd:         safeDate(parsed.weekEnd),
          daysWorked:      parsed.daysWorked,
          totalWage:       parsed.totalWage,
          advanceDeducted: parsed.advanceDeducted,
          netPaid:         parsed.netPaid,
          paidById:        session.user.id,
          notes:           parsed.notes,
        },
      })

      // 2. Find ALL unpaid entries for this worker (across ALL dates / sites)
      const unpaidEntries = await tx.labourEntry.findMany({
        where: { labourId: parsed.labourId, isPaid: false, present: true },
        select: { id: true, dailyRecordId: true },
      })

      if (unpaidEntries.length > 0) {
        // 3. Mark all unpaid entries as paid
        await tx.labourEntry.updateMany({
          where: { id: { in: unpaidEntries.map((e) => e.id) } },
          data: { isPaid: true, paidAt: new Date() },
        })

        // 4. Recalculate totalLabour for each affected DailyRecord.
        //
        // OPTIMISATION: Prisma interactive transactions run over a *single* DB
        // connection, so Promise.all() does not parallelise at the DB level —
        // it just queues N×3 round-trips serially while paying the overhead of
        // N concurrent Promises.  Two batch reads + N sequential writes is
        // materially faster and avoids the 30-second timeout on large payrolls.
        const recordIds = [...new Set(unpaidEntries.map((e) => e.dailyRecordId))]

        const [labourSums, affectedRecords] = await Promise.all([
          tx.labourEntry.groupBy({
            by: ['dailyRecordId'],
            where: { dailyRecordId: { in: recordIds }, isPaid: true, present: true },
            _sum: { cost: true },
          }),
          tx.dailyRecord.findMany({
            where: { id: { in: recordIds } },
            select: { id: true, totalMaterial: true, totalOther: true },
          }),
        ])

        const labourSumMap = new Map(labourSums.map((s) => [s.dailyRecordId, s._sum.cost || 0]))
        const recordMap    = new Map(affectedRecords.map((r) => [r.id, r]))

        for (const recordId of recordIds) {
          const record = recordMap.get(recordId)
          if (!record) continue
          const totalLabour = labourSumMap.get(recordId) || 0
          await tx.dailyRecord.update({
            where: { id: recordId },
            data: {
              totalLabour,
              grandTotal: totalLabour + record.totalMaterial + record.totalOther,
            },
          })
        }
      }

      // 5. Settle the selected advances.
      //
      //    IMPORTANT: When an advance is settled, its linked OtherExpense must be
      //    REMOVED from the DailyRecord it was originally recorded on.
      //
      //      - Advance day: OtherExpense deleted → totalOther reduced ← advance removed ✓
      //      - Payment day: totalLabour = full gross wage ✓
      //      - Net effect:  site total = gross wages only, no duplication ✓
      //
      //    OPTIMISATION: replace N×(findLinkedOtherExpense + aggregate + update) with:
      //      • one batch fetch of all candidate OtherExpenses (across all records)
      //      • in-memory matching — precise [ADV:id] first, legacy fallback second
      //      • one deleteMany for all matched expenses
      //      • one groupBy re-sum across all affected records
      //      • fresh re-fetch of record totals (step 4 may have updated totalLabour)
      //      • sequential per-record updates
      if (parsed.settledAdvanceIds.length > 0) {
        const advancesToSettle = await tx.labourAdvance.findMany({
          where: { id: { in: parsed.settledAdvanceIds } },
          include: {
            labour: { select: { name: true } },
            dailyRecord: { select: { id: true } },
          },
        })

        const advDailyRecordIds = [
          ...new Set(advancesToSettle.filter((a) => a.dailyRecord).map((a) => a.dailyRecord!.id)),
        ]

        // Batch-fetch ALL advance OtherExpenses for these records in one round-trip
        const allAdvanceExpenses = await tx.otherExpense.findMany({
          where: { dailyRecordId: { in: advDailyRecordIds }, category: 'Advance' },
          select: { id: true, dailyRecordId: true, amount: true, description: true },
        })

        // Build a mutable per-record pool so in-memory matching is O(n)
        const expensesByRecord = new Map<string, typeof allAdvanceExpenses>()
        for (const exp of allAdvanceExpenses) {
          const list = expensesByRecord.get(exp.dailyRecordId) ?? []
          list.push(exp)
          expensesByRecord.set(exp.dailyRecordId, list)
        }

        // Match each advance to its OtherExpense entry in memory
        const expenseIdsToDelete: string[] = []
        for (const adv of advancesToSettle) {
          if (!adv.dailyRecord) continue
          const pool = expensesByRecord.get(adv.dailyRecord.id) ?? []

          // Precise match: [ADV:<id>] marker embedded in description
          let linked = pool.find((e) => e.description?.includes(`[ADV:${adv.id}]`))

          // Legacy fallback: same amount + worker name in description
          if (!linked) {
            linked = pool.find(
              (e) => e.amount === adv.amount && e.description?.includes(adv.labour.name),
            )
          }

          if (linked) {
            expenseIdsToDelete.push(linked.id)
            // Remove from pool so a second advance on the same day cannot match the same expense
            expensesByRecord.set(adv.dailyRecord.id, pool.filter((e) => e.id !== linked!.id))
          }
        }

        // Batch-delete all linked OtherExpenses in one round-trip
        if (expenseIdsToDelete.length > 0) {
          await tx.otherExpense.deleteMany({ where: { id: { in: expenseIdsToDelete } } })
        }

        // Re-sum remaining OtherExpenses per record and re-fetch current totals.
        // Step 4 may have updated totalLabour on overlapping records, so we must
        // not rely on the snapshot values from the advance.dailyRecord include above.
        const [remainingSums, currentAdvRecords] = await Promise.all([
          tx.otherExpense.groupBy({
            by: ['dailyRecordId'],
            where: { dailyRecordId: { in: advDailyRecordIds } },
            _sum: { amount: true },
          }),
          tx.dailyRecord.findMany({
            where: { id: { in: advDailyRecordIds } },
            select: { id: true, totalLabour: true, totalMaterial: true },
          }),
        ])

        const remainingSumMap  = new Map(remainingSums.map((s) => [s.dailyRecordId, s._sum.amount ?? 0]))
        const currentAdvRecMap = new Map(currentAdvRecords.map((r) => [r.id, r]))

        for (const recordId of advDailyRecordIds) {
          const record = currentAdvRecMap.get(recordId)
          if (!record) continue
          const newTotalOther = remainingSumMap.get(recordId) ?? 0
          await tx.dailyRecord.update({
            where: { id: recordId },
            data: {
              totalOther: newTotalOther,
              grandTotal: record.totalLabour + record.totalMaterial + newTotalOther,
            },
          })
        }

        // Mark all selected advances as settled
        await tx.labourAdvance.updateMany({
          where: { id: { in: parsed.settledAdvanceIds } },
          data: { isSettled: true, settledAt: new Date(), weeklyPayId: salary.id },
        })
      }
    }, { timeout: 60000 })

    revalidatePath('/labour')
    revalidatePath('/dashboard')
    revalidatePath('/records')
    revalidatePath('/reports')
    revalidatePath('/sites', 'layout')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record payment' }
  }
}

export async function getUnpaidWorkersCount(): Promise<number> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return 0
    const result = await prisma.labourEntry.groupBy({
      by: ['labourId'],
      where: { present: true, isPaid: false },
    })
    return result.length
  } catch {
    return 0
  }
}