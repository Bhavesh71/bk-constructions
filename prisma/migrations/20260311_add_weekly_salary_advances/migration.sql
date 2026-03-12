-- BK Constructions: Attendance + Payment System Migration
-- Run this ONCE against your database (Neon or Supabase)

-- 1. Add labourType to Labour (if not already present)
ALTER TABLE "Labour" ADD COLUMN IF NOT EXISTS "labourType" TEXT NOT NULL DEFAULT 'REGULAR';

-- 2. Add isPaid + paidAt to LabourEntry (tracks whether wages have been paid)
ALTER TABLE "LabourEntry" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LabourEntry" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP;

-- 3. Create LabourAdvance table (if not exists)
CREATE TABLE IF NOT EXISTS "LabourAdvance" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "labourId"      TEXT NOT NULL REFERENCES "Labour"("id") ON DELETE CASCADE,
    "amount"        DOUBLE PRECISION NOT NULL,
    "reason"        TEXT,
    "dailyRecordId" TEXT REFERENCES "DailyRecord"("id") ON DELETE SET NULL,
    "isSettled"     BOOLEAN NOT NULL DEFAULT false,
    "settledAt"     TIMESTAMP,
    "weeklyPayId"   TEXT,
    "createdAt"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create WeeklySalary table (if not exists)
CREATE TABLE IF NOT EXISTS "WeeklySalary" (
    "id"              TEXT NOT NULL PRIMARY KEY,
    "labourId"        TEXT NOT NULL REFERENCES "Labour"("id") ON DELETE CASCADE,
    "weekStart"       DATE NOT NULL,
    "weekEnd"         DATE NOT NULL,
    "daysWorked"      INTEGER NOT NULL,
    "totalWage"       DOUBLE PRECISION NOT NULL,
    "advanceDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPaid"         DOUBLE PRECISION NOT NULL,
    "paidAt"          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById"        TEXT NOT NULL REFERENCES "User"("id"),
    "notes"           TEXT,
    "createdAt"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add weeklyPayId FK to LabourAdvance now that WeeklySalary exists
ALTER TABLE "LabourAdvance"
    ADD COLUMN IF NOT EXISTS "weeklyPayId_col" TEXT REFERENCES "WeeklySalary"("id") ON DELETE SET NULL;

-- 6. Add customExpenseCategories to AppSettings (if not already present)
ALTER TABLE "AppSettings"
    ADD COLUMN IF NOT EXISTS "customExpenseCategories" TEXT DEFAULT '[]';
