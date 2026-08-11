export type StaffRole = 'DIRECTOR' | 'CLERK' | 'YARD' | 'ACCOUNTANT'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  initials: string
  /** @deprecated Prefer roleName from Role */
  staffRole: StaffRole
  roleId?: string | null
  roleName?: string | null
  isSuperAdmin: boolean
  status?: UserStatus
}

/** Everyone uses the single admin shell */
export const ADMIN_HOME = '/admin'

export function homeForStaff(_role?: StaffRole) {
  return ADMIN_HOME
}
