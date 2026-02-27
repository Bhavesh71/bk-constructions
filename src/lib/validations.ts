import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const siteSchema = z.object({
  name: z.string().min(2, 'Site name must be at least 2 characters'),
  location: z.string().min(2, 'Location is required'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
  description: z.string().optional(),
  expectedRevenue: z.number().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
})

export const budgetEntrySchema = z.object({
  siteId: z.string(),
  amount: z.number({ required_error: 'Amount is required' }),
  note: z.string().optional(),
})

export const labourSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  designation: z.string().min(2, 'Designation is required'),
  dailyWage: z.number().positive('Daily wage must be positive'),
  overtimeRate: z.number().min(0).default(0),
  active: z.boolean().default(true),
})

export const materialSchema = z.object({
  name: z.string().min(2, 'Material name is required'),
  unit: z.string().min(1, 'Unit is required'),
  defaultRate: z.number().positive('Rate must be positive'),
  category: z.string().min(1, 'Category is required'),
})

export const dailyRecordSchema = z.object({
  siteId: z.string(),
  date: z.string(),
  notes: z.string().optional(),
  labourEntries: z.array(
    z.object({
      labourId: z.string(),
      present: z.boolean().default(true),
      overtimeHours: z.number().min(0).default(0),
    })
  ),
  materialEntries: z.array(
    z.object({
      materialId: z.string(),
      quantity: z.number().positive(),
      rate: z.number().positive(),
    })
  ),
  otherExpenses: z.array(
    z.object({
      category: z.string(),
      amount: z.number().positive(),
      description: z.string().optional(),
    })
  ),
})

export const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'SUPERVISOR']),
})
