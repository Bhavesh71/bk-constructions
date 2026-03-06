'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { BRAND } from '@/lib/brand'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
      } else {
        toast.success('Welcome back!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        {/* Background dot pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, white 2px, transparent 0)`,
              backgroundSize: '50px 50px',
            }}
          />
        </div>
        {/* Gradient orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            width={180}
            height={180}
            // className="rounded-xl object-contain"
            priority
          />
          {/* <span className="font-display font-bold text-white text-xl">{BRAND.name}</span> */}
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display font-bold text-white text-4xl leading-tight">
            BK Constructions<br />
            <span className="text-primary-400">Simplified.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Track daily expenses, manage labour & materials, and monitor budgets across all your construction sites — in one place.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Daily Expense Tracking', 'Budget Management', 'Labour Analytics', 'Material Intelligence'].map((f) => (
              <span key={f} className="px-3 py-1.5 bg-white/10 text-white/80 text-xs font-medium rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="relative text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} {BRAND.name} · Internal Tool
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-6 sm:p-8 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile header: big centered logo + brand name */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8 gap-4">
            <Image
              src={BRAND.logo}
              alt={BRAND.name}
              width={120}
              height={120}
              className="object-contain"
              priority
            />
            <span className="font-display font-bold text-gray-900 dark:text-white text-2xl leading-tight">
              {BRAND.name}
            </span>
          </div>

          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-gray-900 dark:text-white text-3xl mb-1">Sign in</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">Enter your credentials to access the dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-500">
              Contact your administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

