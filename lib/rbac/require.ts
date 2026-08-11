import { prisma } from '@/lib/prisma'
import { requireActiveStaff, type SessionProfile } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'
import { allPermissionKeys, getPermissionsForRoleId } from './engine'
import type { PermissionKey } from './registry'

export class ForbiddenError extends Error {
  status = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export async function getUserPermissionSet(profile: {
  id: string
  isSuperAdmin: boolean
  roleId?: string | null
}): Promise<Set<PermissionKey>> {
  if (profile.isSuperAdmin) return allPermissionKeys()

  let roleId = profile.roleId
  if (roleId === undefined) {
    const user = await prisma.user.findUnique({
      where: { id: profile.id },
      select: { roleId: true },
    })
    roleId = user?.roleId ?? null
  }
  return getPermissionsForRoleId(roleId)
}

export async function hasPermission(
  profile: { id: string; isSuperAdmin: boolean; roleId?: string | null },
  key: PermissionKey,
): Promise<boolean> {
  const set = await getUserPermissionSet(profile)
  return set.has(key)
}

/**
 * Server-side gate. Nav hide is cosmetic — every mutation/page must call this.
 * Super Admin bypasses with audit (Sweet1ne / ARCHITECTURE C5).
 */
export async function requirePermission(key: PermissionKey): Promise<SessionProfile & { roleId: string | null }> {
  const session = await requireActiveStaff()
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { roleId: true, isSuperAdmin: true },
  })
  if (!user) throw new ForbiddenError('Unauthorized')

  if (user.isSuperAdmin || session.isSuperAdmin) {
    await writeAudit({
      userId: session.id,
      action: 'superadmin.bypass',
      entity: 'Permission',
      meta: { key },
    }).catch(() => {})
    return { ...session, roleId: user.roleId }
  }

  const allowed = await getPermissionsForRoleId(user.roleId)
  if (!allowed.has(key)) {
    throw new ForbiddenError(`Missing permission: ${key}`)
  }
  return { ...session, roleId: user.roleId }
}
