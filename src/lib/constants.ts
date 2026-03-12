// ─── Expense Categories ─────────────────────────────────────────────────────
// Replaces the old vague list. Based on real BK Constructions spending patterns.

export const EXPENSE_CATEGORIES = [
  'Food & Tea',
  'Fuel',
  'Transport',
  'Site Setup',
  'Pooja & Ceremony',
  'Equipment & Tools',
  'Electricals',
  'Plumbing',
  'Admin Expense',
  'Advance',
  'Miscellaneous',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ─── Quick-Add Tiles ────────────────────────────────────────────────────────
// Pre-filled tiles for the most commonly used expenses (from data analysis)
// User taps a tile → category is pre-filled, just enter the amount

export const QUICK_ADD_TILES = [
  { label: 'Tea / Snacks',   category: 'Food & Tea',       emoji: '🍵', defaultAmount: 100 },
  { label: 'Food',           category: 'Food & Tea',       emoji: '🍽️', defaultAmount: 200 },
  { label: 'Petrol',         category: 'Fuel',             emoji: '⛽', defaultAmount: 200 },
  { label: 'Admin Petty Cash', category: 'Admin Expense',  emoji: '💼', defaultAmount: 150 },
  { label: 'Water / Can',    category: 'Miscellaneous',    emoji: '💧', defaultAmount: 50 },
  { label: 'Transport',      category: 'Transport',        emoji: '🚛', defaultAmount: 500 },
  { label: 'Pooja',          category: 'Pooja & Ceremony', emoji: '🪔', defaultAmount: 500 },
  { label: 'Tools / Equipment', category: 'Equipment & Tools', emoji: '🔧', defaultAmount: 500 },
] as const

// ─── Material Categories ────────────────────────────────────────────────────
export const MATERIAL_CATEGORIES = [
  'Steel',
  'Cement & Binding',
  'Aggregate',
  'Masonry',
  'Wood & Timber',
  'Electrical',
  'Plumbing',
  'Finishing',
  'Equipment',
  'Other',
] as const

// ─── Labour Types ────────────────────────────────────────────────────────────
export const LABOUR_TYPES = {
  REGULAR: 'REGULAR',   // Shows in daily attendance every day
  ONCALL: 'ONCALL',     // Only added manually when required
} as const

export type LabourType = keyof typeof LABOUR_TYPES
