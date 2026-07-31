'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BrandLogo from '@/components/brand/BrandLogo'
import { NAV } from '@/lib/admin/data'
import type { StaffRole } from '@/lib/auth/types'

type SessionUser = {
  fullName: string
  initials: string
  staffRole: StaffRole
  isSuperAdmin: boolean
}

const ROLE_LABEL: Record<StaffRole, string> = {
  DIRECTOR: 'Director',
  CLERK: 'Office Clerk',
  YARD: 'Yard Staff',
  ACCOUNTANT: 'Accountant',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [collapsed,  setCollapsed]  = useState(false)
  const [isDark,     setIsDark]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    setCollapsed(localStorage.getItem('dashSidebarCollapsed') === '1')
    const saved       = localStorage.getItem('adminTheme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark        = saved === 'dark' || (!saved && prefersDark)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('h-full')
    document.body.classList.add('h-full', 'overflow-hidden')
    return () => {
      document.documentElement.classList.remove('h-full')
      document.body.classList.remove('h-full', 'overflow-hidden')
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    let cancelled = false

    async function loadSessionUser() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!response.ok) return

        const payload = (await response.json()) as { user?: SessionUser | null }
        if (!cancelled) setSessionUser(payload.user ?? null)
      } catch {
        // Keep layout usable even if the identity call fails.
      }
    }

    loadSessionUser()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('dashSidebarCollapsed', next ? '1' : '0')
      return next
    })
  }

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('adminTheme', next ? 'dark' : 'light')
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const activeLabel = NAV.find((n) => isActive(n.href))?.label ?? 'Dashboard'
  const displayName = sessionUser?.fullName || 'Staff'
  const displayRole = sessionUser?.isSuperAdmin
    ? 'Super Admin'
    : sessionUser
      ? ROLE_LABEL[sessionUser.staffRole]
      : 'Doxa Car Hire'
  const displayInitials = sessionUser?.initials || 'DX'

  const now    = new Date()
  const hour   = now.getHours()
  const greet  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="h-screen flex overflow-hidden bg-surface dark:bg-[#060c1a] text-on-surface dark:text-blue-50">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={`bg-primary dark:bg-[#0c1e42] text-on-primary fixed left-0 top-0 h-screen flex flex-col z-50 border-r border-white/[0.08] shadow-[2px_0_20px_rgba(0,0,0,0.3)] transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-56'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className={`pt-5 pb-4 flex items-center gap-3 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-3' : 'px-4'}`}>
          <BrandLogo variant={collapsed ? 'compact' : 'sidebar'} />
          {!collapsed && (
            <div>
              <p className="font-h3 text-[17px] font-bold text-white leading-none">Doxa</p>
              <p className="text-[10px] text-white/50 mt-0.5 font-caption tracking-wide">Car Hire Management</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  collapsed ? 'justify-center px-2' : 'px-3'
                } ${
                  active
                    ? 'bg-white/15 text-white border-r-[3px] border-secondary-container'
                    : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] shrink-0 ${active ? 'icon-fill' : ''}`}>
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className={`py-4 border-t border-white/10 shrink-0 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {displayInitials}
              </div>
              <div className="min-w-0">
                <p className="text-white text-[12px] font-semibold truncate">{displayName}</p>
                <p className="text-white/40 text-[10px] truncate">{displayRole}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => router.push('/admin/login')}
            title="Sign Out"
            className={`w-full flex items-center gap-3 py-2 rounded-xl text-white/55 hover:text-white hover:bg-white/10 text-[13px] transition-all group ${collapsed ? 'justify-center px-2' : 'px-3'}`}
          >
            <span className="material-symbols-outlined text-[18px] group-hover:text-secondary-container transition-colors">logout</span>
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col h-screen min-h-0 min-w-0 transition-[margin] duration-300 ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-56'}`}>

        {/* Header */}
        <header
          className="bg-surface-container-lowest dark:bg-[#0d1729] border-b border-outline-variant dark:border-[#1a2d4f] shrink-0 z-40 flex items-center justify-between px-4 md:px-6"
          style={{ height: 52 }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
            </button>
            <button
              onClick={toggleCollapse}
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              className="hidden lg:flex text-on-surface-variant dark:text-blue-200/60 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                {collapsed ? 'menu' : 'menu_open'}
              </span>
            </button>
            <div>
              <p className="font-label-bold text-[14px] font-semibold text-on-surface dark:text-blue-50">
                {activeLabel}
              </p>
              <p className="text-[11px] text-on-surface-variant dark:text-blue-200/40">{greet}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:block text-[11px] text-on-surface-variant dark:text-blue-200/40 font-medium tabular-nums">
              {dateStr}
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="text-on-surface-variant dark:text-blue-200/60 hover:text-primary dark:hover:text-blue-300 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => router.push('/admin/notifications')}
                title="Notifications"
                className="relative text-on-surface-variant dark:text-blue-200/60 hover:text-primary dark:hover:text-blue-300 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
              </button>
            </div>

            {/* User */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-[12px] font-semibold text-on-surface dark:text-blue-50 leading-tight">{displayName}</p>
                <p className="text-[10px] text-on-surface-variant dark:text-blue-200/40">{displayRole}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px] border-2 border-primary/20">
                {displayInitials}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => router.push('/admin/login')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-container/40 bg-secondary-container text-white px-3 py-1.5 font-label-bold text-[12px] hover:opacity-90 active:scale-95 transition-all shadow-sm"
              title="Sign out"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
