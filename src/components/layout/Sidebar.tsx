'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Users,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  UserCircle2,
  Shield,
  X,
  History,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { BRAND } from '@/lib/brand'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sites', label: 'Sites', icon: MapPin },
  { href: '/daily-entry', label: 'Daily Entry', icon: ClipboardList },
  { href: '/records', label: 'Record History', icon: History },
  { href: '/labour', label: 'Labour', icon: Users },
  { href: '/materials', label: 'Materials', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const adminItems = [
  { href: '/users', label: 'Users', icon: UserCircle2 },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[260px] bg-sidebar flex flex-col z-50 transition-transform duration-300',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <Image
                src={BRAND.logo}
                alt={BRAND.name}
                width={60}
                height={60}
                priority
              />
            </div>
            <div className="min-w-0 leading-tight flex flex-col justify-center">
              <p className="font-display font-semibold text-white text-sm truncate">{BRAND.name}</p>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{BRAND.tagline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="sidebar-section-label mb-2">Main</p>

          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn('sidebar-item', isActive(href) && 'active')}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive(href) ? 2.5 : 2} />
              <span className="flex-1">{label}</span>
              {isActive(href) && <ChevronRight className="w-3.5 h-3.5" />}
            </Link>
          ))}

          {isAdmin && (
            <>
              <p className="sidebar-section-label mt-4 mb-2">Admin</p>
              {adminItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn('sidebar-item', isActive(href) && 'active')}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive(href) && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/30 flex items-center justify-center text-primary-300 text-xs font-bold flex-shrink-0">
              {getInitials(session?.user?.name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{session?.user?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-primary-400" />
                <span className="text-primary-400 text-[10px] font-semibold uppercase tracking-wide">
                  {session?.user?.role}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
