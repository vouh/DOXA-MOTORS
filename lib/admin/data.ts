// Shared types
export type Permission = Record<string, string[]>
export type Role = { id: string; name: string; description: string; permissions: Permission; isSystem?: boolean }
export type StaffAccount = { id: string; name: string; email: string; roleId: string; status: 'Active' | 'Suspended'; lastLogin: string }

// Sidebar navigation — href maps directly to Next.js route
export const NAV = [
  { href: '/admin',               label: 'Dashboard',           icon: 'dashboard'            },
  { href: '/admin/clients',       label: 'Clients',             icon: 'people'               },
  { href: '/admin/vehicles',      label: 'Vehicles',            icon: 'directions_car'       },
  { href: '/admin/bookings',      label: 'Bookings & Dispatch', icon: 'assignment'           },
  { href: '/admin/owners',        label: 'Owners',              icon: 'person_pin'           },
  { href: '/admin/finance',       label: 'Finance & Reports',   icon: 'account_balance_wallet'},
  { href: '/admin/notifications', label: 'Notifications',       icon: 'notifications'        },
  { href: '/admin/staff',         label: 'Staff',               icon: 'manage_accounts'      },
]

// Demo data
export const demoClients = [
  { id: '1', name: 'James Kariuki',  phone: '0712 345 678', email: 'james@gmail.com',  status: 'Active',    trips: 3 },
  { id: '2', name: 'Mary Wanjiru',   phone: '0723 456 789', email: 'mary@gmail.com',   status: 'Active',    trips: 1 },
  { id: '3', name: 'Peter Otieno',   phone: '0734 567 890', email: 'peter@gmail.com',  status: 'Suspended', trips: 0 },
  { id: '4', name: 'Grace Muthoni',  phone: '0745 678 901', email: 'grace@gmail.com',  status: 'Active',    trips: 2 },
  { id: '5', name: 'Samuel Waweru',  phone: '0756 789 012', email: 'samuel@gmail.com', status: 'Active',    trips: 5 },
]

export const demoVehicles = [
  { id: '1', reg: 'KCA 123A', make: 'Toyota Fielder',  owner: 'John Kamau',   status: 'Hired',       client: 'James Kariuki',  days: 5 },
  { id: '2', reg: 'KDB 456B', make: 'Toyota Axio',     owner: 'Jane Njoki',   status: 'Parked',      client: '—',              days: 0 },
  { id: '3', reg: 'KEC 789C', make: 'Nissan Note',     owner: 'Peter Mwangi', status: 'Hired',       client: 'Grace Muthoni',  days: 4 },
  { id: '4', reg: 'KFD 012D', make: 'Toyota Wish',     owner: 'Alice Auma',   status: 'Maintenance', client: '—',              days: 0 },
  { id: '5', reg: 'KGE 345E', make: 'Honda Fit',       owner: 'John Kamau',   status: 'Parked',      client: '—',              days: 0 },
  { id: '6', reg: 'KHF 678F', make: 'Toyota Premio',   owner: 'David Njeru',  status: 'Hired',       client: 'Samuel Waweru',  days: 2 },
]

export const demoBookings = [
  { id: 'BK-001', client: 'James Kariuki', vehicle: 'KCA 123A – Fielder',     from: '20 Jul', to: '25 Jul', rate: 2500, total: 12500, status: 'Active'   },
  { id: 'BK-002', client: 'Grace Muthoni', vehicle: 'KEC 789C – Nissan Note', from: '22 Jul', to: '26 Jul', rate: 2000, total: 8000,  status: 'Active'   },
  { id: 'BK-003', client: 'Samuel Waweru', vehicle: 'KHF 678F – Premio',      from: '23 Jul', to: '25 Jul', rate: 3000, total: 6000,  status: 'Active'   },
  { id: 'BK-004', client: 'Mary Wanjiru',  vehicle: 'KDB 456B – Axio',        from: '18 Jul', to: '21 Jul', rate: 2200, total: 6600,  status: 'Returned' },
]

export const demoOwners = [
  { id: '1', name: 'John Kamau',   phone: '0711 111 111', vehicles: 2, gross: 45000, expenses: 3500, balance: 41500 },
  { id: '2', name: 'Jane Njoki',   phone: '0722 222 222', vehicles: 1, gross: 22000, expenses: 1800, balance: 20200 },
  { id: '3', name: 'Peter Mwangi', phone: '0733 333 333', vehicles: 1, gross: 18000, expenses: 1500, balance: 16500 },
  { id: '4', name: 'Alice Auma',   phone: '0744 444 444', vehicles: 1, gross: 0,     expenses: 0,    balance: 0     },
  { id: '5', name: 'David Njeru',  phone: '0755 555 555', vehicles: 1, gross: 12000, expenses: 1000, balance: 11000 },
]

export const NOTIFS = [
  { icon: 'directions_car', text: 'KCA 123A returned by James Kariuki',    time: '5 min ago',  red: false },
  { icon: 'warning',        text: 'KHF 678F overdue — 1 day late',         time: '1 hr ago',   red: true  },
  { icon: 'payments',       text: 'KES 12,500 received for BK-001',        time: '2 hrs ago',  red: false },
  { icon: 'person_add',     text: 'New client registered: Grace Muthoni',  time: 'Yesterday',  red: false },
]

// Role / permission system
export const MODULES: { id: string; label: string; icon: string; actions: string[] }[] = [
  { id: 'clients',       label: 'Clients',             icon: 'people',                 actions: ['View', 'Create', 'Edit', 'Suspend / Activate', 'Generate Receipt'] },
  { id: 'vehicles',      label: 'Vehicles',            icon: 'directions_car',         actions: ['View', 'Add Vehicle', 'Edit', 'Assign to Owner'] },
  { id: 'bookings',      label: 'Bookings & Dispatch', icon: 'assignment',             actions: ['View', 'Create Booking', 'Dispatch', 'Extend Hire', 'Check In'] },
  { id: 'owners',        label: 'Owners',              icon: 'person_pin',             actions: ['View', 'Add Owner', 'Pay Out', 'Generate Statement'] },
  { id: 'finance',       label: 'Finance',             icon: 'account_balance_wallet', actions: ['View', 'Record Income', 'Record Expense', 'Export Reports'] },
  { id: 'notifications', label: 'Notifications',       icon: 'notifications',          actions: ['View', 'Send Notifications'] },
  { id: 'staff',         label: 'Staff & Roles',       icon: 'manage_accounts',        actions: ['View Staff', 'Manage Staff', 'Manage Roles'] },
]

export const ALL_PERMS: Permission = Object.fromEntries(MODULES.map((m) => [m.id, [...m.actions]]))

export const INIT_ROLES: Role[] = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Full system access — all modules and all actions.',
    permissions: ALL_PERMS,
    isSystem: true,
  },
  {
    id: 'dispatch',
    name: 'Dispatch Officer',
    description: 'Handles vehicle bookings, dispatch, and check-ins.',
    permissions: {
      clients:       ['View', 'Generate Receipt'],
      vehicles:      ['View'],
      bookings:      ['View', 'Create Booking', 'Dispatch', 'Extend Hire', 'Check In'],
      owners:        ['View'],
      notifications: ['View', 'Send Notifications'],
    },
  },
  {
    id: 'finance',
    name: 'Finance Officer',
    description: 'Manages financial records and owner pay-outs.',
    permissions: {
      clients:       ['View', 'Generate Receipt'],
      vehicles:      ['View'],
      bookings:      ['View'],
      owners:        ['View', 'Pay Out', 'Generate Statement'],
      finance:       ['View', 'Record Income', 'Record Expense', 'Export Reports'],
      notifications: ['View'],
    },
  },
  {
    id: 'cashier',
    name: 'Cashier',
    description: 'Records payments and issues receipts to clients.',
    permissions: {
      clients:  ['View', 'Generate Receipt'],
      bookings: ['View'],
      finance:  ['View', 'Record Income'],
    },
  },
]

export const INIT_STAFF: StaffAccount[] = [
  { id: '1', name: 'Super Admin',  email: 'superadmin@doxacarhire.com', roleId: 'super-admin', status: 'Active', lastLogin: 'Just now'  },
  { id: '2', name: 'John Kamau',   email: 'dispatch@doxacarhire.com',   roleId: 'dispatch',    status: 'Active', lastLogin: '2 hrs ago' },
  { id: '3', name: 'Mary Wangeci', email: 'finance@doxacarhire.com',    roleId: 'finance',     status: 'Active', lastLogin: 'Yesterday' },
]
