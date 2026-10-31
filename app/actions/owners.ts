'use server'

import { revalidatePath } from 'next/cache'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { ownerSchema } from '@/lib/car-hire/validation'
import { actionFail } from '@/lib/errors'
import { ForbiddenError, requirePermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { writeAudit } from '@/lib/audit'
import { summarizeOwnerFinance } from '@/lib/intelligence/finance'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function values(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function fail(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) {
    return { ok: false, message: error.message }
  }
  if (error instanceof ZodError) {
    return { ok: false, message: error.issues[0]?.message || 'Please check the form fields.' }
  }
  return actionFail(error)
}

function parsePeriodDay(value: Date | string, endOfDay = false) {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (match) {
      const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      if (endOfDay) day.setHours(23, 59, 59, 999)
      return day
    }
  }
  const day = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (endOfDay) day.setHours(23, 59, 59, 999)
  return day
}

function refresh() {
  revalidatePath('/admin', 'layout')
}

export async function createCarOwner(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.OWNER_CREATE)
    const data = ownerSchema.parse(values(formData))
    await prisma.carOwner.create({ data: { ...data, email: data.email || null } })
    refresh()
    return { ok: true, message: 'Owner registered.' }
  } catch (error) {
    return fail(error)
  }
}

export async function updateCarOwner(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.OWNER_EDIT)
    const id = String(formData.get('id') || '').trim()
    if (!id) return { ok: false, message: 'Owner id is required.' }
    const data = ownerSchema.parse(values(formData))
    const activeRaw = String(formData.get('active') || '').trim().toLowerCase()
    const active =
      activeRaw === 'true' || activeRaw === '1' || activeRaw === 'on'
        ? true
        : activeRaw === 'false' || activeRaw === '0'
          ? false
          : undefined

    const dupId = await prisma.carOwner.findFirst({
      where: {
        id: { not: id },
        nationalId: { equals: data.nationalId, mode: 'insensitive' },
      },
      select: { nationalId: true },
    })
    if (dupId) {
      return { ok: false, message: `National ID ${dupId.nationalId} is already on another owner.` }
    }

    await prisma.carOwner.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || null,
        nationalId: data.nationalId,
        kraPin: data.kraPin || null,
        bankDetails: data.bankDetails || null,
        mpesaNumber: data.mpesaNumber || null,
        nextOfKin: data.nextOfKin || null,
        commissionType: data.commissionType,
        commissionValue: data.commissionValue,
        recurringDeduction: data.recurringDeduction,
        ...(active !== undefined ? { active } : {}),
      },
    })
    refresh()
    return { ok: true, message: 'Owner details saved.' }
  } catch (error) {
    return fail(error)
  }
}

/** Reassign a fleet vehicle to this owner (link owner ↔ car). */
export async function assignVehicleToOwner(
  vehicleId: string,
  ownerId: string,
): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.VEHICLE_ASSIGN_OWNER)
    const vid = String(vehicleId || '').trim()
    const oid = String(ownerId || '').trim()
    if (!vid || !oid) return { ok: false, message: 'Vehicle and owner are required.' }

    const [vehicle, owner] = await Promise.all([
      prisma.carVehicle.findUniqueOrThrow({
        where: { id: vid },
        select: { id: true, regNumber: true, ownerId: true },
      }),
      prisma.carOwner.findUniqueOrThrow({
        where: { id: oid },
        select: { id: true, fullName: true, active: true },
      }),
    ])
    if (!owner.active) {
      return { ok: false, message: 'That owner is inactive. Activate them before linking vehicles.' }
    }
    if (vehicle.ownerId === owner.id) {
      return { ok: true, message: `${vehicle.regNumber} is already linked to this owner.` }
    }

    await prisma.carVehicle.update({
      where: { id: vehicle.id },
      data: { ownerId: owner.id },
    })
    refresh()
    return {
      ok: true,
      message: `${vehicle.regNumber} linked to ${owner.fullName}.`,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function generateOwnerPayout(
  ownerId: string,
  periodStart: Date | string,
  periodEnd: Date | string,
): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.OWNER_PAYOUT)
    const start = parsePeriodDay(periodStart)
    const end = parsePeriodDay(periodEnd, true)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return { ok: false, message: 'Enter a valid payout period.' }
    }

    const existing = await prisma.ownerPayout.findUnique({
      where: { ownerId_periodStart_periodEnd: { ownerId, periodStart: start, periodEnd: end } },
      select: { id: true, status: true },
    })
    if (existing?.status === 'PAID') {
      return { ok: false, message: 'That period is already marked paid. Pick another range.' }
    }
    if (existing?.status === 'APPROVED') {
      return { ok: false, message: 'That statement is approved. Mark it unpaid before regenerating.' }
    }

    const summary = await summarizeOwnerFinance(ownerId, start, end)
    const figures = {
      grossEarnings: summary.collected,
      commission: summary.commission,
      totalExpenses: summary.expenses,
      deductions: summary.deductions,
      netPay: summary.net,
    }
    const payout = await prisma.ownerPayout.upsert({
      where: { ownerId_periodStart_periodEnd: { ownerId, periodStart: start, periodEnd: end } },
      create: { ownerId, periodStart: start, periodEnd: end, ...figures, status: 'DRAFT' },
      update: { ...figures, status: 'DRAFT' },
    })
    await writeAudit({
      userId: profile.id,
      action: 'owner.payout_generate',
      entity: 'OwnerPayout',
      entityId: payout.id,
      meta: { ownerId, netPay: figures.netPay },
    })
    refresh()
    const owing = figures.netPay < 0
    return {
      ok: true,
      message: owing
        ? `Statement drafted — owner owes Doxa KES ${Math.abs(figures.netPay).toLocaleString()}.`
        : `Payout statement drafted: KES ${figures.netPay.toLocaleString()} net.`,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function approveOwnerPayout(payoutId: string): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.OWNER_PAYOUT)
    const payout = await prisma.ownerPayout.findUniqueOrThrow({ where: { id: payoutId } })
    if (payout.status !== 'DRAFT') {
      return { ok: false, message: 'Only draft statements can be approved.' }
    }
    await prisma.ownerPayout.update({
      where: { id: payoutId },
      data: { status: 'APPROVED' },
    })
    await writeAudit({
      userId: profile.id,
      action: 'owner.payout_approve',
      entity: 'OwnerPayout',
      entityId: payoutId,
    })
    refresh()
    return { ok: true, message: 'Statement approved. Ready to mark paid.' }
  } catch (error) {
    return fail(error)
  }
}

export async function markOwnerPayoutPaid(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.OWNER_PAYOUT)
    const payoutId = String(formData.get('payoutId') || '').trim()
    const paymentRef = String(formData.get('paymentRef') || '').trim()
    if (!payoutId) return { ok: false, message: 'Statement is required.' }
    if (!paymentRef) return { ok: false, message: 'Enter the M-Pesa or bank reference.' }

    const payout = await prisma.ownerPayout.findUniqueOrThrow({ where: { id: payoutId } })
    if (payout.status !== 'APPROVED') {
      return { ok: false, message: 'Approve the statement before marking it paid.' }
    }
    await prisma.ownerPayout.update({
      where: { id: payoutId },
      data: { status: 'PAID', paymentRef, paidAt: new Date() },
    })
    await writeAudit({
      userId: profile.id,
      action: 'owner.payout_paid',
      entity: 'OwnerPayout',
      entityId: payoutId,
      meta: { paymentRef },
    })
    refresh()
    return { ok: true, message: `Marked paid (${paymentRef}).` }
  } catch (error) {
    return fail(error)
  }
}
