import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// BUG-4 FIX: transform date strings to ISO so Prisma receives DateTime correctly
export const siteSchema = z.object({
  name: z.string().min(2, 'Site name must be at least 2 characters'),
  location: z.string().min(2, 'Location is required'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
  description: z.string().optional(),
  expectedRevenue: z.number().positive().optional().nullable(),
  startDate: z.string().optional().nullable().transform(v => v ? new Date(v).toISOString() : v),
  expectedEndDate: z.string().optional().nullable().transform(v => v ? new Date(v).toISOString() : v),
})

export const budgetEntrySchema = z.object({
  siteId: z.string().optional(),
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
  note: z.string().optional(),
})

export const labourSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  designation: z.string().min(2, 'Designation is required'),
  dailyWage: z.number().positive('Daily wage must be positive'),
  active: z.boolean().default(true),
  labourType: z.enum(['REGULAR', 'ONCALL']).default('REGULAR'),
})

// Extended to support immediate expense recording when advance is given
export const labourAdvanceSchema = z.object({
  labourId: z.string(),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().optional(),
  siteId: z.string().optional(),   // site to record the expense against
  date: z.string().optional(),      // date to record the expense on (YYYY-MM-DD)
})

// Attendance: saved separately from expenses, pure presence tracking.
// Creates LabourEntry rows. Does NOT affect totalLabour/grandTotal until payment.
export const attendanceSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  date: z.string().min(1, 'Date is required'),
  entries: z.array(z.object({
    labourId: z.string(),
    present: z.boolean(),
    rate: z.number().min(0),
  })),
})

// Weekly salary: created when Pay is clicked.
// Marks LabourEntries as paid + updates DailyRecord.totalLabour with netPaid (not gross).
export const weeklySalarySchema = z.object({
  labourId: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  daysWorked: z.number().int().min(0),
  totalWage: z.number().min(0),
  advanceDeducted: z.number().min(0).default(0),
  netPaid: z.number().min(0),
  settledAdvanceIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export const materialSchema = z.object({
  name: z.string().min(2, 'Material name is required'),
  unit: z.string().min(1, 'Unit is required'),
  defaultRate: z.number().positive('Rate must be positive'),
  category: z.string().min(1, 'Category is required'),
})

// Daily record: expenses only (materials + other). Labour handled via Attendance.
export const dailyRecordSchema = z.object({
  siteId: z.string(),
  date: z.string(),
  notes: z.string().optional(),
  materialEntries: z.array(z.object({
    materialId: z.string(),
    quantity: z.number().positive(),
    rate: z.number().positive(),
  })),
  otherExpenses: z.array(z.object({
    category: z.string(),
    amount: z.number().positive(),
    description: z.string().optional(),
  })),
})

export const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'SUPERVISOR']),
})
