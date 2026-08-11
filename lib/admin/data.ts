export type Permission = Record<string, string[]>
export type RoleDef = {
  id: string
  name: string
  description: string
  permissions: Permission
  isSystem?: boolean
}

/** Sidebar — Stage 2: prefer lib/rbac/nav.ts (permission-filtered). */
export { NAV_ITEMS as NAV } from '@/lib/rbac/nav'

export const MODULES: { id: string; label: string; icon: string; actions: string[] }[] = [
  { id: 'clients', label: 'Clients', icon: 'people', actions: ['View', 'Create', 'Edit', 'Suspend / Activate'] },
  { id: 'vehicles', label: 'Vehicles', icon: 'directions_car', actions: ['View', 'Add Vehicle', 'Edit', 'Assign to Owner'] },
  { id: 'bookings', label: 'Bookings & Dispatch', icon: 'assignment', actions: ['View', 'Create Booking', 'Dispatch', 'Extend Hire', 'Check In'] },
  { id: 'owners', label: 'Owners', icon: 'person_pin', actions: ['View', 'Add Owner', 'Pay Out', 'Generate Statement'] },
  { id: 'finance', label: 'Finance', icon: 'account_balance_wallet', actions: ['View', 'Record Income', 'Record Expense', 'Export Reports'] },
  { id: 'notifications', label: 'Notifications', icon: 'notifications', actions: ['View', 'Send Notifications'] },
  { id: 'staff', label: 'Staff & Roles', icon: 'manage_accounts', actions: ['View Staff', 'Manage Staff', 'Manage Roles'] },
]

export const ALL_PERMS: Permission = Object.fromEntries(MODULES.map((m) => [m.id, [...m.actions]]))

export const INIT_ROLES: RoleDef[] = [
  {
    id: 'director',
    name: 'Director / Owner',
    description: 'Full system access.',
    permissions: ALL_PERMS,
    isSystem: true,
  },
  {
    id: 'clerk',
    name: 'Office Clerk',
    description: 'Clients, bookings, dispatch, receipts.',
    permissions: {
      clients: ['View', 'Create', 'Edit', 'Suspend / Activate'],
      vehicles: ['View'],
      bookings: ['View', 'Create Booking', 'Dispatch', 'Extend Hire', 'Check In'],
      notifications: ['View'],
    },
  },
  {
    id: 'yard',
    name: 'Yard Staff',
    description: 'Condition checks, dispatch and check-in.',
    permissions: {
      vehicles: ['View'],
      bookings: ['View', 'Dispatch', 'Check In'],
    },
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Payments, expenses, payouts, reports.',
    permissions: {
      clients: ['View'],
      bookings: ['View'],
      owners: ['View', 'Pay Out', 'Generate Statement'],
      finance: ['View', 'Record Income', 'Record Expense', 'Export Reports'],
    },
  },
]
