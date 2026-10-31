import { PERMISSIONS, type PermissionKey } from './registry'

export type NavItem = {
  href: string
  label: string
  icon: string
  /** One or more permissions — user needs any of them. */
  permission: PermissionKey | PermissionKey[]
  /** When true, only exact path matches (e.g. Finance vs finance subpages). */
  exact?: boolean
}

/** Sidebar config — filtered by loaded permission set (Sweet1ne §10). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', permission: PERMISSIONS.DASHBOARD_VIEW, exact: true },
  { href: '/admin/clients', label: 'Clients', icon: 'people', permission: PERMISSIONS.CLIENT_VIEW },
  { href: '/admin/vehicles', label: 'Vehicles', icon: 'directions_car', permission: PERMISSIONS.VEHICLE_VIEW },
  { href: '/admin/bookings', label: 'Bookings', icon: 'assignment', permission: PERMISSIONS.BOOKING_VIEW },
  { href: '/admin/owners', label: 'Owners', icon: 'person_pin', permission: PERMISSIONS.OWNER_VIEW },
  { href: '/admin/documents', label: 'Documents', icon: 'folder_open', permission: PERMISSIONS.DOC_VIEW },
  { href: '/admin/insta-pay', label: 'Insta Pay', icon: 'bolt', permission: PERMISSIONS.PAYMENT_VIEW },
  { href: '/admin/finance', label: 'Finance', icon: 'account_balance_wallet', permission: PERMISSIONS.PAYMENT_VIEW },
  { href: '/admin/finance/owner-payouts', label: 'Owner payouts', icon: 'payments', permission: PERMISSIONS.PAYMENT_VIEW },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: 'settings',
    permission: [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.STAFF_VIEW],
  },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications', permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/admin/communications', label: 'Communications', icon: 'forum', permission: PERMISSIONS.MESSAGE_VIEW },
]

function navPermissionKeys(item: NavItem): PermissionKey[] {
  return Array.isArray(item.permission) ? item.permission : [item.permission]
}

/** Active nav highlight — prefer longest matching href; respect `exact`. */
export function navItemIsActive(pathname: string, item: Pick<NavItem, 'href' | 'exact'>): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function activeNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | null {
  const matches = items
    .filter((item) => navItemIsActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)
  return matches[0] ?? null
}

export function activeNavLabel(pathname: string, items: NavItem[] = NAV_ITEMS): string | null {
  return activeNavItem(pathname, items)?.label ?? null
}

export function filterNav(permissions: Set<string> | PermissionKey[]): NavItem[] {
  const set = permissions instanceof Set ? permissions : new Set(permissions)
  return NAV_ITEMS.filter((item) => navPermissionKeys(item).some((key) => set.has(key)))
}
