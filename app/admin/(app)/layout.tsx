'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BrandLogo from '@/components/brand/BrandLogo'
import { NAV_ITEMS, filterNav } from '@/lib/rbac/nav'
import type { StaffRole } from '@/lib/auth/types'

function signOut() {
  window.location.href = '/api/auth/logout'
}

type SessionUser = {
  fullName: string
  email?: string
  initials: string
  staffRole: StaffRole
  roleName?: string | null
  isSuperAdmin: boolean
  permissions?: string[]
}

const ROLE_LABEL: Record<StaffRole, string> = {
  DIRECTOR: 'Director',
  CLERK: 'Office Clerk',
  YARD: 'Yard Staff',
  ACCOUNTANT: 'Accountant',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    setCollapsed(localStorage.getItem('dashSidebarCollapsed') === '1')
    const saved = localStorage.getItem('adminTheme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved === 'dark' || (!saved && prefersDark)
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

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
    const root = document.documentElement

    const apply = () => {
      setIsDark(next)
      root.classList.toggle('dark', next)
      localStorage.setItem('adminTheme', next ? 'dark' : 'light')
    }

    const finishTransitionClass = () => {
      root.classList.add('theme-animating')
      window.setTimeout(() => root.classList.remove('theme-animating'), 420)
    }

    // Prefer View Transitions when available (smooth cross-fade of the whole UI).
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> }
    }
    if (
      typeof doc.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      finishTransitionClass()
      doc.startViewTransition(apply)
      return
    }

    finishTransitionClass()
    apply()
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const activeLabel =
    pathname.startsWith('/admin/profile') || pathname.startsWith('/admin/account')
      ? 'My Profile'
      : (NAV_ITEMS.find((n) => isActive(n.href))?.label ?? 'Dashboard')

  const displayName = sessionUser?.fullName || 'Staff'
  const displayRole = sessionUser?.isSuperAdmin
    ? 'Super Admin'
    : sessionUser?.roleName ||
      (sessionUser ? ROLE_LABEL[sessionUser.staffRole] : 'Staff')
  const displayInitials = sessionUser?.initials || 'DX'
  const profileActive = pathname.startsWith('/admin/profile') || pathname.startsWith('/admin/account')

  const visibleNav =
    sessionUser?.isSuperAdmin || !sessionUser?.permissions?.length
      ? NAV_ITEMS
      : filterNav(sessionUser.permissions)

  const now = new Date()
  const hour = now.getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const navBtn = (opts: {
    key: string
    href?: string
    onClick?: () => void
    label: string
    icon: string
    active?: boolean
    danger?: boolean
  }) => (
    <button
      key={opts.key}
      type="button"
      onClick={opts.onClick ?? (() => opts.href && router.push(opts.href))}
      title={collapsed ? opts.label : undefined}
      className={`group relative w-full flex items-center gap-2.5 rounded-lg text-[12px] font-medium leading-tight transition-all ${
        collapsed ? 'justify-center px-1.5 py-1.5' : 'px-2.5 py-1.5'
      } ${
        opts.active
          ? 'bg-white/12 text-white'
          : opts.danger
            ? 'text-secondary-fixed-dim hover:bg-secondary-container/25 hover:text-white'
            : 'text-white/70 hover:bg-secondary-container/15'
      }`}
    >
      {opts.active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-secondary-container"
        />
      )}
      <span
        className={`material-symbols-outlined text-[16px] shrink-0 transition-colors ${
          opts.active
            ? 'icon-fill text-white'
            : opts.danger
              ? 'text-secondary-fixed-dim group-hover:text-white'
              : 'text-white/75 group-hover:text-[#E90809]'
        }`}
      >
        {opts.icon}
      </span>
      {!collapsed && (
        <span
          className={`truncate transition-colors ${
            opts.active || opts.danger ? '' : 'group-hover:text-[#E90809]'
          }`}
        >
          {opts.label}
        </span>
      )}
    </button>
  )

  return (
    <div className="h-screen flex overflow-hidden bg-surface dark:bg-[#071428] text-on-surface dark:text-blue-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`bg-primary-container dark:bg-[#031a4d] text-on-primary fixed left-0 top-0 h-screen flex flex-col z-50 border-r border-white/[0.06] dark:border-white/[0.08] shadow-[2px_0_24px_rgba(4,59,169,0.35)] dark:shadow-[2px_0_28px_rgba(2,10,28,0.45)] transition-all duration-300 overflow-hidden ${
          collapsed ? 'w-[60px]' : 'w-52'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand + role under name (Alubonets-style) */}
        <div
          className={`pt-3.5 pb-3 flex items-center gap-2.5 border-b border-white/10 shrink-0 ${
            collapsed ? 'justify-center px-2' : 'px-3'
          }`}
        >
          <BrandLogo variant={collapsed ? 'compact' : 'sidebar'} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-h3 text-[15px] font-bold text-white leading-none tracking-tight">Doxa</p>
              <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">{displayRole}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-px hide-scrollbar">
          {visibleNav.map((item) =>
            navBtn({
              key: item.href,
              href: item.href,
              label: item.label,
              icon: item.icon,
              active: isActive(item.href),
            }),
          )}
        </nav>

        {/* Utility footer — no duplicate avatar block */}
        <div className={`py-2 border-t border-white/10 shrink-0 space-y-px px-1.5`}>
          {navBtn({
            key: 'profile',
            href: '/admin/profile',
            label: 'My Profile',
            icon: 'account_circle',
            active: profileActive,
          })}
          {navBtn({
            key: 'sign-out',
            onClick: signOut,
            label: 'Sign Out',
            icon: 'logout',
            danger: true,
          })}
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col h-screen min-h-0 min-w-0 transition-[margin] duration-300 ${
          collapsed ? 'lg:ml-[60px]' : 'lg:ml-52'
        }`}
      >
        <header
          className="bg-surface-container-lowest dark:bg-[#0c1c38] border-b border-outline-variant dark:border-[#1e3a5f] shrink-0 z-40 flex items-center justify-between px-4 md:px-6"
          style={{ height: 52 }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                menu
              </span>
            </button>
            <button
              type="button"
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

            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary dark:text-blue-200/60 dark:hover:bg-primary/20 dark:hover:text-blue-300"
            >
              <span
                key={isDark ? 'light' : 'dark'}
                className="material-symbols-outlined theme-toggle-icon"
                style={{ fontSize: 20 }}
              >
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/notifications')}
              title="Notifications"
              className="relative text-on-surface-variant dark:text-blue-200/60 hover:text-primary dark:hover:text-blue-300 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                notifications
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/profile')}
              className="hidden sm:flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-primary/10 dark:hover:bg-white/10"
              title="My Profile"
            >
              <div className="text-right">
                <p className="text-[12px] font-semibold leading-tight text-[#1D2235] dark:text-blue-50">
                  {displayName}
                </p>
                <p className="text-[10px] text-[#8C929D] dark:text-blue-200/55">{displayRole}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-primary text-[11px] font-bold text-white">
                {displayInitials}
              </div>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container text-white px-3 py-1.5 font-label-bold text-[12px] hover:bg-secondary active:scale-95 transition-all shadow-sm"
              title="Sign out"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                logout
              </span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 md:p-4">{children}</main>
      </div>
    </div>
  )
}
