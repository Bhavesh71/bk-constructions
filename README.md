# 🏗 BK Constructions — Operations Management System

An internal, production-ready construction operations management system for small teams (3–6 members). Built with Next.js 14, Supabase, Prisma, and Tailwind CSS.

## ✨ Features

- **Role-Based Access**: Admin (full access) + Supervisor (assigned sites only)
- **Daily Expense Engine**: Labour attendance, material usage, other expenses — all in one form
- **Dynamic Budget System**: Additive budget entries with real-time remaining calculations
- **Site Management**: Create and monitor multiple construction sites with full financial overview
- **Labour Intelligence**: Worker registry, earnings tracking, attendance history
- **Material Tracking**: Categorized materials with usage analytics
- **Reports & Analytics**: Filter, visualize, and export expense data to CSV
- **Beautiful Dashboard**: KPI cards, area charts, bar charts, progress bars
- **Mobile-First**: Responsive design with drawer sidebar for supervisors in the field

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase PostgreSQL |
| ORM | Prisma 5 |
| Auth | NextAuth.js (Credentials) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Validation | Zod |
| Deployment | Vercel (Free) |

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd construction-ops
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
```

**Get database URLs from Supabase:**
1. Go to [supabase.com](https://supabase.com) → Create project
2. Settings → Database → Connection string
3. Use "Transaction" mode URL for `DATABASE_URL` (port 6543)
4. Use "Session" mode URL for `DIRECT_URL` (port 5432)

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Set Up Database

```bash
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Once deployed, create your first admin user directly in the Supabase dashboard by inserting a row into the `User` table with a bcrypt-hashed password (12 rounds).

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Protected pages
│   │   ├── dashboard/         # Main dashboard
│   │   ├── sites/             # Site management
│   │   ├── daily-entry/       # Daily expense form
│   │   ├── labour/            # Labour module
│   │   ├── materials/         # Materials module
│   │   ├── reports/           # Reports & analytics
│   │   ├── users/             # User management (admin)
│   │   └── settings/          # Settings (admin)
│   └── api/auth/              # NextAuth API route
├── actions/                   # Server actions
│   ├── sites.ts
│   ├── daily-records.ts
│   ├── labour.ts
│   ├── materials.ts
│   └── users.ts
├── components/
│   ├── layout/                # Sidebar, TopNav, AuthProvider
│   ├── dashboard/             # KPICard, charts
│   ├── sites/                 # Site components
│   ├── daily-entry/           # DailyEntryForm
│   ├── labour/                # LabourManagement
│   ├── materials/             # MaterialManagement
│   ├── reports/               # ReportsClient
│   └── users/                 # UsersManagement
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # NextAuth config
│   ├── utils.ts               # Utility functions
│   └── validations.ts         # Zod schemas
└── types/
    └── index.ts               # TypeScript types
```

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

The build command is already configured: `prisma generate && next build`

## 💰 Financial Logic

- **Budget**: Sum of all `BudgetEntry.amount` (never a static field)
- **Spent**: Sum of all `DailyRecord.grandTotal` for a site
- **Remaining**: Budget - Spent
- **Corrections**: Add a negative budget entry
- **Daily totals**: Computed server-side in transactions, stored for performance

## 🔐 Security

- All routes protected via NextAuth middleware
- Role-based access control (Admin vs Supervisor)
- Server-side validation with Zod
- Prisma transactions for atomic saves
- bcrypt password hashing (12 rounds)
- Environment variables for all secrets
