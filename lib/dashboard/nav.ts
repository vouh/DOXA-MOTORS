import type { NavItem } from '@/components/dashboard/DashboardShell'
import type { Role } from '@/lib/auth/types'

const NOTIFICATIONS_NAV: NavItem = {
  icon: 'notifications',
  label: 'Notifications',
  href: '/announcements',
}

export const ADMIN_NAV: NavItem[] = [
  { icon: 'dashboard', label: 'Overview', href: '/admin' },
  { icon: 'group', label: 'Staff', href: '/admin/members' },
  { icon: 'pending_actions', label: 'Approvals', href: '/admin/approvals' },
  { icon: 'admin_panel_settings', label: 'Roles', href: '/admin/roles' },
  { icon: 'history', label: 'Activity logs', href: '/admin/audit-logs' },
  NOTIFICATIONS_NAV,
]

export const EXECUTIVE_NAV: NavItem[] = [
  { icon: 'dashboard', label: 'Overview', href: '/dashboard/executive' },
  { icon: 'people', label: 'Clients', href: '/dashboard/executive/projects' },
  { icon: 'payments', label: 'Finance', href: '/contributions' },
  NOTIFICATIONS_NAV,
]

export const TREASURER_NAV: NavItem[] = [
  { icon: 'dashboard', label: 'Overview', href: '/dashboard/treasurer' },
  { icon: 'payments', label: 'Payments', href: '/dashboard/treasurer/contributions' },
  { icon: 'receipt_long', label: 'Expenses', href: '/dashboard/treasurer/welfare' },
  { icon: 'notifications', label: 'Notifications', href: '/dashboard/treasurer/notifications' },
]

export const SECRETARY_NAV: NavItem[] = [
  { icon: 'dashboard', label: 'Overview', href: '/dashboard/secretary' },
  { icon: 'book_online', label: 'Bookings', href: '/dashboard/secretary/meetings' },
  NOTIFICATIONS_NAV,
]

export const ORGANIZER_NAV: NavItem[] = [
  { icon: 'dashboard', label: 'Overview', href: '/dashboard/organizer' },
  { icon: 'directions_car', label: 'Vehicles', href: '/dashboard/organizer/projects' },
  { icon: 'local_parking', label: 'Fleet Status', href: '/dashboard/organizer/events' },
  NOTIFICATIONS_NAV,
]

export const MEMBER_NAV: NavItem[] = [
  { icon: 'home', label: 'Home', href: '/dashboard/member' },
  { icon: 'book_online', label: 'My Bookings', href: '/contributions' },
  NOTIFICATIONS_NAV,
]

export function navForRole(role: Role): NavItem[] {
  switch (role) {
    case 'ADMIN':
      return ADMIN_NAV
    case 'EXECUTIVE':
      return EXECUTIVE_NAV
    case 'TREASURER':
      return TREASURER_NAV
    case 'SECRETARY':
      return SECRETARY_NAV
    case 'ORGANIZER':
      return ORGANIZER_NAV
    case 'MEMBER':
    default:
      return MEMBER_NAV
  }
}
