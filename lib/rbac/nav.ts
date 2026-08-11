import { PERMISSIONS, type PermissionKey } from './registry'

export type NavItem = {
  href: string
  label: string
  icon: string
  permission: PermissionKey
}

/** Sidebar config — filtered by loaded permission set (Sweet1ne §10). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/admin/clients', label: 'Clients', icon: 'people', permission: PERMISSIONS.CLIENT_VIEW },
  { href: '/admin/vehicles', label: 'Vehicles', icon: 'directions_car', permission: PERMISSIONS.VEHICLE_VIEW },
  { href: '/admin/bookings', label: 'Bookings', icon: 'assignment', permission: PERMISSIONS.BOOKING_VIEW },
  { href: '/admin/owners', label: 'Owners', icon: 'person_pin', permission: PERMISSIONS.OWNER_VIEW },
  { href: '/admin/insta-pay', label: 'Insta Pay', icon: 'bolt', permission: PERMISSIONS.PAYMENT_VIEW },
  { href: '/admin/finance', label: 'Finance', icon: 'account_balance_wallet', permission: PERMISSIONS.PAYMENT_VIEW },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications', permission: PERMISSIONS.MESSAGE_VIEW },
  { href: '/admin/staff', label: 'Staff', icon: 'manage_accounts', permission: PERMISSIONS.STAFF_VIEW },
]

export function filterNav(permissions: Set<string> | PermissionKey[]): NavItem[] {
  const set = permissions instanceof Set ? permissions : new Set(permissions)
  return NAV_ITEMS.filter((item) => set.has(item.permission))
}
