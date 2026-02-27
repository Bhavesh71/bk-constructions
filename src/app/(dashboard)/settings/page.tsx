import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Building2, Shield, Database } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-gray-900 text-2xl">Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">System configuration and information</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">System Info</h3>
              <p className="text-xs text-gray-400">{BRAND.name} v1.0</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Application', value: BRAND.name },
              { label: 'Version', value: '1.0.0' },
              { label: 'Framework', value: 'Next.js 14 (App Router)' },
              { label: 'Database', value: 'Supabase PostgreSQL' },
              { label: 'ORM', value: 'Prisma 5' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 gradient-emerald rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Your Account</h3>
              <p className="text-xs text-gray-400">Logged in session</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Name', value: session?.user?.name || 'N/A' },
              { label: 'Email', value: session?.user?.email || 'N/A' },
              { label: 'Role', value: session?.user?.role || 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 gradient-amber rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Setup Guide</h3>
              <p className="text-xs text-gray-400">Quick reference for deployment</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-semibold text-gray-800 mb-1">1. Environment Variables</p>
              <p>Set <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">DATABASE_URL</code>, <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">DIRECT_URL</code>, and <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">NEXTAUTH_SECRET</code> in your Vercel dashboard.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-semibold text-gray-800 mb-1">2. Database Setup</p>
              <p>Run <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">npx prisma db push</code> to sync the schema. Create your first admin account via the Supabase dashboard or the Users page.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-semibold text-gray-800 mb-1">3. Deploy</p>
              <p>Connect your GitHub repo to Vercel. Set environment variables. Deploy. The build command is <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">prisma generate && next build</code>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
