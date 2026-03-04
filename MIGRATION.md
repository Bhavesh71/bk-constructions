# Construction Ops V3 — Upgrade & Migration Guide

## Files Updated

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `AppSettings`, soft-delete fields on `BudgetEntry`, removed OT from `Labour`/`LabourEntry`, added `rate` field, `theme` on `User` |
| `tailwind.config.ts` | Added `darkMode: 'class'`, new dark color tokens |
| `src/app/globals.css` | Full dark mode variants for all utility classes |
| `src/app/layout.tsx` | Added `ThemeProvider`, anti-flash script |
| `src/lib/theme.tsx` | **NEW** — ThemeProvider + useTheme hook |
| `src/lib/validations.ts` | Removed OT fields, added `rate` to labour entry |
| `src/actions/sites.ts` | Added `editBudgetEntry`, `voidBudgetEntry`, budget totals exclude voided |
| `src/actions/settings.ts` | Added `getAppSettings`, `updateAppSettings`, `getSupervisorStats`, `saveUserTheme` |
| `src/actions/daily-records.ts` | Removed OT calculation, uses `rate` field from client |
| `src/actions/labour.ts` | Removed OT from create/update |
| `src/components/layout/Sidebar.tsx` | Dark mode classes, Settings visible to all roles |
| `src/components/layout/TopNav.tsx` | Dark mode + theme toggle button |
| `src/components/sites/SiteTabs.tsx` | Budget edit/void modals, voided badge, audit trail display |
| `src/components/settings/AdminSettingsClient.tsx` | **RENAMED from SettingsClient** — DB-connected company profile, theme toggle |
| `src/components/settings/SupervisorSettingsClient.tsx` | **NEW** — Profile, assigned sites, theme, password |
| `src/components/settings/SettingsClient.tsx` | **DELETE this file** (replaced by two above) |
| `src/app/(dashboard)/settings/page.tsx` | Role-based: Admin → AdminSettingsClient, Supervisor → SupervisorSettingsClient |
| `src/components/daily-entry/DailyEntryForm.tsx` | OT removed, editable rate per worker, total summary preview |
| `src/components/records/RecordsBrowser.tsx` | Full redesign: pagination, expandable rows, Excel export, sticky header |
| `src/components/labour/LabourManagement.tsx` | OT column removed, dark mode |
| `src/components/dashboard/DashboardSkeleton.tsx` | **NEW** — Loading skeleton for dashboard |

---

## Prisma Migration Steps

### 1. Backup your database
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 2. Apply schema changes
```bash
# Copy the new schema.prisma file, then:
npx prisma migrate dev --name v3_settings_budget_ot_removal

# OR for production (no migration history):
npx prisma db push
```

### 3. Handle OT data migration

The `overtimeHours` field is removed from `LabourEntry` and `overtimeRate` from `Labour`.
Run this SQL migration **before** running prisma migrate if your DB already has data:

```sql
-- Bake existing OT cost into the base cost
UPDATE "LabourEntry"
SET cost = cost  -- cost already includes OT in old system
WHERE "overtimeHours" > 0;

-- Then prisma migrate will drop the OT columns
-- The cost column already has the correct total value
```

### 4. Seed AppSettings (first-time)
Run the app once and visit `/settings` — the system auto-creates the settings row on first access.

Or manually:
```sql
INSERT INTO "AppSettings" ("id", "companyName", "companyTagline", "currency", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'BK Constructions', 'Operations', 'INR', NOW(), NOW());
```

### 5. Add theme column to User
```sql
-- This is handled by prisma migrate, but if manually:
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'light';
```

### 6. Generate new Prisma client
```bash
npx prisma generate
```

---

## Performance Optimizations Applied

1. **No `router.refresh()`** removed from hot paths — only server actions use `revalidatePath()`
2. **Promise.all everywhere** — Dashboard, Settings, Sites all batch DB queries
3. **Skeleton loading UI** — DashboardSkeleton shown via Suspense while data loads
4. **Pagination** — RecordsBrowser paginates at 20 rows per page
5. **Memoized filters** — `useMemo` in RecordsBrowser prevents recalculation on every render
6. **Voided budget exclusion** — All aggregate queries filter `isVoided: false` upfront

---

## Dark Mode Architecture

- **Strategy**: Tailwind `class` dark mode — `dark:` prefix on all components
- **Provider**: `src/lib/theme.tsx` → `ThemeProvider` wraps the app in `layout.tsx`
- **Anti-flash**: Inline `<script>` in `<head>` reads `localStorage` before first paint
- **Toggle**: TopNav has a moon/sun button; Settings pages have a toggle switch
- **Persistence**: `localStorage.setItem('theme', ...)` + optional DB sync via `saveUserTheme`
- **Transition**: `transition-colors duration-200` on body and all major containers

---

## Excel Export

The Excel export in RecordsBrowser generates an HTML-table-based `.xls` file that Excel/LibreOffice/Numbers can open natively — no server-side xlsx library required.

The export includes **4 sheets** (as separate `<table>` sections in the HTML):
1. Summary totals
2. Daily Records
3. Labour Breakdown (per worker per day)
4. Material Breakdown (with quantity × rate)

For a true multi-sheet `.xlsx` (e.g. using the `xlsx` npm package), add it to `package.json`:
```bash
npm install xlsx
```
Then replace the `exportExcel` function with `xlsx.utils.book_new()` / `xlsx.writeFile()` calls.

---

## OT Removal Confirmation

✅ Removed `overtimeRate` from `Labour` model  
✅ Removed `overtimeHours` from `LabourEntry` model  
✅ Removed `overtimeRate` from `labourSchema` in validations  
✅ Removed OT calculation from `saveDailyRecord` server action  
✅ Removed OT fields from `DailyEntryForm` UI  
✅ Removed OT column from `LabourManagement` table  
✅ `rate` field now stored per `LabourEntry` (editable per day in form)
