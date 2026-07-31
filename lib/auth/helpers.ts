import type { StaffRole, UserStatus } from './types'
import type { User } from '@prisma/client'

const STAFF_ROLES: StaffRole[] = ['DIRECTOR', 'CLERK', 'YARD', 'ACCOUNTANT']
const STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && STAFF_ROLES.includes(value as StaffRole)
}

export function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && STATUSES.includes(value as UserStatus)
}

export function toAuthUser(user: User) {
  const fullName = user.fullName || user.email
  return {
    id: user.id,
    email: user.email,
    fullName,
    initials: fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase(),
    staffRole: user.staffRole as StaffRole,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    status: user.status as UserStatus,
  }
}
