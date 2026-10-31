'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { syncUserMetadata } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'
import type { UserStatus } from '@/lib/auth/types'
import { createServerClient } from '@/lib/supabase-server'
import { normalizeEmail } from '@/lib/auth/helpers'
import { requirePermission, ForbiddenError } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { z } from 'zod'
import { actionFail } from '@/lib/errors'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function fail(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message }
  return actionFail(error)
}

const inviteSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roleId: z.string().min(1),
  password: z.string().min(8),
})

export async function inviteStaff(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_MANAGE)
    const data = inviteSchema.parse(Object.fromEntries(formData.entries()))

    const role = await prisma.role.findUnique({ where: { id: data.roleId } })
    if (!role || !role.active) throw new Error('Select a valid role.')
    if (role.isSystem && !actor.isSuperAdmin) {
      throw new Error('Only a Super Admin can assign the Super Admin role.')
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    })
    if (existing) throw new Error('A staff account with that email already exists.')

    const admin = createServerClient()
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    })
    if (error || !created.user) throw new Error(error?.message || 'Could not create auth user.')

    let user
    try {
      user = await prisma.user.create({
        data: {
          email: data.email,
          fullName: data.fullName,
          phone: data.phone || null,
          staffRole: 'CLERK',
          roleId: role.id,
          status: 'ACTIVE',
          authUserId: created.user.id,
          isSuperAdmin: role.isSystem,
        },
      })
    } catch (dbError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
      throw dbError
    }

    await syncUserMetadata(user)
    await writeAudit({
      userId: actor.id,
      action: 'staff.invite',
      entity: 'User',
      entityId: user.id,
      meta: { email: user.email, roleId: role.id, roleName: role.name },
    })
    revalidatePath('/admin/settings')
    revalidatePath('/admin/profile')
    return { ok: true, message: `Invited ${user.email} as ${role.name}.` }
  } catch (error) {
    return fail(error)
  }
}

export async function setStaffStatus(id: string, status: UserStatus): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_MANAGE)
    if (actor.id === id && status !== 'ACTIVE') throw new Error('You cannot deactivate yourself.')
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw new Error('Staff account not found.')
    if (target.isSuperAdmin && !actor.isSuperAdmin) {
      throw new Error('Only a Super Admin can change another Super Admin’s status.')
    }
    if (target.isSuperAdmin && status !== 'ACTIVE') {
      const supers = await prisma.user.count({ where: { isSuperAdmin: true, status: 'ACTIVE' } })
      if (supers <= 1) throw new Error('Cannot disable the last active Super Admin.')
    }
    const user = await prisma.user.update({ where: { id }, data: { status } })
    await syncUserMetadata(user)
    await writeAudit({
      userId: actor.id,
      action: 'staff.status',
      entity: 'User',
      entityId: id,
      meta: { status },
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: `Staff marked ${status}.` }
  } catch (error) {
    return fail(error)
  }
}

export async function resetStaffPassword(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.STAFF_MANAGE)
    const schema = z.object({
      userId: z.string().min(1),
      password: z.string().min(8),
    })
    const data = schema.parse({
      userId: formData.get('userId'),
      password: formData.get('password'),
    })

    const target = await prisma.user.findUnique({ where: { id: data.userId } })
    if (!target) throw new Error('Staff account not found.')
    if (!target.authUserId) throw new Error('This staff account has no Auth login yet.')
    if (target.isSuperAdmin && actor.id !== target.id && !actor.isSuperAdmin) {
      throw new Error('Only a Super Admin can reset another Super Admin password.')
    }

    const admin = createServerClient()
    const { error } = await admin.auth.admin.updateUserById(target.authUserId, {
      password: data.password,
    })
    if (error) throw new Error(error.message)

    await writeAudit({
      userId: actor.id,
      action: 'staff.password_reset',
      entity: 'User',
      entityId: target.id,
      meta: { email: target.email },
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: `Password updated for ${target.email}. Share it securely with them.` }
  } catch (error) {
    return fail(error)
  }
}

export async function listStaff() {
  await requirePermission(PERMISSIONS.STAFF_VIEW)
  return prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      staffRole: true,
      roleId: true,
      status: true,
      isSuperAdmin: true,
      createdAt: true,
      role: { select: { id: true, name: true } },
    },
  })
}
