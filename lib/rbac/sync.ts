import { prisma } from '@/lib/prisma'
import { PERMISSION_CATALOG } from './registry'

/**
 * Upsert registry keys into DB. Report orphaned RolePermission rows (do not auto-delete).
 */
export async function syncPermissionRegistry() {
  for (const def of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        label: def.label,
        category: def.category,
        description: def.description,
      },
      update: {
        label: def.label,
        category: def.category,
        description: def.description,
      },
    })
  }

  const known = new Set(PERMISSION_CATALOG.map((p) => p.key))
  const orphans = await prisma.permission.findMany({
    where: { key: { notIn: [...known] } },
    select: { id: true, key: true },
  })

  return {
    synced: PERMISSION_CATALOG.length,
    orphanKeys: orphans.map((o) => o.key),
  }
}

export async function bumpRbacVersion() {
  await prisma.rbacMeta.upsert({
    where: { id: 1 },
    create: { id: 1, version: 2 },
    update: { version: { increment: 1 } },
  })
}

export async function getRbacVersion() {
  try {
    if (!prisma.rbacMeta) return 1
    const row = await prisma.rbacMeta.findUnique({ where: { id: 1 } })
    return row?.version ?? 1
  } catch {
    return 1
  }
}
