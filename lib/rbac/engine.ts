import { prisma } from '@/lib/prisma'
import { getRbacVersion } from './sync'
import type { PermissionKey } from './registry'
import { ALL_PERMISSION_KEYS } from './registry'

const cache = new Map<string, { keys: Set<string>; expires: number }>()
const TTL_MS = 30_000

function cacheKey(roleId: string, version: number) {
  return `${roleId}:${version}`
}

export function invalidatePermissionCache() {
  cache.clear()
}

export async function getPermissionsForRoleId(roleId: string | null | undefined): Promise<Set<PermissionKey>> {
  if (!roleId) return new Set()

  const version = await getRbacVersion()
  const key = cacheKey(roleId, version)
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return hit.keys as Set<PermissionKey>
  }

  const links = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: { select: { key: true } } },
  })
  const keys = new Set(links.map((l) => l.permission.key)) as Set<PermissionKey>
  cache.set(key, { keys, expires: Date.now() + TTL_MS })
  return keys
}

/** Super Admin bypass — all registry keys. */
export function allPermissionKeys(): Set<PermissionKey> {
  return new Set(ALL_PERMISSION_KEYS)
}
