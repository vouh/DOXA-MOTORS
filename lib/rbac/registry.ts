/**
 * Permission registry — ONLY place new KEYS are added (developers).
 * Super Admin selects from these; cannot invent keys in the UI.
 * Doxa = single site (no branch scope). Same Sweet1ne hierarchy: Permissions → Roles → Users.
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',

  CLIENT_VIEW: 'client:view',
  CLIENT_CREATE: 'client:create',
  CLIENT_EDIT: 'client:edit',
  CLIENT_SUSPEND: 'client:suspend',
  CLIENT_LOOKUP: 'client:lookup',
  CLIENT_UPLOAD: 'client:upload',

  VEHICLE_VIEW: 'vehicle:view',
  VEHICLE_CREATE: 'vehicle:create',
  VEHICLE_EDIT: 'vehicle:edit',
  VEHICLE_ASSIGN_OWNER: 'vehicle:assign_owner',

  OWNER_VIEW: 'owner:view',
  OWNER_CREATE: 'owner:create',
  OWNER_EDIT: 'owner:edit',
  OWNER_UPLOAD: 'owner:upload',
  OWNER_PAYOUT: 'owner:payout',
  OWNER_STATEMENT: 'owner:statement',

  BOOKING_VIEW: 'booking:view',
  BOOKING_CREATE: 'booking:create',
  BOOKING_DISPATCH: 'booking:dispatch',
  BOOKING_EXTEND: 'booking:extend',
  BOOKING_CHECKIN: 'booking:checkin',
  BOOKING_CONDITION: 'booking:condition',

  PAYMENT_VIEW: 'payment:view',
  PAYMENT_RECORD: 'payment:record',
  PAYMENT_STK: 'payment:stk',
  EXPENSE_RECORD: 'expense:record',
  REPORT_EXPORT: 'report:export',

  SETTINGS_PENALTY_EDIT: 'settings:penalty_rules:edit',
  SETTINGS_COMMISSION: 'settings:commission:edit',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  MESSAGE_VIEW: 'message:view',
  MESSAGE_SEND: 'message:send',
  MESSAGE_BROADCAST: 'message:broadcast',

  DOC_VIEW: 'doc:view',
  DOC_UPLOAD: 'doc:upload',
  DOC_DELETE: 'doc:delete',

  STAFF_VIEW: 'staff:view',
  STAFF_MANAGE: 'staff:manage',
  STAFF_ROLE_ASSIGN: 'staff:role:assign',
  STAFF_ROLE_EDIT: 'staff:role:edit',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type PermissionDef = {
  key: PermissionKey
  label: string
  category: string
  description?: string
}

/** Display metadata for registry keys (synced into DB). */
export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, label: 'View dashboard', category: 'Dashboard' },

  { key: PERMISSIONS.CLIENT_VIEW, label: 'View clients', category: 'Clients' },
  { key: PERMISSIONS.CLIENT_CREATE, label: 'Create clients', category: 'Clients' },
  { key: PERMISSIONS.CLIENT_EDIT, label: 'Edit clients', category: 'Clients' },
  { key: PERMISSIONS.CLIENT_SUSPEND, label: 'Suspend / activate clients', category: 'Clients' },
  { key: PERMISSIONS.CLIENT_LOOKUP, label: 'Lookup by ID / phone', category: 'Clients' },
  { key: PERMISSIONS.CLIENT_UPLOAD, label: 'Upload client documents', category: 'Clients' },

  { key: PERMISSIONS.VEHICLE_VIEW, label: 'View vehicles', category: 'Vehicles' },
  { key: PERMISSIONS.VEHICLE_CREATE, label: 'Add vehicles', category: 'Vehicles' },
  { key: PERMISSIONS.VEHICLE_EDIT, label: 'Edit vehicles', category: 'Vehicles' },
  { key: PERMISSIONS.VEHICLE_ASSIGN_OWNER, label: 'Assign vehicle owner', category: 'Vehicles' },

  { key: PERMISSIONS.OWNER_VIEW, label: 'View owners', category: 'Owners' },
  { key: PERMISSIONS.OWNER_CREATE, label: 'Add owners', category: 'Owners' },
  { key: PERMISSIONS.OWNER_EDIT, label: 'Edit owners', category: 'Owners' },
  { key: PERMISSIONS.OWNER_UPLOAD, label: 'Upload owner documents', category: 'Owners' },
  { key: PERMISSIONS.OWNER_PAYOUT, label: 'Owner payouts', category: 'Owners' },
  { key: PERMISSIONS.OWNER_STATEMENT, label: 'Owner statements', category: 'Owners' },

  { key: PERMISSIONS.BOOKING_VIEW, label: 'View bookings', category: 'Bookings' },
  { key: PERMISSIONS.BOOKING_CREATE, label: 'Create bookings', category: 'Bookings' },
  { key: PERMISSIONS.BOOKING_DISPATCH, label: 'Dispatch vehicles', category: 'Bookings' },
  { key: PERMISSIONS.BOOKING_EXTEND, label: 'Extend hire', category: 'Bookings' },
  { key: PERMISSIONS.BOOKING_CHECKIN, label: 'Check in vehicles', category: 'Bookings' },
  { key: PERMISSIONS.BOOKING_CONDITION, label: 'Condition checks', category: 'Bookings' },

  { key: PERMISSIONS.PAYMENT_VIEW, label: 'View payments', category: 'Finance' },
  { key: PERMISSIONS.PAYMENT_RECORD, label: 'Record payments', category: 'Finance' },
  { key: PERMISSIONS.PAYMENT_STK, label: 'M-Pesa STK push', category: 'Finance' },
  { key: PERMISSIONS.EXPENSE_RECORD, label: 'Record expenses', category: 'Finance' },
  { key: PERMISSIONS.REPORT_EXPORT, label: 'Export reports', category: 'Finance' },

  // SETTINGS_PENALTY_EDIT is Super Admin only — not assignable via Roles UI
  { key: PERMISSIONS.SETTINGS_COMMISSION, label: 'Edit commission settings', category: 'Settings' },
  { key: PERMISSIONS.SETTINGS_VIEW, label: 'View settings', category: 'Settings' },
  { key: PERMISSIONS.SETTINGS_EDIT, label: 'Edit settings (prices & loyalty)', category: 'Settings' },

  { key: PERMISSIONS.MESSAGE_VIEW, label: 'View communications', category: 'Communications' },
  { key: PERMISSIONS.MESSAGE_SEND, label: 'Send email / SMS', category: 'Communications' },
  { key: PERMISSIONS.MESSAGE_BROADCAST, label: 'Broadcast to clients or owners', category: 'Communications' },

  { key: PERMISSIONS.DOC_VIEW, label: 'View documents', category: 'Documents' },
  { key: PERMISSIONS.DOC_UPLOAD, label: 'Upload documents', category: 'Documents' },
  { key: PERMISSIONS.DOC_DELETE, label: 'Delete documents', category: 'Documents' },

  { key: PERMISSIONS.STAFF_VIEW, label: 'View staff', category: 'Staff' },
  { key: PERMISSIONS.STAFF_MANAGE, label: 'Invite / suspend staff', category: 'Staff' },
  { key: PERMISSIONS.STAFF_ROLE_ASSIGN, label: 'Assign roles to staff', category: 'Staff' },
  { key: PERMISSIONS.STAFF_ROLE_EDIT, label: 'Create / edit roles', category: 'Staff' },
]

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key)

export const SUPER_ADMIN_ROLE_NAME = 'Super Admin'
