'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BrandLogo from '@/components/brand/BrandLogo'
import BookingIntelligenceLayer from '@/components/admin/BookingIntelligenceLayer'
import { NAV_ITEMS, activeNavItem, activeNavLabel, filterNav } from '@/lib/rbac/nav'
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

const SIDEBAR_MIN = 60
const SIDEBAR_MAX = 360
const SIDEBAR_DEFAULT = 208
/** At or below this width, labels hide (icon-only mode). */
const ICON_MODE_MAX = 72

function clampWidth(w: number) {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)))
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [dragging, setDragging] = useState(false)
  const [isLg, setIsLg] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [notifBadge, setNotifBadge] = useState(0)
  const lastExpandedRef = useRef(SIDEBAR_DEFAULT)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(SIDEBAR_DEFAULT)

  const collapsed = isLg && sidebarWidth <= ICON_MODE_MAX

  const persistWidth = useCallback((w: number) => {
    const next = clampWidth(w)
    localStorage.setItem('dashSidebarWidth', String(next))
    localStorage.setItem('dashSidebarCollapsed', next <= ICON_MODE_MAX ? '1' : '0')
    if (next > ICON_MODE_MAX) lastExpandedRef.current = next
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsLg(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const savedW = Number(localStorage.getItem('dashSidebarWidth'))
    if (Number.isFinite(savedW) && savedW >= SIDEBAR_MIN && savedW <= SIDEBAR_MAX) {
      setSidebarWidth(savedW)
      if (savedW > ICON_MODE_MAX) lastExpandedRef.current = savedW
    } else if (localStorage.getItem('dashSidebarCollapsed') === '1') {
      setSidebarWidth(SIDEBAR_MIN)
    }

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
    const onBadge = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail
      if (typeof detail?.count === 'number') setNotifBadge(detail.count)
    }
    window.addEventListener('doxa:notifications-badge', onBadge)
    return () => window.removeEventListener('doxa:notifications-badge', onBadge)
  }, [])

  useEffect(() => {
    if (!sessionUser) return
    let cancelled = false
    async function loadBadge() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/admin/notifications/badge', {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { count?: number }
        if (!cancelled && typeof data.count === 'number') setNotifBadge(data.count)
      } catch {
        /* ignore */
      }
    }
    void loadBadge()
    const id = window.setInterval(() => void loadBadge(), 60_000)
    const onFocus = () => void loadBadge()
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadBadge()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [sessionUser])

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

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - dragStartX.current
      setSidebarWidth(clampWidth(dragStartWidth.current + delta))
    }
    const onUp = (e: PointerEvent) => {
      const delta = e.clientX - dragStartX.current
      const next = clampWidth(dragStartWidth.current + delta)
      setSidebarWidth(next)
      persistWidth(next)
      setDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, persistWidth])

  const toggleCollapse = () => {
    setSidebarWidth((w) => {
      if (w <= ICON_MODE_MAX) {
        const next = lastExpandedRef.current || SIDEBAR_DEFAULT
        persistWidth(next)
        return next
      }
      lastExpandedRef.current = w
      persistWidth(SIDEBAR_MIN)
      return SIDEBAR_MIN
    })
  }

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth
    setDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
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

  const activeNav = activeNavItem(pathname)

  const activeLabel =
    pathname.startsWith('/admin/profile') || pathname.startsWith('/admin/account')
      ? 'My Profile'
      : (activeNavLabel(pathname) ?? 'Dashboard')

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
      : filterNav(new Set(sessionUser.permissions))

  const now = new Date()
  const hour = now.getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const navClass = (opts: { active?: boolean; danger?: boolean }) =>
    `group relative flex w-full items-center text-[12px] font-medium leading-tight transition-colors duration-200 ${
      collapsed ? 'justify-center px-1.5 py-1' : 'gap-2 px-2.5 py-1'
    } ${
      opts.active
        ? 'dash-nav-cutout text-on-surface'
        : opts.danger
          ? 'mr-1.5 rounded-lg text-secondary-fixed-dim hover:bg-secondary-container/25 hover:text-white'
          : 'mr-1.5 rounded-lg text-white/70 hover:bg-white/[0.08] hover:text-[#E90809]'
    }`

  const navIcon = (opts: { icon: string; active?: boolean; danger?: boolean }) => (
    <span
      className={`material-symbols-outlined text-[16px] shrink-0 transition-colors ${
        opts.active
          ? 'icon-fill text-on-surface'
          : opts.danger
            ? 'text-secondary-fixed-dim group-hover:text-white'
            : 'text-white/75 group-hover:text-[#E90809]'
      }`}
    >
      {opts.icon}
    </span>
  )

  const navLabel = (opts: { label: string; active?: boolean; danger?: boolean }) =>
    !collapsed ? (
      <span
        className={`truncate transition-colors ${
          opts.active
            ? 'font-semibold text-on-surface'
            : opts.danger
              ? ''
              : 'group-hover:text-[#E90809]'
        }`}
      >
        {opts.label}
      </span>
    ) : null

  /** Real links (not router.push buttons) — URL in tooltip, middle-click / open-in-tab works. */
  const navLink = (opts: {
    key: string
    href: string
    label: string
    icon: string
    active?: boolean
  }) => (
    <Link
      key={opts.key}
      href={opts.href}
      prefetch
      aria-current={opts.active ? 'page' : undefined}
      title={`${opts.label} — ${opts.href}`}
      className={navClass({ active: opts.active })}
    >
      {navIcon(opts)}
      {navLabel(opts)}
    </Link>
  )

  const navAction = (opts: {
    key: string
    onClick: () => void
    label: string
    icon: string
    danger?: boolean
  }) => (
    <button
      key={opts.key}
      type="button"
      onClick={opts.onClick}
      title={opts.label}
      className={navClass({ danger: opts.danger })}
    >
      {navIcon(opts)}
      {navLabel(opts)}
    </button>
  )

  return (
    <div
      className="h-screen flex overflow-hidden bg-surface dark:bg-[#071428] text-on-surface dark:text-blue-50"
      style={
        {
          ['--dash-sidebar-w']: `${sidebarWidth}px`,
          ['--dash-cutout']: isDark ? '#071428' : '#F6F8FB',
        } as CSSProperties
      }
    >
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`w-52 lg:w-[var(--dash-sidebar-w)] bg-primary-container dark:bg-[#031a4d] text-on-primary fixed left-0 top-0 h-screen flex flex-col z-50 overflow-x-visible overflow-y-hidden ${
          dragging ? '' : 'transition-[width] duration-200'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
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

        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-visible py-1.5 pl-1.5 pr-0 space-y-0 hide-scrollbar">
          {visibleNav.map((item) =>
            navLink({
              key: item.href,
              href: item.href,
              label: item.label,
              icon: item.icon,
              active: activeNav?.href === item.href,
            }),
          )}
        </nav>

        <div className="py-1.5 border-t border-white/10 shrink-0 space-y-0 pl-1.5 pr-0">
          {navLink({
            key: 'profile',
            href: '/admin/profile',
            label: 'My Profile',
            icon: 'account_circle',
            active: profileActive,
          })}
          {navAction({
            key: 'sign-out',
            onClick: signOut,
            label: 'Sign Out',
            icon: 'logout',
            danger: true,
          })}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          title="Drag to resize"
          onPointerDown={onResizePointerDown}
          className={`absolute top-0 right-0 hidden h-full w-1.5 cursor-col-resize touch-none lg:block ${
            dragging ? 'bg-white/25' : 'bg-transparent hover:bg-white/20'
          }`}
        />
      </aside>

      <div
        className={`relative z-0 flex-1 flex flex-col h-screen min-h-0 min-w-0 bg-surface dark:bg-[#071428] lg:ml-[var(--dash-sidebar-w)] ${
          dragging ? '' : 'transition-[margin] duration-200'
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

            <Link
              href="/admin/notifications"
              prefetch
              title={
                notifBadge
                  ? `${notifBadge} unread — /admin/notifications`
                  : 'Notifications — /admin/notifications'
              }
              className={`relative transition-colors ${
                notifBadge > 0
                  ? 'text-[#E90809] dark:text-[#ff8a8a]'
                  : 'text-on-surface-variant dark:text-blue-200/60 hover:text-primary dark:hover:text-blue-300'
              }`}
            >
              <span
                className={`material-symbols-outlined ${notifBadge > 0 ? 'icon-fill' : ''}`}
                style={{ fontSize: 20 }}
              >
                notifications
              </span>
              {notifBadge > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E90809] px-1 text-[9px] font-bold leading-none text-white">
                  {notifBadge > 99 ? '99+' : notifBadge}
                </span>
              ) : null}
            </Link>

            <Link
              href="/admin/profile"
              prefetch
              className="hidden sm:flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-primary/10 dark:hover:bg-white/10"
              title="My Profile — /admin/profile"
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
            </Link>

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
        <BookingIntelligenceLayer />
      </div>
    </div>
  )
}
