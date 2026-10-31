'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, ForbiddenError } from '@/lib/rbac/require'
import { bumpRbacVersion, invalidatePermissionCache } from '@/lib/rbac'
import { PERMISSIONS, SUPER_ADMIN_ROLE_NAME, ALL_PERMISSION_KEYS } from '@/lib/rbac/registry'
import { writeAudit } from '@/lib/audit'
import { syncUserMetadata } from '@/lib/auth/session'
import { actionFail } from '@/lib/errors'

type ActionResult = { ok: true; message: string; id?: string } | { ok: false; message: string }

function fail(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message }
  return actionFail(error)
}

const roleSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(z.string()).default([]),
})

export async function listRoles() {
  await requirePermission(PERMISSIONS.STAFF_VIEW)
  return prisma.role.findMany({
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { users: true, permissions: true } },
      permissions: { include: { permission: { select: { key: true, label: true, category: true } } } },
    },
  })
}

export async function createRole(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_ROLE_EDIT)
    const rawKeys = formData.getAll('permissionKeys').map(String)
    const data = roleSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      permissionKeys: rawKeys,
    })

    if (data.name.trim().toLowerCase() === SUPER_ADMIN_ROLE_NAME.toLowerCase()) {
      throw new Error('Cannot create another Super Admin role.')
    }

    const validKeys = rawKeys.filter((k) => (ALL_PERMISSION_KEYS as string[]).includes(k))
    const perms = await prisma.permission.findMany({
      where: { key: { in: validKeys } },
      select: { id: true, key: true },
    })

    const role = await prisma.role.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isSystem: false,
        active: true,
        createdBy: actor.id,
        permissions: {
          create: perms.map((p) => ({ permissionId: p.id })),
        },
      },
    })

    await bumpRbacVersion()
    invalidatePermissionCache()
    await writeAudit({
      userId: actor.id,
      action: 'role.create',
      entity: 'Role',
      entityId: role.id,
      meta: { name: role.name, permissions: perms.map((p) => p.key) },
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: `Role “${role.name}” created.`, id: role.id }
  } catch (error) {
    return fail(error)
  }
}

export async function updateRole(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_ROLE_EDIT)
    const id = String(formData.get('id') || '')
    if (!id) throw new Error('Role id required')

    const existing = await prisma.role.findUnique({ where: { id } })
    if (!existing) throw new Error('Role not found')
    if (existing.isSystem) throw new Error('The Super Admin role cannot be edited.')

    const rawKeys = formData.getAll('permissionKeys').map(String)
    const data = roleSchema.parse({
      name: formData.get('name') || existing.name,
      description: formData.get('description') || undefined,
      permissionKeys: rawKeys,
    })

    const validKeys = rawKeys.filter((k) => (ALL_PERMISSION_KEYS as string[]).includes(k))
    // Self-lockout: actor must keep staff:role:edit if they hold this role
    if (actor.roleId === id && !validKeys.includes(PERMISSIONS.STAFF_ROLE_EDIT)) {
      throw new Error('You cannot remove role-edit permission from your own role.')
    }

    const perms = await prisma.permission.findMany({
      where: { key: { in: validKeys } },
      select: { id: true, key: true },
    })

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.role.update({
        where: { id },
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
        },
      }),
    ])

    await bumpRbacVersion()
    invalidatePermissionCache()
    await writeAudit({
      userId: actor.id,
      action: 'role.update',
      entity: 'Role',
      entityId: id,
      meta: { name: data.name, permissions: perms.map((p) => p.key) },
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: `Role “${data.name.trim()}” updated.` }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_ROLE_EDIT)
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!role) throw new Error('Role not found')
    if (role.isSystem) throw new Error('The Super Admin role cannot be deleted.')
    if (role._count.users > 0) {
      throw new Error(
        `This role is assigned to ${role._count.users} user(s). Reassign those users before deleting the role.`,
      )
    }

    await prisma.role.delete({ where: { id } })
    await bumpRbacVersion()
    invalidatePermissionCache()
    await writeAudit({
      userId: actor.id,
      action: 'role.delete',
      entity: 'Role',
      entityId: id,
      meta: { name: role.name },
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: `Role “${role.name}” deleted.` }
  } catch (error) {
    return fail(error)
  }
}

export async function assignUserRole(userId: string, roleId: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_ROLE_ASSIGN)
    const [target, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ])
    if (!target) throw new Error('Staff account not found.')
    if (!role || !role.active) throw new Error('Role not found or inactive.')
    if (role.isSystem && !actor.isSuperAdmin) {
      throw new Error('Only a Super Admin can assign the Super Admin role.')
    }
    if (target.isSuperAdmin && !actor.isSuperAdmin) {
      throw new Error('Only a Super Admin can change another Super Admin’s role.')
    }
    if (target.isSuperAdmin && !role.isSystem) {
      throw new Error('Super Admin accounts must keep the Super Admin role.')
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        roleId,
        isSuperAdmin: role.isSystem,
      },
    })
    await syncUserMetadata(user)
    await writeAudit({
      userId: actor.id,
      action: 'staff.role_assign',
      entity: 'User',
      entityId: userId,
      meta: { roleId, roleName: role.name, isSuperAdmin: role.isSystem },
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: `Assigned “${role.name}” to ${target.email}.` }
  } catch (error) {
    return fail(error)
  }
}
