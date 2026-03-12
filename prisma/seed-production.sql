-- ============================================================
-- BK Constructions — Full Production Migration
-- Generated: 2026-03-12  (v7 corrected data)
-- Run this in Supabase SQL Editor (as a single transaction)
-- ============================================================

BEGIN;

-- ─── 1. DROP EXISTING TABLES (safe cascade) ───────────────
DROP TABLE IF EXISTS "OtherExpense" CASCADE;
DROP TABLE IF EXISTS "MaterialEntry" CASCADE;
DROP TABLE IF EXISTS "LabourAdvance" CASCADE;
DROP TABLE IF EXISTS "WeeklySalary" CASCADE;
DROP TABLE IF EXISTS "LabourEntry" CASCADE;
DROP TABLE IF EXISTS "DailyRecord" CASCADE;
DROP TABLE IF EXISTS "BudgetEntry" CASCADE;
DROP TABLE IF EXISTS "SiteUser" CASCADE;
DROP TABLE IF EXISTS "Material" CASCADE;
DROP TABLE IF EXISTS "Labour" CASCADE;
DROP TABLE IF EXISTS "Site" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "AppSettings" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "SiteStatus" CASCADE;

-- ─── 2. CREATE ENUMS ────────────────────────────────────────
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR');
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- ─── 3. CREATE TABLES ───────────────────────────────────────
CREATE TABLE "AppSettings" (
    "id"                      TEXT         NOT NULL PRIMARY KEY,
    "companyName"             TEXT         NOT NULL DEFAULT 'BK Constructions',
    "companyTagline"          TEXT                  DEFAULT 'Operations',
    "logoUrl"                 TEXT,
    "currency"                TEXT         NOT NULL DEFAULT 'INR',
    "address"                 TEXT,
    "phone"                   TEXT,
    "email"                   TEXT,
    "gstNumber"               TEXT,
    "contactPerson"           TEXT,
    "customExpenseCategories" TEXT                  DEFAULT '[]',
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL
);

CREATE TABLE "User" (
    "id"        TEXT         NOT NULL PRIMARY KEY,
    "name"      TEXT         NOT NULL,
    "email"     TEXT         NOT NULL UNIQUE,
    "password"  TEXT         NOT NULL,
    "role"      "Role"       NOT NULL DEFAULT 'SUPERVISOR',
    "theme"     TEXT         NOT NULL DEFAULT 'light',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Site" (
    "id"              TEXT         NOT NULL PRIMARY KEY,
    "name"            TEXT         NOT NULL,
    "location"        TEXT         NOT NULL,
    "status"          "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "description"     TEXT,
    "startDate"       TIMESTAMP(3),
    "expectedEndDate" TIMESTAMP(3),
    "expectedRevenue" DOUBLE PRECISION,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE TABLE "SiteUser" (
    "id"        TEXT         NOT NULL PRIMARY KEY,
    "siteId"    TEXT         NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE,
    "userId"    TEXT         NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("siteId", "userId")
);

CREATE TABLE "BudgetEntry" (
    "id"          TEXT         NOT NULL PRIMARY KEY,
    "siteId"      TEXT         NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE,
    "amount"      DOUBLE PRECISION NOT NULL,
    "note"        TEXT,
    "createdById" TEXT         NOT NULL REFERENCES "User"("id"),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "editedById"  TEXT         REFERENCES "User"("id"),
    "isVoided"    BOOLEAN      NOT NULL DEFAULT FALSE,
    "voidedAt"    TIMESTAMP(3),
    "voidedById"  TEXT         REFERENCES "User"("id"),
    "voidReason"  TEXT
);

CREATE TABLE "DailyRecord" (
    "id"            TEXT         NOT NULL PRIMARY KEY,
    "siteId"        TEXT         NOT NULL REFERENCES "Site"("id") ON DELETE CASCADE,
    "date"          DATE         NOT NULL,
    "totalLabour"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOther"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes"         TEXT,
    "createdById"   TEXT         NOT NULL REFERENCES "User"("id"),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    UNIQUE("siteId", "date")
);

CREATE TABLE "Labour" (
    "id"          TEXT         NOT NULL PRIMARY KEY,
    "name"        TEXT         NOT NULL,
    "designation" TEXT         NOT NULL,
    "dailyWage"   DOUBLE PRECISION NOT NULL,
    "active"      BOOLEAN      NOT NULL DEFAULT TRUE,
    "labourType"  TEXT         NOT NULL DEFAULT 'REGULAR',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE "LabourEntry" (
    "id"            TEXT         NOT NULL PRIMARY KEY,
    "dailyRecordId" TEXT         NOT NULL REFERENCES "DailyRecord"("id") ON DELETE CASCADE,
    "labourId"      TEXT         NOT NULL REFERENCES "Labour"("id"),
    "rate"          DOUBLE PRECISION NOT NULL,
    "cost"          DOUBLE PRECISION NOT NULL,
    "present"       BOOLEAN      NOT NULL DEFAULT TRUE,
    "isPaid"        BOOLEAN      NOT NULL DEFAULT FALSE,
    "paidAt"        TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WeeklySalary" (
    "id"              TEXT         NOT NULL PRIMARY KEY,
    "labourId"        TEXT         NOT NULL REFERENCES "Labour"("id") ON DELETE CASCADE,
    "weekStart"       DATE         NOT NULL,
    "weekEnd"         DATE         NOT NULL,
    "daysWorked"      INTEGER      NOT NULL,
    "totalWage"       DOUBLE PRECISION NOT NULL,
    "advanceDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPaid"         DOUBLE PRECISION NOT NULL,
    "paidAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById"        TEXT         NOT NULL REFERENCES "User"("id"),
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LabourAdvance" (
    "id"            TEXT         NOT NULL PRIMARY KEY,
    "labourId"      TEXT         NOT NULL REFERENCES "Labour"("id") ON DELETE CASCADE,
    "amount"        DOUBLE PRECISION NOT NULL,
    "reason"        TEXT,
    "dailyRecordId" TEXT         REFERENCES "DailyRecord"("id") ON DELETE SET NULL,
    "isSettled"     BOOLEAN      NOT NULL DEFAULT FALSE,
    "settledAt"     TIMESTAMP(3),
    "weeklyPayId"   TEXT         REFERENCES "WeeklySalary"("id") ON DELETE SET NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Material" (
    "id"          TEXT         NOT NULL PRIMARY KEY,
    "name"        TEXT         NOT NULL,
    "unit"        TEXT         NOT NULL,
    "defaultRate" DOUBLE PRECISION NOT NULL,
    "category"    TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE "MaterialEntry" (
    "id"            TEXT         NOT NULL PRIMARY KEY,
    "dailyRecordId" TEXT         NOT NULL REFERENCES "DailyRecord"("id") ON DELETE CASCADE,
    "materialId"    TEXT         NOT NULL REFERENCES "Material"("id"),
    "quantity"      DOUBLE PRECISION NOT NULL,
    "rate"          DOUBLE PRECISION NOT NULL,
    "total"         DOUBLE PRECISION NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OtherExpense" (
    "id"            TEXT         NOT NULL PRIMARY KEY,
    "dailyRecordId" TEXT         NOT NULL REFERENCES "DailyRecord"("id") ON DELETE CASCADE,
    "category"      TEXT         NOT NULL,
    "amount"        DOUBLE PRECISION NOT NULL,
    "description"   TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 4. INSERT DATA ─────────────────────────────────────────

-- AppSettings
INSERT INTO "AppSettings" ("id","companyName","companyTagline","logoUrl","currency","address","phone","email","gstNumber","contactPerson","customExpenseCategories","createdAt","updatedAt") VALUES ('af9f991b-a921-4a37-a855-ee71b5bc1a7c','BK Constructions','Operations',NULL,'INR',NULL,'+91 9786429376',NULL,NULL,'Malini Latha M','[]','2026-03-04 00:07:03.421','2026-03-12 08:17:18.337');

-- Users
INSERT INTO "User" ("id","name","email","password","role","theme","createdAt","updatedAt") VALUES ('cmm4b6ko30000145fg7gsmyk0','Bhavesh L','bhavesh71.logu@gmail.com','$2a$12$d8Vu.ILN7Bim86qVZVm.WeMpKVMzfiA51vqshhPtgikcLeSd.r52m','SUPERVISOR','light','2026-02-26 21:34:28.684','2026-03-11 10:41:18.971');
INSERT INTO "User" ("id","name","email","password","role","theme","createdAt","updatedAt") VALUES ('cmm4b7jmr0001145fjpyls67w','N A Loganathan','adi.logu@gmail.com','$2a$12$5J672hSFY9ZCwdT3XcqYe.sIQNzELqhioZDk2FqWXlrVF8uf.hWl6','ADMIN','light','2026-02-26 21:35:14.019','2026-03-11 10:41:18.971');
INSERT INTO "User" ("id","name","email","password","role","theme","createdAt","updatedAt") VALUES ('cmm7prb7z0000t395tu51dtrv','Malini Latha M','malinilathascl@gmail.com','$2a$12$rJB1XuXlaSLzohi7moNj0eNsCw6SJ33FKj8vJnhIp3rU.3D4zm0hm','SUPERVISOR','light','2026-03-01 06:45:49.391','2026-03-11 10:41:18.971');

-- Sites
INSERT INTO "Site" ("id","name","location","status","description","startDate","expectedEndDate","expectedRevenue","createdAt","updatedAt") VALUES ('cmm4rvs7l00069jfvwrovq3wh','Vengadamangalam','Chennai, Tamil Nadu','ACTIVE',NULL,'2026-03-06 00:00:00','2026-09-30 00:00:00',NULL,'2026-02-27 05:21:58.546','2026-03-11 10:41:19.31');

-- SiteUser
INSERT INTO "SiteUser" ("id","siteId","userId","createdAt") VALUES ('cmm7hvzp30001e5exlnn3bmxl','cmm4rvs7l00069jfvwrovq3wh','cmm4b7jmr0001145fjpyls67w','2026-03-01 03:05:30.805');
INSERT INTO "SiteUser" ("id","siteId","userId","createdAt") VALUES ('cmm7hw22t0003e5exnfdgkb3p','cmm4rvs7l00069jfvwrovq3wh','cmm4b6ko30000145fg7gsmyk0','2026-03-01 03:05:33.75');
INSERT INTO "SiteUser" ("id","siteId","userId","createdAt") VALUES ('cmm7q2pq70001k0bvz64f0vk8','cmm4rvs7l00069jfvwrovq3wh','cmm7prb7z0000t395tu51dtrv','2026-03-01 06:54:41.406');

-- BudgetEntry
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmm7f7kaq0001m0oyuhn2z9bd','cmm4rvs7l00069jfvwrovq3wh',5000,'Plan Approval','cmm4b7jmr0001145fjpyls67w','2026-03-01 01:50:31.871','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmm7f7xz00003m0oyu70jz2rq','cmm4rvs7l00069jfvwrovq3wh',7000,'EB Connection','cmm4b7jmr0001145fjpyls67w','2026-03-01 01:50:49.444','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmm7f8bs60005m0oyzkeibha2','cmm4rvs7l00069jfvwrovq3wh',3000,'Tent','cmm4b7jmr0001145fjpyls67w','2026-03-01 01:51:07.313','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmm7ogp5q0001bubn04dvzc0d','cmm4rvs7l00069jfvwrovq3wh',2000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-01 06:09:34.462','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmasvxvk0001p59ldnp8pqae','cmm4rvs7l00069jfvwrovq3wh',2000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-03 10:36:42.601','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmbtf3a4000gw7bhj0kzn51j','cmm4rvs7l00069jfvwrovq3wh',16200,'Tent Payment and Ladder Rent','cmm4b7jmr0001145fjpyls67w','2026-03-04 03:39:22.242','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmd8zi8b0001etmg6864ytzx','cmm4rvs7l00069jfvwrovq3wh',45565,'Borewell Expenses','cmm4b7jmr0001145fjpyls67w','2026-03-05 03:42:55.16','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmf5xzdh0001kul7smlvtl2o','cmm4rvs7l00069jfvwrovq3wh',2000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-06 11:53:17.565','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmf5ywda0003kul7ohf1u7vy','cmm4rvs7l00069jfvwrovq3wh',44000,'Borewell, Motor & Fittings','cmm4b7jmr0001145fjpyls67w','2026-03-06 11:54:00.333','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmf5zbh50005kul7s6kithke','cmm4rvs7l00069jfvwrovq3wh',3600,'Temporary EB Connection Material','cmm4b7jmr0001145fjpyls67w','2026-03-06 11:54:19.906','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmf5zldh0007kul79vo0is0n','cmm4rvs7l00069jfvwrovq3wh',720,'Food','cmm4b7jmr0001145fjpyls67w','2026-03-06 11:54:32.886','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmf6lqrp000hdw9sv2jzgrw5','cmm4rvs7l00069jfvwrovq3wh',1000,'Car Petrol','cmm4b7jmr0001145fjpyls67w','2026-03-06 12:11:46.128','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmgkvjir000110gv8x0iuf86','cmm4rvs7l00069jfvwrovq3wh',1000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:39:04.119','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmgkxbgx000310gvkrezp0jr','cmm4rvs7l00069jfvwrovq3wh',3570,'Plumbing & Electrical Materials','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:40:27','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmgkxva7000510gvwssf7bv1','cmm4rvs7l00069jfvwrovq3wh',10800,'Block Stone','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:40:52.679','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmgkybxx000710gvmtwtuwda','cmm4rvs7l00069jfvwrovq3wh',1350,'Logu Scooty Tyre','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:41:14.275','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmgkz9g3000910gv23x1kjjj','cmm4rvs7l00069jfvwrovq3wh',5800,'Labour','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:41:57.69','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmgljl780001b7u97vclb2n8','cmm4rvs7l00069jfvwrovq3wh',367,'Fuel (Varuni)','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:57:46.043','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmh7jvii000kjq5l4idc6b23','cmm4rvs7l00069jfvwrovq3wh',3000,'Labour','cmm4b7jmr0001145fjpyls67w','2026-03-07 22:13:50.959','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmjat1ox00016m1313h6erm1','cmm4rvs7l00069jfvwrovq3wh',13400,'Chavkhu Kombu','cmm4b7jmr0001145fjpyls67w','2026-03-09 09:20:30.038','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmjatlek00036m1314r25etn','cmm4rvs7l00069jfvwrovq3wh',175000,'Tata TMT Bar','cmm4b7jmr0001145fjpyls67w','2026-03-09 09:20:55.621','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmjau2vz00056m13og1dvw23','cmm4rvs7l00069jfvwrovq3wh',15000,'Cement Bags (50 Nos)','cmm4b7jmr0001145fjpyls67w','2026-03-09 09:21:18.283','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmjaubk300076m13n33ottak','cmm4rvs7l00069jfvwrovq3wh',5000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-09 09:21:29.667','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmktm3xj000dnqbcn0sv6tgp','cmm4rvs7l00069jfvwrovq3wh',21040,'Steel Remaining Amount','cmm4b7jmr0001145fjpyls67w','2026-03-10 10:54:45.269','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmktn76z000fnqbcdgpfiipp','cmm4rvs7l00069jfvwrovq3wh',16360,'Rod Cutting Machine','cmm4b7jmr0001145fjpyls67w','2026-03-10 10:55:35.309','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmktnpf7000hnqbcdiwzu4uw','cmm4rvs7l00069jfvwrovq3wh',3000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-10 10:55:59.771','2026-03-11 10:41:19.896',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmn7dpo5004nshmuejtxxywi','cmm4rvs7l00069jfvwrovq3wh',24800,'M-Sand & Jelly (Vendor 1)','cmm4b7jmr0001145fjpyls67w','2026-03-12 08:25:40.479','2026-03-12 08:25:40.479',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmn7e54k004pshmujcdrwg45','cmm4rvs7l00069jfvwrovq3wh',23000,'M-Sand & Jelly (Vendor 2)','cmm4b7jmr0001145fjpyls67w','2026-03-12 08:26:00.692','2026-03-12 08:26:00.692',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmn7eie3004rshmumc8fe0qx','cmm4rvs7l00069jfvwrovq3wh',1500,'Materials & Labour','cmm4b7jmr0001145fjpyls67w','2026-03-12 08:26:17.712','2026-03-12 08:26:17.712',NULL,FALSE,NULL,NULL,NULL);
INSERT INTO "BudgetEntry" ("id","siteId","amount","note","createdById","createdAt","updatedAt","editedById","isVoided","voidedAt","voidedById","voidReason") VALUES ('cmmn7f83a004tshmubz2spcpm','cmm4rvs7l00069jfvwrovq3wh',17000,'Regular Expense','cmm4b7jmr0001145fjpyls67w','2026-03-12 08:26:51.026','2026-03-12 08:26:51.026',NULL,FALSE,NULL,NULL,NULL);

-- DailyRecord
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmm7fafo0000226udcp9btfoi','cmm4rvs7l00069jfvwrovq3wh','2026-02-26',0,0,5000,5000,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-01 01:52:45.841','2026-03-11 10:41:20.836');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmm7fbe6v000626ud3qqtcvbp','cmm4rvs7l00069jfvwrovq3wh','2026-02-27',0,0,7000,7000,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-01 01:53:30.583','2026-03-11 10:41:20.836');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmm7yzl5e000rv1vns8akcvzj','cmm4rvs7l00069jfvwrovq3wh','2026-03-01',1000,0,3900,4900,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-01 11:04:12.051','2026-03-11 10:41:20.836');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmbtdkko0008w7bhi3pq1bbn','cmm4rvs7l00069jfvwrovq3wh','2026-03-04',0,1200,15590,16790,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-04 03:38:11.496','2026-03-11 10:41:20.836');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmd9nyq6000v9h85bzydfewq','cmm4rvs7l00069jfvwrovq3wh','2026-03-05',0,2800,43215,46015,'Borewell Expenses','cmm4b7jmr0001145fjpyls67w','2026-03-05 04:01:56.43','2026-03-11 10:41:20.836');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmglkdrl0004b7u97e8lr080','cmm4rvs7l00069jfvwrovq3wh','2026-03-06',1400,100,52061,53561,'Pooja Expenses','cmm4b7jmr0001145fjpyls67w','2026-03-07 11:58:23.217','2026-03-12 06:23:44.685');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmh7izi80002jq5leohlw20v','cmm4rvs7l00069jfvwrovq3wh','2026-03-07',6400,11880,5507,23787,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-07 22:13:09.632','2026-03-12 07:49:39.002');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmkue6j9001a11n97pqzprqu','cmm4rvs7l00069jfvwrovq3wh','2026-03-09',0,215256,13100,228356,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-10 11:16:35.158','2026-03-12 07:45:34.356');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmkukvjr0002nxu0im69lmyz','cmm4rvs7l00069jfvwrovq3wh','2026-03-10',0,16360,2690,19050,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-10 11:21:47.511','2026-03-12 08:33:45.3');
INSERT INTO "DailyRecord" ("id","siteId","date","totalLabour","totalMaterial","totalOther","grandTotal","notes","createdById","createdAt","updatedAt") VALUES ('cmmn6hhkl0036shmuub3oufis','cmm4rvs7l00069jfvwrovq3wh','2026-03-11',15200,48626.65,3220,67046.65,NULL,'cmm4b7jmr0001145fjpyls67w','2026-03-12 08:00:37.173','2026-03-12 08:13:12.001');

-- Labour
INSERT INTO "Labour" ("id","name","designation","dailyWage","active","labourType","createdAt","updatedAt") VALUES ('cmm4rsfie00029jfvw91bnfbn','Ramesh','Barpenter',1500,TRUE,'REGULAR','2026-02-27 05:19:22.159','2026-03-12 08:28:38.82');
INSERT INTO "Labour" ("id","name","designation","dailyWage","active","labourType","createdAt","updatedAt") VALUES ('cmm7yvbjj000fv1vnxxhvywzr','Gopi','Mason',1400,TRUE,'REGULAR','2026-03-01 11:00:52.823','2026-03-11 10:41:20.23');
INSERT INTO "Labour" ("id","name","designation","dailyWage","active","labourType","createdAt","updatedAt") VALUES ('cmmgl1iyi000a10gvvrd4wl6x','Moorthy','Plumber',3000,TRUE,'ONCALL','2026-03-07 11:43:43.328','2026-03-11 10:41:20.23');
INSERT INTO "Labour" ("id","name","designation","dailyWage","active","labourType","createdAt","updatedAt") VALUES ('cmmgl2f8j000b10gv586p1ddj','Devaraj','Electrician',2000,TRUE,'ONCALL','2026-03-07 11:44:25.159','2026-03-11 10:41:20.23');
INSERT INTO "Labour" ("id","name","designation","dailyWage","active","labourType","createdAt","updatedAt") VALUES ('cmmn6gdnf0033shmuhn5ppdhc','Concrete Gang','Concrete & Earthwork',15000,TRUE,'ONCALL','2026-03-12 07:59:45.248','2026-03-12 07:59:45.248');

-- LabourEntry
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmm7yzl5e000tv1vnrv3fgu7q','cmm7yzl5e000rv1vns8akcvzj','cmm7yvbjj000fv1vnxxhvywzr',1000,1000,TRUE,TRUE,'2026-03-08 00:00:00','2026-03-01 11:04:12.051');
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmmglkdrl0006b7u90xed6rqw','cmmglkdrl0004b7u97e8lr080','cmm7yvbjj000fv1vnxxhvywzr',1400,1400,TRUE,TRUE,'2026-03-08 00:00:00','2026-03-07 11:58:23.217');
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmmh7izi80004jq5l56ayoyyv','cmmh7izi80002jq5leohlw20v','cmmgl2f8j000b10gv586p1ddj',2000,2000,TRUE,TRUE,'2026-03-07 12:00:00','2026-03-07 22:13:09.632');
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmmh7izi80005jq5l6lounlqd','cmmh7izi80002jq5leohlw20v','cmm7yvbjj000fv1vnxxhvywzr',1400,1400,TRUE,TRUE,'2026-03-08 00:00:00','2026-03-07 22:13:09.632');
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmmh7izi80006jq5lnnbdhidf','cmmh7izi80002jq5leohlw20v','cmmgl1iyi000a10gvvrd4wl6x',3000,3000,TRUE,TRUE,'2026-03-07 12:00:00','2026-03-07 22:13:09.632');
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmmn6hi410037shmumc8dyyjt','cmmn6hhkl0036shmuub3oufis','cmmn6gdnf0033shmuhn5ppdhc',15000,15000,TRUE,TRUE,'2026-03-12 08:01:14.248','2026-03-12 08:00:37.873');
INSERT INTO "LabourEntry" ("id","dailyRecordId","labourId","rate","cost","present","isPaid","paidAt","createdAt") VALUES ('cmmn6hi410038shmuicswttte','cmmn6hhkl0036shmuub3oufis','cmmgl2f8j000b10gv586p1ddj',200,200,TRUE,TRUE,'2026-03-12 08:01:26.976','2026-03-12 08:00:37.873');

-- WeeklySalary
INSERT INTO "WeeklySalary" ("id","labourId","weekStart","weekEnd","daysWorked","totalWage","advanceDeducted","netPaid","paidAt","paidById","notes","createdAt") VALUES ('cmmn6i9m1003bshmunm4h9t0n','cmmn6gdnf0033shmuhn5ppdhc','2026-03-09','2026-03-15',1,15000,0,15000,'2026-03-12 08:01:13.513','cmm4b7jmr0001145fjpyls67w','Paid on 11th-March-2026','2026-03-12 08:01:13.513');
INSERT INTO "WeeklySalary" ("id","labourId","weekStart","weekEnd","daysWorked","totalWage","advanceDeducted","netPaid","paidAt","paidById","notes","createdAt") VALUES ('cmmn6ijha003eshmuqcv6x7kg','cmmgl2f8j000b10gv586p1ddj','2026-03-09','2026-03-15',1,200,0,200,'2026-03-12 08:01:26.302','cmm4b7jmr0001145fjpyls67w',NULL,'2026-03-12 08:01:26.302');
INSERT INTO "WeeklySalary" ("id","labourId","weekStart","weekEnd","daysWorked","totalWage","advanceDeducted","netPaid","paidAt","paidById","notes","createdAt") VALUES ('migrated-salary-devaraj-mar7','cmmgl2f8j000b10gv586p1ddj','2026-03-07','2026-03-07',1,2000,0,2000,'2026-03-07 12:00:00','cmm4b7jmr0001145fjpyls67w','On-call worker. Migrated from old system.','2026-03-07 12:00:00');
INSERT INTO "WeeklySalary" ("id","labourId","weekStart","weekEnd","daysWorked","totalWage","advanceDeducted","netPaid","paidAt","paidById","notes","createdAt") VALUES ('migrated-salary-gopi-wk1','cmm7yvbjj000fv1vnxxhvywzr','2026-03-01','2026-03-07',3,3800,0,3800,'2026-03-08 00:00:00','cmm4b7jmr0001145fjpyls67w','Migrated. 3 days: 01-Mar(₹1000), 06-Mar(₹1400), 07-Mar(₹1400)','2026-03-08 00:00:00');
INSERT INTO "WeeklySalary" ("id","labourId","weekStart","weekEnd","daysWorked","totalWage","advanceDeducted","netPaid","paidAt","paidById","notes","createdAt") VALUES ('migrated-salary-moorthy-mar7','cmmgl1iyi000a10gvvrd4wl6x','2026-03-07','2026-03-07',1,3000,0,3000,'2026-03-07 12:00:00','cmm4b7jmr0001145fjpyls67w','On-call worker. Migrated from old system.','2026-03-07 12:00:00');

-- LabourAdvance
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn31rpv0019xs5fvnyg8mc0','cmm7yvbjj000fv1vnxxhvywzr',1000,'Advance on 7th-March-2026','cmmh7izi80002jq5leohlw20v',FALSE,NULL,NULL,'2026-03-12 06:24:24.978');
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn32vyp001jxs5fimeflfzk','cmm7yvbjj000fv1vnxxhvywzr',200,'Advance on 10th-March-2026','cmmkukvjr0002nxu0im69lmyz',FALSE,NULL,NULL,'2026-03-12 06:25:17.138');
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn3434y001qxs5fzrxfvq5v','cmm4rsfie00029jfvw91bnfbn',1500,'Advance on 9th-March-2026','cmmkue6j9001a11n97pqzprqu',FALSE,NULL,NULL,'2026-03-12 06:26:13.09');
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn34tlx001vxs5fljnrddln','cmm4rsfie00029jfvw91bnfbn',2000,'Advance on 10th-March-2026','cmmkukvjr0002nxu0im69lmyz',FALSE,NULL,NULL,'2026-03-12 06:26:47.397');
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn5vzie0019shmuvkxvwyhi','cmm7yvbjj000fv1vnxxhvywzr',570,'Advance on 9th-March-2026','cmmkue6j9001a11n97pqzprqu',FALSE,NULL,NULL,'2026-03-12 07:43:53.991');
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn6j60v003hshmusp1znjcf','cmm7yvbjj000fv1vnxxhvywzr',300,'Advance on 11th-March-2026','cmmn6hhkl0036shmuub3oufis',FALSE,NULL,NULL,'2026-03-12 08:01:55.519');
INSERT INTO "LabourAdvance" ("id","labourId","amount","reason","dailyRecordId","isSettled","settledAt","weeklyPayId","createdAt") VALUES ('cmmn6lcj1003mshmumn0u4rrl','cmm4rsfie00029jfvw91bnfbn',2500,'Advance on 11th-March-2026','cmmn6hhkl0036shmuub3oufis',FALSE,NULL,NULL,'2026-03-12 08:03:37.262');

-- Material
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmbtcjct0000vteytn9ir2n1','Ladder','Nos',1200,'Equipment','2026-03-04 03:37:23.111','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmd9kq04000q9h85lhq0dy3n','Hardware Civil Material','NA',100,'Masonry','2026-03-05 03:59:24.251','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmd9lspt000r9h85fs0cecpv','Hardware Plumbing Materials','NA',100,'Plumbing','2026-03-05 04:00:15.182','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmd9mi4q000s9h85gibwkfrg','Hardware Electrical Material','NA',100,'Electrical','2026-03-05 04:00:48.117','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmjawax600086m13is43hk73','Chavkhu Kombu','Kilo Gram',134,'Wood & Timber','2026-03-09 09:23:02.003','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmjaxunm00096m133bth19e2','Cement Bags','Nos',300,'Masonry','2026-03-09 09:24:13.505','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmjbltvr00009bb7dmrgwe7f','8 MM Tata Tiscon FE550SD (S)','Nos',383,'Steel','2026-03-09 09:42:52.976','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmjbnh0d00019bb7y27gk9ss','10 MM Tata Tiscon FE550SD (S)','Nos',591,'Steel','2026-03-09 09:44:09.579','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmjboj1600029bb7xweemsvt','12 MM Tata Tiscon FE550SD (S)','Nos',800,'Steel','2026-03-09 09:44:58.883','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmjbr91f0000dsc17l7bbetp','MS Wire','Kilo Gram',276.8,'Steel','2026-03-09 09:47:06.046','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmkte9490000ln2s9tfizf40','16 MM Tata Tiscon FE550SD (S)','Nos',1303.95,'Steel','2026-03-10 10:48:38.741','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmktqe2f000inqbc36e327as','Rod Cutting Machine','Nos',16360,'Cement & Binding','2026-03-10 10:58:05.025','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmn68e9o002nshmuwq7ndct6','M-Sand','Ton',1130,'Aggregate','2026-03-12 07:53:32.989','2026-03-12 07:53:32.989');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmn69621002oshmu3oif69s9','1½ Jelly','Ton',949,'Aggregate','2026-03-12 07:54:08.809','2026-03-12 07:54:08.809');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmn69r54002pshmu9tm3dxq5','¾ Jelly','Ton',878,'Aggregate','2026-03-12 07:54:36.16','2026-03-12 07:54:36.16');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('cmmn6ag5b002qshmuwss82sfd','Water Barrel','Nos',800,'Other','2026-03-12 07:55:08.57','2026-03-12 07:55:08.57');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('migrated-mat-silver-wood','Silver Wood Plank','Nos',800,'Wood & Timber','2026-03-08 18:30:00','2026-03-11 10:41:20.528');
INSERT INTO "Material" ("id","name","unit","defaultRate","category","createdAt","updatedAt") VALUES ('migrated-mat-solid-block','Solid Block Stone','Nos',43.2,'Masonry','2026-03-06 18:30:00','2026-03-11 10:41:20.528');

-- MaterialEntry
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmbtdkko000aw7bhwlfey84z','cmmbtdkko0008w7bhi3pq1bbn','cmmbtcjct0000vteytn9ir2n1',1,1200,1200,'2026-03-04 03:38:11.496');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmd9nyq6000x9h858z550ous','cmmd9nyq6000v9h85bzydfewq','cmmd9kq04000q9h85lhq0dy3n',1,2800,2800,'2026-03-05 04:01:56.43');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmglkdrl0008b7u9ls707iud','cmmglkdrl0004b7u97e8lr080','cmmd9lspt000r9h85fs0cecpv',1,100,100,'2026-03-07 11:58:23.217');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001eshmu3v40k2e1','cmmkue6j9001a11n97pqzprqu','cmmjawax600086m13is43hk73',100,134,13400,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001fshmuy2bgpck9','cmmkue6j9001a11n97pqzprqu','cmmjaxunm00096m133bth19e2',50,300,15000,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001gshmuhfb5zi3i','cmmkue6j9001a11n97pqzprqu','cmmjbltvr00009bb7dmrgwe7f',100,383,38300,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001hshmuxc156aco','cmmkue6j9001a11n97pqzprqu','cmmjbnh0d00019bb7y27gk9ss',60,591,35460,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001ishmut2uo5zum','cmmkue6j9001a11n97pqzprqu','cmmjboj1600029bb7xweemsvt',60,800,48000,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001jshmux16ayhup','cmmkue6j9001a11n97pqzprqu','cmmjbr91f0000dsc17l7bbetp',25,276.8,6920,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001kshmu9rjomtzl','cmmkue6j9001a11n97pqzprqu','cmmkte9490000ln2s9tfizf40',44,1304,57376,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn5y4yc001lshmucsipepgm','cmmkue6j9001a11n97pqzprqu','migrated-mat-silver-wood',1,800,800,'2026-03-12 07:45:34.356');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn63dq2002bshmucj52pwch','cmmh7izi80002jq5leohlw20v','migrated-mat-solid-block',250,43.2,10800,'2026-03-12 07:49:39.002');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn63dq2002cshmux70d9ewi','cmmh7izi80002jq5leohlw20v','cmmjawax600086m13is43hk73',1,280,280,'2026-03-12 07:49:39.002');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn63dq2002dshmuqxmuxapa','cmmh7izi80002jq5leohlw20v','cmmd9lspt000r9h85fs0cecpv',1,220,220,'2026-03-12 07:49:39.002');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn63dq2002eshmud4a2fnf5','cmmh7izi80002jq5leohlw20v','cmmd9mi4q000s9h85gibwkfrg',1,300,300,'2026-03-12 07:49:39.002');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn63dq2002fshmuyj1h0q3p','cmmh7izi80002jq5leohlw20v','cmmd9mi4q000s9h85gibwkfrg',1,280,280,'2026-03-12 07:49:39.002');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn6xo02003ushmu5sh3u39i','cmmn6hhkl0036shmuub3oufis','cmmn69621002oshmu3oif69s9',8.43,949,8000.07,'2026-03-12 08:13:12.001');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn6xo02003vshmul64ttiox','cmmn6hhkl0036shmuub3oufis','cmmn68e9o002nshmuwq7ndct6',25.68,1130,29018.4,'2026-03-12 08:13:12.001');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn6xo02003wshmu0wzpwrwo','cmmn6hhkl0036shmuub3oufis','cmmn69r54002pshmu9tm3dxq5',12.31,878,10808.18,'2026-03-12 08:13:12.001');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn6xo02003xshmur6qv6d0m','cmmn6hhkl0036shmuub3oufis','cmmn6ag5b002qshmuwss82sfd',1,800,800,'2026-03-12 08:13:12.001');
INSERT INTO "MaterialEntry" ("id","dailyRecordId","materialId","quantity","rate","total","createdAt") VALUES ('cmmn7o3mc004wshmui1w4v8jm','cmmkukvjr0002nxu0im69lmyz','cmmktqe2f000inqbc36e327as',1,16360,16360,'2026-03-12 08:33:45.3');

-- OtherExpense  (corrections applied: [ADV:id] markers + Miscellaneous fix)
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmm7fafo0000326ud32syn9r9','cmm7fafo0000226udcp9btfoi','Admin Expense',5000,'Plan Approval Advance','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmm7fbe6v000726udwh5rhvg9','cmm7fbe6v000626ud3qqtcvbp','Electricals',7000,'EB Temporary Connection','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmm7yzl5e000uv1vn4uu2biqj','cmm7yzl5e000rv1vns8akcvzj','Site Setup',3000,'Tent Advance','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmm7yzl5e000vv1vnytvyawcn','cmm7yzl5e000rv1vns8akcvzj','Fuel',500,'Petrol','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmm7yzl5e000wv1vntq49jgbr','cmm7yzl5e000rv1vns8akcvzj','Food & Tea',200,'Gopi Food','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmm7yzl5e000xv1vnclb6ube2','cmm7yzl5e000rv1vns8akcvzj','Admin Expense',200,'Logu Expense','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmbtdkko000bw7bhpazistwd','cmmbtdkko0008w7bhi3pq1bbn','Fuel',250,'Petrol','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmbtdkko000cw7bhl08b1dyv','cmmbtdkko0008w7bhi3pq1bbn','Food & Tea',100,'Logu Food and Tea Expense','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmbtdkko000dw7bhm838d0tk','cmmbtdkko0008w7bhi3pq1bbn','Food & Tea',240,'Tent Labour Food and Tea','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmbtdkko000ew7bh9xyu811m','cmmbtdkko0008w7bhi3pq1bbn','Site Setup',15000,'Tent Full Amount','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmd9nyq6000y9h85hflwlffz','cmmd9nyq6000v9h85bzydfewq','Site Setup',42500,'Borewell','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmd9nyq6000z9h85rqgwm2sz','cmmd9nyq6000v9h85bzydfewq','Food & Tea',155,'Breakfast','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmd9nyq600109h858hpnkb8d','cmmd9nyq6000v9h85bzydfewq','Pooja & Ceremony',110,'Borewell Pooja Materials','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmd9nyq600119h8535kb7dac','cmmd9nyq6000v9h85bzydfewq','Pooja & Ceremony',50,'Flowers','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmd9nyq600129h85q3vtnjah','cmmd9nyq6000v9h85bzydfewq','Pooja & Ceremony',50,'Additional Pooja Materials (Loganathan)','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmd9nyq600139h85soun4ax7','cmmd9nyq6000v9h85bzydfewq','Pooja & Ceremony',350,'Borewell Datchanai & Borewell Labour Tea Expense','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl0009b7u9fwy5ijem','cmmglkdrl0004b7u97e8lr080','Pooja & Ceremony',530,'Pooja Materials','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000ab7u9gsqpfu8h','cmmglkdrl0004b7u97e8lr080','Pooja & Ceremony',220,'Pooja Sweet','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000bb7u9fy524vg0','cmmglkdrl0004b7u97e8lr080','Pooja & Ceremony',501,'Pooja Datchanai','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000cb7u93fw6iuza','cmmglkdrl0004b7u97e8lr080','Fuel',200,'Logu Petrol','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000db7u9h2fkbnzp','cmmglkdrl0004b7u97e8lr080','Miscellaneous',100,'Gopi Pillow','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000eb7u969kabw7q','cmmglkdrl0004b7u97e8lr080','Pooja & Ceremony',180,'Pooja Bricks','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000fb7u9x81knrqg','cmmglkdrl0004b7u97e8lr080','Miscellaneous',30,'Water','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000gb7u9m0hums4p','cmmglkdrl0004b7u97e8lr080','Miscellaneous',300,'Water Can','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000hb7u9ukijd6uc','cmmglkdrl0004b7u97e8lr080','Miscellaneous',50,'Broom Stick','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000ib7u9w91kxzcl','cmmglkdrl0004b7u97e8lr080','Admin Expense',170,'Logu Expenses','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000jb7u91nnei4nr','cmmglkdrl0004b7u97e8lr080','Pooja & Ceremony',30,'Pooja Material (Bhavesh) - Oil','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000kb7u9u1ade62p','cmmglkdrl0004b7u97e8lr080','Admin Expense',140,'Working Plan Printout & Key Chain','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000lb7u9evwclxye','cmmglkdrl0004b7u97e8lr080','Site Setup',290,'Tent Chain & Lock','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000mb7u96nt0jv0y','cmmglkdrl0004b7u97e8lr080','Food & Tea',720,'Afternoon Food','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000nb7u9pwsggrkm','cmmglkdrl0004b7u97e8lr080','Fuel',1000,'Car Petrol','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000ob7u9hebpmjhr','cmmglkdrl0004b7u97e8lr080','Electricals',3600,'Temporary EB Connection Material','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmglkdrl000pb7u943izsa10','cmmglkdrl0004b7u97e8lr080','Site Setup',44000,'Borewell, Motor & Fittings','2026-03-11 10:41:22.348');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn31raf0017xs5fsfra641g','cmmh7izi80002jq5leohlw20v','Advance',1000,'[ADV:cmmn31rpv0019xs5fvnyg8mc0] Advance to Gopi — Advance on 7th-March-2026','2026-03-12 06:24:24.422');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn32vf4001hxs5fefjrx4z4','cmmkukvjr0002nxu0im69lmyz','Advance',200,'[ADV:cmmn32vyp001jxs5fimeflfzk] Advance to Gopi — Advance on 10th-March-2026','2026-03-12 06:25:16.433');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn342r7001oxs5frq765lwu','cmmkue6j9001a11n97pqzprqu','Advance',1500,'[ADV:cmmn3434y001qxs5fzrxfvq5v] Advance to Ramesh — Advance on 9th-March-2026','2026-03-12 06:26:12.596');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn34t3u001txs5f52nn6rzr','cmmkukvjr0002nxu0im69lmyz','Advance',2000,'[ADV:cmmn34tlx001vxs5fljnrddln] Advance to Ramesh — Advance on 10th-March-2026','2026-03-12 06:26:46.747');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5vztu001bshmuz4bwc564','cmmkue6j9001a11n97pqzprqu','Advance',570,'[ADV:cmmn5vzie0019shmuvkxvwyhi] Advance to Gopi — Advance on 9th-March-2026','2026-03-12 07:43:54.403');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001mshmury82r495','cmmkue6j9001a11n97pqzprqu','Transport',10000,'Steel Bars Delivery Charge','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001nshmukybo2o4l','cmmkue6j9001a11n97pqzprqu','Food & Tea',330,'Ramesh Food','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001oshmugvel88ms','cmmkue6j9001a11n97pqzprqu','Fuel',100,'Petrol','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001pshmuqbglgtxs','cmmkue6j9001a11n97pqzprqu','Admin Expense',160,'Logu Expense','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001qshmudvtcrb0p','cmmkue6j9001a11n97pqzprqu','Equipment & Tools',100,'Welding','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001rshmu8n245w7f','cmmkue6j9001a11n97pqzprqu','Transport',50,'Steel Rod Driver Beta','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001sshmu43oog59u','cmmkue6j9001a11n97pqzprqu','Equipment & Tools',220,'Diagonal Scale','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn5y4yc001tshmu1dbaof9k','cmmkue6j9001a11n97pqzprqu','Equipment & Tools',70,'Chalk Piece','2026-03-12 07:45:34.356');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002gshmudd0gaitk','cmmh7izi80002jq5leohlw20v','Admin Expense',1350,'Logu Scooty Tyre','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002hshmum8dqpyqt','cmmh7izi80002jq5leohlw20v','Fuel',367,'Varuni Petrol','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002ishmu3utm6qly','cmmh7izi80002jq5leohlw20v','Electricals',1600,'Solar Light & Bond','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002jshmu37y9lqaq','cmmh7izi80002jq5leohlw20v','Food & Tea',240,'Lunch','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002kshmu9rakphp2','cmmh7izi80002jq5leohlw20v','Site Setup',650,'Borewell Motor Gate Wall','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002lshmu6m5h0ho7','cmmh7izi80002jq5leohlw20v','Fuel',100,'Logu Petrol','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn63dq2002mshmuy45ixcqv','cmmh7izi80002jq5leohlw20v','Food & Tea',200,'Tea & Snacks','2026-03-12 07:49:39.002');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn6j6af003jshmu0zi4wfo6','cmmn6hhkl0036shmuub3oufis','Advance',300,'[ADV:cmmn6j60v003hshmusp1znjcf] Advance to Gopi — Advance on 11th-March-2026','2026-03-12 08:01:55.863');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn6lcsw003oshmu0tug5e76','cmmn6hhkl0036shmuub3oufis','Advance',2500,'[ADV:cmmn6lcj1003mshmumn0u4rrl] Advance to Ramesh — Advance on 11th-March-2026','2026-03-12 08:03:37.616');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn6xo02003yshmu0gl073z6','cmmn6hhkl0036shmuub3oufis','Transport',50,'Load Beta','2026-03-12 08:13:12.001');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn6xo02003zshmuzl2ploq4','cmmn6hhkl0036shmuub3oufis','Miscellaneous',50,'Water','2026-03-12 08:13:12.001');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn6xo020040shmuw8ho1re8','cmmn6hhkl0036shmuub3oufis','Food & Tea',100,'Tea Expense','2026-03-12 08:13:12.001');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn6xo020041shmuthshefzg','cmmn6hhkl0036shmuub3oufis','Admin Expense',220,'Logu Expense','2026-03-12 08:13:12.001');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn7o3mc004xshmutalywjir','cmmkukvjr0002nxu0im69lmyz','Admin Expense',250,'Logu Expense','2026-03-12 08:33:45.3');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn7o3mc004yshmuco6gt5au','cmmkukvjr0002nxu0im69lmyz','Food & Tea',100,'Tea Expense','2026-03-12 08:33:45.3');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn7o3mc004zshmupnhgmnu1','cmmkukvjr0002nxu0im69lmyz','Equipment & Tools',40,'Welding','2026-03-12 08:33:45.3');
INSERT INTO "OtherExpense" ("id","dailyRecordId","category","amount","description","createdAt") VALUES ('cmmn7o3mc0050shmuibjzu9yg','cmmkukvjr0002nxu0im69lmyz','Miscellaneous',100,'Concrete Gang Token Advance','2026-03-12 08:33:45.3');

COMMIT;

-- ─── 5. VERIFY ROW COUNTS ──────────────────────────────────
SELECT 'AppSettings' AS "table", COUNT(*) AS rows FROM "AppSettings";
SELECT 'User' AS "table", COUNT(*) AS rows FROM "User";
SELECT 'Site' AS "table", COUNT(*) AS rows FROM "Site";
SELECT 'SiteUser' AS "table", COUNT(*) AS rows FROM "SiteUser";
SELECT 'BudgetEntry' AS "table", COUNT(*) AS rows FROM "BudgetEntry";
SELECT 'DailyRecord' AS "table", COUNT(*) AS rows FROM "DailyRecord";
SELECT 'Labour' AS "table", COUNT(*) AS rows FROM "Labour";
SELECT 'LabourEntry' AS "table", COUNT(*) AS rows FROM "LabourEntry";
SELECT 'WeeklySalary' AS "table", COUNT(*) AS rows FROM "WeeklySalary";
SELECT 'LabourAdvance' AS "table", COUNT(*) AS rows FROM "LabourAdvance";
SELECT 'Material' AS "table", COUNT(*) AS rows FROM "Material";
SELECT 'MaterialEntry' AS "table", COUNT(*) AS rows FROM "MaterialEntry";
SELECT 'OtherExpense' AS "table", COUNT(*) AS rows FROM "OtherExpense";