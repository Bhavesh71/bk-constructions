# BK Constructions v7 — Production Deployment Guide

## Overview
This guide migrates your existing Supabase DB + Vercel deployment from the old version
to v7, with all bug fixes and corrected data.

---

## STEP 1 — Run the Database Migration in Supabase

> ⚠️ This will DELETE all existing tables and reload from clean data.
> Do this during off-hours. The whole process takes < 1 minute.

1. Go to **https://supabase.com/dashboard** → your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `prisma/seed-production.sql` from this zip
5. Paste the entire contents into the SQL Editor
6. Click **Run** (▶)

You should see `COMMIT` at the end and a row-count table like:
```
AppSettings  | 1
User         | 3
Site         | 1
SiteUser     | 3
BudgetEntry  | 29
DailyRecord  | 10
Labour       | 5
LabourEntry  | 7
WeeklySalary | 5
LabourAdvance| 7
Material     | 18
MaterialEntry| 21
OtherExpense | 58
```

If you see any errors, **do not proceed** — paste the error and ask for help.

---

## STEP 2 — Push Code to GitHub

```bash
# In your local project, replace all source files with the v7 contents
# (copy everything from this zip into your repo folder, overwriting)

cd your-repo-folder

# Stage and commit
git add -A
git commit -m "v7: fix advance linkage, UTC timezone bugs, data corrections"
git push origin main
```

---

## STEP 3 — Set Environment Variables in Vercel

Go to **https://vercel.com/dashboard** → your project → **Settings** → **Environment Variables**

Make sure these are set (add or update if needed):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase **Transaction pooler** connection string |
| `DIRECT_URL` | Your Supabase **Direct connection** string (for Prisma migrations) |
| `NEXTAUTH_SECRET` | Any long random string (keep the same one if already set) |
| `NEXTAUTH_URL` | Your Vercel production URL e.g. `https://your-app.vercel.app` |

### How to get Supabase connection strings:
1. Supabase Dashboard → your project → **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **Transaction** mode → copy → paste as `DATABASE_URL`
   - Change `[YOUR-PASSWORD]` to your actual DB password
   - Append `?pgbouncer=true&connection_limit=1` at the end
4. Select **Session / Direct** mode → copy → paste as `DIRECT_URL`
   - Change `[YOUR-PASSWORD]` to your actual DB password

**Example format:**
```
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

---

## STEP 4 — Trigger Vercel Redeploy

Since you pushed to `main` in Step 2, Vercel will auto-deploy.

To watch it:
1. Go to Vercel Dashboard → your project → **Deployments**
2. Click the latest deployment to watch build logs
3. Build should complete in ~2 minutes

If auto-deploy didn't trigger, click **Redeploy** manually.

---

## STEP 5 — Verify the Deployment

Once deployed, open your app URL and check:

- [ ] Login works (use your existing email/password — passwords are preserved)
- [ ] Dashboard shows correct site data
- [ ] Daily records for Mar 6–11 are all present
- [ ] Labour → Advances shows Gopi (₹2,070 pending) and Ramesh (₹6,000 pending)
- [ ] Reports load without errors

---

## Login Credentials (unchanged from your current system)

| Name | Email | Role |
|---|---|---|
| N A Loganathan | adi.logu@gmail.com | ADMIN |
| Bhavesh L | bhavesh71.logu@gmail.com | SUPERVISOR |
| Malini Latha M | malinilathascl@gmail.com | SUPERVISOR |

> Passwords are the same bcrypt hashes — no change needed.

---

## What Changed in v7

| # | Bug | Fix |
|---|---|---|
| BUG-1 | Editing one worker's advance could corrupt another worker's expense on same day | Advances now embed `[ADV:id]` marker in OtherExpense description for precise lookup |
| BUG-2 | Week boundaries used local time (IST) instead of UTC — salary queries drifted by 5.5 hours | `getWeekBoundsUTC()` now uses UTC date methods throughout |
| BUG-3 | Week start/end display strings showed wrong date near midnight IST | `toDateStr()` uses UTC methods consistently |
| BUG-4 | Monthly trend chart bucketed records into the wrong month near month boundaries | Dashboard now uses `getUTCMonth()` / `getUTCFullYear()` |

### Data corrections applied in migration:
- 4 old advances (Gopi & Ramesh, Mar 7–10) backfilled with `[ADV:id]` markers
- `"Other Advances"` category → `"Miscellaneous"` (Concrete Gang Token Advance)
- `"Other Advances"` removed from AppSettings custom categories list
