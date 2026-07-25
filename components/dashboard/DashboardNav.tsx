'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { NavItem } from './DashboardShell'

function isNavActive(pathname: string, href: string, allHrefs: string[]) {
  if (!href || href === '#') return false
  const matches = allHrefs.filter(
    (h) => h && h !== '#' && (pathname === h || pathname.startsWith(`${h}/`))
  )
  if (matches.length === 0) return false
  const best = matches.reduce((a, b) => (a.length >= b.length ? a : b))
  return best === href
}

export default function DashboardNav({
  nav,
  collapsed = false,
}: {
  nav: NavItem[]
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const hrefs = nav.map((n) => n.href || '#')

  return (
    <nav className="flex-1 overflow-y-auto py-sm px-sm space-y-0.5">
      {nav.map((link) => {
        const href = link.href || '#'
        const active = isNavActive(pathname, href, hrefs)
        const className = active
          ? `flex items-center gap-sm px-sm py-[7px] rounded-lg bg-secondary-container/20 text-on-primary font-label-bold text-[13.5px] ${collapsed ? 'justify-center' : ''}`
          : `sidebar-link ${collapsed ? 'justify-center' : ''}`

        return (
          <Link
            key={link.label}
            href={href}
            className={className}
            title={collapsed ? link.label : undefined}
          >
            <span
              className={`relative material-symbols-outlined ${active ? 'text-[17px] text-secondary-container flex-shrink-0' : ''}`}
            >
              {link.icon}
              {collapsed && link.badge ? (
                <span className="absolute -top-1 -right-2 bg-secondary text-white text-[9px] font-bold px-1 rounded-full leading-[13px] font-sans">
                  {link.badge}
                </span>
              ) : null}
            </span>
            {collapsed ? null : link.badge ? (
              <>
                <span className="flex-1">{link.label}</span>
                <span className="bg-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {link.badge}
                </span>
              </>
            ) : (
              link.label
            )}
          </Link>
        )
      })}
    </nav>
  )
}
