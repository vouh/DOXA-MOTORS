'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireDirector, requireActiveStaff, syncUserMetadata } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'
import type { StaffRole, UserStatus } from '@/lib/auth/types'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function fail(error: unknown): ActionResult {
  return { ok: false, message: error instanceof Error ? error.message : 'Operation failed.' }
}

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  staffRole: z.enum(['DIRECTOR', 'CLERK', 'YARD', 'ACCOUNTANT']),
  password: z.string().min(8),
})

export async function inviteStaff(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireDirector()
    const data = inviteSchema.parse(Object.fromEntries(formData.entries()))
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
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
          staffRole: data.staffRole,
          status: 'ACTIVE',
          authUserId: created.user.id,
          isSuperAdmin: false,
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
      meta: { email: user.email, staffRole: user.staffRole },
    })
    revalidatePath('/admin/staff')
    return { ok: true, message: `Invited ${user.email}.` }
  } catch (error) {
    return fail(error)
  }
}

export async function setStaffStatus(id: string, status: UserStatus): Promise<ActionResult> {
  try {
    const actor = await requireDirector()
    if (actor.id === id && status !== 'ACTIVE') throw new Error('You cannot deactivate yourself.')
    const user = await prisma.user.update({ where: { id }, data: { status } })
    await syncUserMetadata(user)
    await writeAudit({
      userId: actor.id,
      action: 'staff.status',
      entity: 'User',
      entityId: id,
      meta: { status },
    })
    revalidatePath('/admin/staff')
    return { ok: true, message: `Staff marked ${status}.` }
  } catch (error) {
    return fail(error)
  }
}

export async function setStaffRole(id: string, staffRole: StaffRole): Promise<ActionResult> {
  try {
    const actor = await requireDirector()
    const user = await prisma.user.update({ where: { id }, data: { staffRole } })
    await syncUserMetadata(user)
    await writeAudit({
      userId: actor.id,
      action: 'staff.role',
      entity: 'User',
      entityId: id,
      meta: { staffRole },
    })
    revalidatePath('/admin/staff')
    return { ok: true, message: `Role updated to ${staffRole}.` }
  } catch (error) {
    return fail(error)
  }
}

export async function listStaff() {
  await requireActiveStaff()
  return prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      staffRole: true,
      status: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  })
}
