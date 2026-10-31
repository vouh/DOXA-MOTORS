'use server'

import { revalidatePath } from 'next/cache'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  bookingSchema, clientSchema, dispatchConditionSchema, expenseSchema, expenseUpdateSchema,
  expenseDeleteSchema, expenseBulkDeleteSchema,
  paymentSchema, penaltyRuleSchema, vehicleSchema, returnConditionSchema,
  instaPayManualSchema, instaStkSchema, reconcilePaymentSchema,
} from '@/lib/car-hire/validation'
import { bookingCharge, hireDays, latenessPenalty, roundMoney } from '@/lib/car-hire/calculations'
import { extraChargesSum, parseExtraCharges } from '@/lib/car-hire/extra-charges'
import { sanitizeComment } from '@/lib/car-hire/input-rules'
import { mpesaConfigured, stkPush } from '@/lib/mpesa/daraja'
import { actionFail } from '@/lib/errors'
import { requireActiveStaff } from '@/lib/auth/session'
import { ForbiddenError, hasPermission, requirePermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { findClientsByLookupQuery } from '@/lib/car-hire/client-lookup'
import {
  clientIdentityConflictMessage,
  uniqueConstraintMessage,
} from '@/lib/car-hire/client-uniqueness'
import {
  findVehicleByRegNumber,
  vehicleRegConflictMessage,
} from '@/lib/car-hire/vehicle-reg'
import { assertClientHasIdentityDocs } from '@/lib/documents/client-required'
import { notifyBookingConfirmed, notifyVehicleDispatched } from '@/lib/notifications/booking'
import { writeAudit } from '@/lib/audit'
import { noteCalmingAction, trackRecordDeletes } from '@/lib/security/track-deletes'

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
  const uniqueMsg = uniqueConstraintMessage(error)
  if (uniqueMsg) return { ok: false, message: uniqueMsg }
  return actionFail(error)
}

function refresh() {
  revalidatePath('/admin', 'layout')
}

/** Lighter cache bump for create flows that must stay snappy (wizard continues client-side). */
function refreshClientsList() {
  revalidatePath('/admin/clients')
  revalidatePath('/admin/bookings')
}

export type ClientLookupRow = {
  id: string
  fullName: string
  phone: string
  email: string | null
  idOrPassportNo: string
  licenceNo: string
  licenceExpiry: string | null
  physicalAddress: string | null
  nextOfKin: string | null
  employer: string | null
  secondContact: string | null
  notes: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  trips: number
}

/** Backend client lookup (ID / phone / name) — live Clients search; no audit on every keystroke. */
export async function lookupCarClients(query: string): Promise<
  { ok: true; clients: ClientLookupRow[] } | { ok: false; message: string }
> {
  try {
    const profile = await requireActiveStaff()
    if (!profile.isSuperAdmin && !(await hasPermission(profile, PERMISSIONS.CLIENT_VIEW))) {
      throw new ForbiddenError(`Missing permission: ${PERMISSIONS.CLIENT_VIEW}`)
    }
    const raw = query.trim()
    if (raw.length < 2) return { ok: true, clients: [] }

    const rows = await findClientsByLookupQuery(raw, 12)
    return {
      ok: true,
      clients: rows.map((client) => ({
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        email: client.email,
        idOrPassportNo: client.idOrPassportNo,
        licenceNo: client.licenceNo,
        licenceExpiry: client.licenceExpiry?.toISOString().slice(0, 10) ?? null,
        physicalAddress: client.physicalAddress,
        nextOfKin: client.nextOfKin,
        employer: client.employer,
        secondContact: client.secondContact,
        notes: client.notes,
        status: client.status as 'ACTIVE' | 'SUSPENDED',
        trips: client._count?.bookings ?? 0,
      })),
    }
  } catch (error) {
    return fail(error) as { ok: false; message: string }
  }
}

/** Early duplicate check for the new-client wizard (phone / ID / email). */
export async function checkClientDuplicates(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.CLIENT_CREATE)
    const phone = String(formData.get('phone') || '').trim()
    const idOrPassportNo = String(formData.get('idOrPassportNo') || '').trim()
    const emailRaw = String(formData.get('email') || '').trim()
    const email = emailRaw ? emailRaw.toLowerCase() : null

    const conflict = await clientIdentityConflictMessage({
      phone,
      idOrPassportNo,
      email,
    })
    if (conflict) return { ok: false, message: conflict }
    return { ok: true, message: 'Details are available.' }
  } catch (error) {
    return fail(error)
  }
}

export async function createCarClient(
  formData: FormData,
): Promise<ActionResult & { clientId?: string; fullName?: string; phone?: string }> {
  try {
    await requirePermission(PERMISSIONS.CLIENT_CREATE)
    const data = clientSchema.parse(values(formData))
    const email = data.email?.trim().toLowerCase() || null
    const conflict = await clientIdentityConflictMessage({
      phone: data.phone,
      idOrPassportNo: data.idOrPassportNo,
      email,
    })
    if (conflict) return { ok: false, message: conflict }

    const client = await prisma.carClient.create({
      data: { ...data, email },
    })
    refreshClientsList()
    return {
      ok: true,
      message: 'Client registered.',
      clientId: client.id,
      fullName: client.fullName,
      phone: client.phone,
    }
  } catch (error) { return fail(error) }
}

export async function updateCarClient(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.CLIENT_EDIT)
    const id = String(formData.get('id') || '').trim()
    if (!id) return { ok: false, message: 'Client id is required.' }
    const data = clientSchema.parse(values(formData))
    const email = data.email?.trim().toLowerCase() || null
    const conflict = await clientIdentityConflictMessage({
      phone: data.phone,
      idOrPassportNo: data.idOrPassportNo,
      email,
      excludeId: id,
    })
    if (conflict) return { ok: false, message: conflict }

    await prisma.carClient.update({
      where: { id },
      data: { ...data, email },
    })
    refresh()
    return { ok: true, message: 'Client details saved.' }
  } catch (error) { return fail(error) }
}

export async function setCarClientStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.CLIENT_SUSPEND)
    await prisma.carClient.update({ where: { id }, data: { status } })
    if (status === 'SUSPENDED') {
      const { clearLoyaltyOnSuspend } = await import('@/lib/loyalty/award')
      await clearLoyaltyOnSuspend(id, profile.id)
    }
    refresh()
    return { ok: true, message: `Client ${status === 'ACTIVE' ? 'activated' : 'suspended'}.` }
  } catch (error) { return fail(error) }
}

/** Permanently remove a client and all related hire records (bookings, payments, etc.). */
export async function deleteCarClient(id: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.CLIENT_SUSPEND)
    const client = await prisma.carClient.findUniqueOrThrow({
      where: { id },
      include: {
        bookings: { select: { id: true, vehicleId: true, status: true } },
      },
    })
    await prisma.$transaction(async (tx) => {
      const bookingIds = client.bookings.map((b) => b.id)
      if (bookingIds.length) {
        await tx.carPayment.deleteMany({ where: { bookingId: { in: bookingIds } } })
        await tx.carBooking.deleteMany({ where: { id: { in: bookingIds } } })

        const openStatuses = new Set(['RESERVED', 'DISPATCHED', 'OVERDUE'])
        const vehicleIds = [
          ...new Set(
            client.bookings
              .filter((b) => openStatuses.has(b.status))
              .map((b) => b.vehicleId),
          ),
        ]
        for (const vehicleId of vehicleIds) {
          const stillOpen = await tx.carBooking.count({
            where: { vehicleId, status: { in: ['RESERVED', 'DISPATCHED', 'OVERDUE'] } },
          })
          if (stillOpen === 0) {
            await tx.carVehicle.update({
              where: { id: vehicleId },
              data: { status: 'AVAILABLE' },
            })
          }
        }
      }

      await tx.carClient.delete({ where: { id } })
    })

    refresh()
    return {
      ok: true,
      message: client.bookings.length
        ? `Client deleted with ${client.bookings.length} related hire record${client.bookings.length === 1 ? '' : 's'}.`
        : 'Client deleted.',
    }
  } catch (error) { return fail(error) }
}

export async function createCarVehicle(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.VEHICLE_CREATE)
    const data = vehicleSchema.parse(values(formData))
    const dupReg = await findVehicleByRegNumber(data.regNumber)
    if (dupReg) {
      return { ok: false, message: vehicleRegConflictMessage(dupReg) }
    }
    const vehicle = await prisma.carVehicle.create({
      data: {
        ownerId: data.ownerId, regNumber: data.regNumber, make: data.make, model: data.model,
        year: data.year, color: data.color, type: data.type, dailyRate: data.dailyRate,
      },
    })
    const documents = [
      data.insuranceExpiry && { vehicleId: vehicle.id, type: 'INSURANCE' as const, expiryDate: data.insuranceExpiry },
      data.inspectionExpiry && { vehicleId: vehicle.id, type: 'INSPECTION' as const, expiryDate: data.inspectionExpiry },
    ].filter(Boolean) as Array<{ vehicleId: string; type: 'INSURANCE' | 'INSPECTION'; expiryDate: Date }>
    if (documents.length) await prisma.vehicleDocument.createMany({ data: documents })
    refresh()
    return { ok: true, message: 'Vehicle added.' }
  } catch (error) { return fail(error) }
}

export async function updateCarVehicle(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.VEHICLE_EDIT)
    const id = String(formData.get('id') || '').trim()
    if (!id) return { ok: false, message: 'Vehicle id is required.' }

    const data = vehicleSchema.parse(values(formData))
    const statusRaw = String(formData.get('status') || '').trim()
    const status =
      statusRaw && ['AVAILABLE', 'MAINTENANCE', 'RETIRED', 'RESERVED', 'HIRED'].includes(statusRaw)
        ? (statusRaw as 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED' | 'RESERVED' | 'HIRED')
        : undefined

    const existing = await prisma.carVehicle.findUniqueOrThrow({
      where: { id },
      include: {
        bookings: {
          where: { status: { in: ['RESERVED', 'DISPATCHED', 'OVERDUE'] } },
          select: { id: true, status: true },
          take: 1,
        },
      },
    })

    const dupReg = await findVehicleByRegNumber(data.regNumber, id)
    if (dupReg) {
      return { ok: false, message: vehicleRegConflictMessage(dupReg) }
    }

    if (data.ownerId !== existing.ownerId) {
      await requirePermission(PERMISSIONS.VEHICLE_ASSIGN_OWNER)
    }

    const onHire = existing.bookings.length > 0 || ['RESERVED', 'HIRED'].includes(existing.status)
    if (status && status !== existing.status) {
      if (onHire && !['RESERVED', 'HIRED'].includes(status)) {
        return {
          ok: false,
          message: 'This vehicle is on an active hire — finish or cancel the booking before changing status.',
        }
      }
      if (!onHire && ['RESERVED', 'HIRED'].includes(status)) {
        return {
          ok: false,
          message: 'Reserved / hired status is set by bookings — choose Available, Maintenance, or Retired.',
        }
      }
    }

    const ownerPhoneDigits = String(formData.get('ownerPhone') || '').replace(/\D/g, '')
    let nextOwnerPhone: string | null = null
    if (ownerPhoneDigits) {
      if (ownerPhoneDigits.length < 9 || ownerPhoneDigits.length > 12) {
        return { ok: false, message: 'Owner phone must be 9–12 digits.' }
      }
      const owner = await prisma.carOwner.findUniqueOrThrow({
        where: { id: data.ownerId },
        select: { phone: true },
      })
      if (owner.phone !== ownerPhoneDigits) {
        await requirePermission(PERMISSIONS.OWNER_EDIT)
        nextOwnerPhone = ownerPhoneDigits
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.carVehicle.update({
        where: { id },
        data: {
          ownerId: data.ownerId,
          regNumber: data.regNumber,
          make: data.make,
          model: data.model,
          year: data.year ?? null,
          color: data.color || null,
          type: data.type,
          dailyRate: data.dailyRate,
          ...(status && !onHire ? { status } : {}),
        },
      })

      if (nextOwnerPhone) {
        await tx.carOwner.update({
          where: { id: data.ownerId },
          data: { phone: nextOwnerPhone },
        })
      }

      for (const [type, expiry] of [
        ['INSURANCE', data.insuranceExpiry] as const,
        ['INSPECTION', data.inspectionExpiry] as const,
      ]) {
        if (expiry) {
          await tx.vehicleDocument.upsert({
            where: { vehicleId_type: { vehicleId: id, type } },
            create: { vehicleId: id, type, expiryDate: expiry },
            update: { expiryDate: expiry },
          })
        }
      }
    })

    refresh()
    return { ok: true, message: 'Vehicle details saved.' }
  } catch (error) { return fail(error) }
}

export async function createPenaltyRule(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActiveStaff()
    if (!profile.isSuperAdmin) {
      throw new ForbiddenError('Only a Super Admin can change penalty rule amounts.')
    }
    const data = penaltyRuleSchema.parse(values(formData))
    const vehicleType = data.vehicleType
    const rule = await prisma.$transaction(async (tx) => {
      await tx.penaltyRule.updateMany({
        where: { active: true, vehicleType } as { active: boolean; vehicleType: typeof vehicleType },
        data: { active: false },
      })
      return tx.penaltyRule.create({
        data: {
          name: data.name,
          vehicleType,
          graceMinutes: data.graceMinutes,
          rate: data.rate,
          rateUnit: data.rateUnit,
          cap: data.cap ?? null,
          active: true,
          updatedBy: profile.id,
        } as Parameters<typeof tx.penaltyRule.create>[0]['data'],
      })
    })
    await writeAudit({
      userId: profile.id,
      action: 'penalty_rule.activate',
      entity: 'PenaltyRule',
      entityId: rule.id,
      meta: {
        name: rule.name,
        vehicleType: (rule as { vehicleType?: string | null }).vehicleType ?? null,
        graceMinutes: rule.graceMinutes,
        rate: rule.rate,
        rateUnit: rule.rateUnit,
        cap: rule.cap,
      },
    })
    refresh()
    return {
      ok: true,
      message: vehicleType
        ? `Penalty rule activated for ${vehicleType.replace(/_/g, ' ')}.`
        : 'Default penalty rule activated.',
    }
  } catch (error) { return fail(error) }
}

export async function createCarBooking(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.BOOKING_CREATE)
    const data = bookingSchema.parse(values(formData))
    await assertClientHasIdentityDocs(data.clientId)
    const extras = parseExtraCharges(formData)
    const extrasTotal = extraChargesSum(extras)
    const { days, baseCharge } = bookingCharge(data.startAt, data.expectedReturnAt, data.dailyRate)
    const reference = `DX-${Date.now().toString(36).toUpperCase()}`

    const created = await prisma.$transaction(async (tx) => {
      const client = await tx.carClient.findUniqueOrThrow({ where: { id: data.clientId } })
      if (client.status !== 'ACTIVE') {
        throw new Error('Suspended clients cannot start new hires. Activate the client first.')
      }
      const vehicle = await tx.carVehicle.findUniqueOrThrow({ where: { id: data.vehicleId } })
      if (vehicle.status !== 'AVAILABLE') throw new Error('That vehicle is not available.')
      const overlap = await tx.carBooking.findFirst({
        where: {
          vehicleId: data.vehicleId,
          status: { in: ['RESERVED', 'DISPATCHED', 'OVERDUE'] },
          startAt: { lt: data.expectedReturnAt },
          expectedReturnAt: { gt: data.startAt },
        },
      })
      if (overlap) throw new Error('The vehicle already has an overlapping booking.')

      const typed = await tx.penaltyRule.findFirst({
        where: { active: true, vehicleType: vehicle.type } as { active: boolean; vehicleType: typeof vehicle.type },
        orderBy: { effectiveFrom: 'desc' },
      })
      const rule =
        typed ??
        (await tx.penaltyRule.findFirst({
          where: { active: true, vehicleType: null } as { active: boolean; vehicleType: null },
          orderBy: { effectiveFrom: 'desc' },
        }))

      const booking = await tx.carBooking.create({
        data: {
          ...data,
          reference,
          days,
          baseCharge,
          totalCharge: roundMoney(baseCharge + extrasTotal),
          penaltyRuleId: rule?.id,
          extraCharges: extras.length
            ? {
                create: extras.map((item) => ({
                  stage: 'BOOKING' as const,
                  description: item.description,
                  amount: item.amount,
                })),
              }
            : undefined,
        },
      })
      await tx.carVehicle.update({ where: { id: data.vehicleId }, data: { status: 'RESERVED' } })
      return { booking, client, vehicle }
    })

    // Email (→ RESEND_TEST_EMAIL while onboarding) + SMS (queued until SMS API keys are set)
    await notifyBookingConfirmed({
      bookingId: created.booking.id,
      reference: created.booking.reference,
      clientId: created.client.id,
      clientName: created.client.fullName,
      clientEmail: created.client.email,
      clientPhone: created.client.phone,
      vehicleLabel: `${created.vehicle.make} ${created.vehicle.model} (${created.vehicle.regNumber})`,
      startAt: created.booking.startAt,
      expectedReturnAt: created.booking.expectedReturnAt,
      days: created.booking.days,
      totalCharge: created.booking.totalCharge,
    }).catch((err) => {
      console.error('[booking] confirmation notify failed', err)
    })

    refresh()
    return { ok: true, message: `Booking ${reference} created. Confirmation email and SMS queued.` }
  } catch (error) { return fail(error) }
}

export async function dispatchCarBooking(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.BOOKING_DISPATCH)
    const bookingGate = await prisma.carBooking.findUniqueOrThrow({
      where: { id },
      select: { clientId: true },
    })
    await assertClientHasIdentityDocs(bookingGate.clientId)
    const check = dispatchConditionSchema.parse(values(formData))
    const condition = {
      dentsNotes: check.dentsNotes,
      fuelLevel: check.fuelLevel,
      odometer: check.odometer,
      componentsOk: check.componentsOk,
      checkedBy: profile.fullName || profile.id,
    }

    const released = await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({
        where: { id },
        include: { client: true, vehicle: true },
      })
      if (booking.status !== 'RESERVED') {
        throw new Error('Only reserved bookings can be dispatched.')
      }
      if (booking.dispatchedAt) {
        throw new Error('This booking was already dispatched.')
      }
      if (!['RESERVED', 'AVAILABLE'].includes(booking.vehicle.status)) {
        throw new Error(
          `Vehicle ${booking.vehicle.regNumber} is ${booking.vehicle.status.toLowerCase()} and cannot be released.`,
        )
      }
      // Another open hire on the same plate must not be overwritten.
      const otherOpen = await tx.carBooking.findFirst({
        where: {
          vehicleId: booking.vehicleId,
          id: { not: id },
          status: { in: ['DISPATCHED', 'OVERDUE'] },
        },
        select: { reference: true },
      })
      if (otherOpen) {
        throw new Error(
          `Vehicle is already out on hire ${otherOpen.reference}. Check that booking in first.`,
        )
      }

      await tx.conditionCheck.upsert({
        where: { bookingId_stage: { bookingId: id, stage: 'DISPATCH' } },
        create: { bookingId: id, stage: 'DISPATCH', ...condition },
        update: condition,
      })
      const updated = await tx.carBooking.update({
        where: { id },
        data: { status: 'DISPATCHED', dispatchedAt: new Date() },
      })
      await tx.carVehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'HIRED' },
      })
      return { booking: updated, client: booking.client, vehicle: booking.vehicle, condition }
    })

    await notifyVehicleDispatched({
      bookingId: released.booking.id,
      reference: released.booking.reference,
      clientId: released.client.id,
      clientName: released.client.fullName,
      clientEmail: released.client.email,
      clientPhone: released.client.phone,
      vehicleLabel: `${released.vehicle.make} ${released.vehicle.model} (${released.vehicle.regNumber})`,
      expectedReturnAt: released.booking.expectedReturnAt,
      fuelLevel: released.condition.fuelLevel,
      odometer: released.condition.odometer,
    }).catch((err) => {
      console.error('[dispatch] notify failed', err)
    })

    refresh()
    return {
      ok: true,
      message: `Vehicle released. Condition recorded; client notified for ${released.booking.reference}.`,
    }
  } catch (error) { return fail(error) }
}

export async function extendCarBooking(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.BOOKING_EXTEND)
    const raw = String(formData.get('newReturnAt') || '').trim()
    const newReturnAt = new Date(raw)
    if (!raw || Number.isNaN(newReturnAt.getTime())) {
      return { ok: false, message: 'Enter a valid new return date and time.' }
    }
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id } })
      if (!['DISPATCHED', 'OVERDUE'].includes(booking.status)) {
        throw new Error('Only active hires can be extended.')
      }
      if (newReturnAt <= booking.expectedReturnAt) {
        throw new Error('Extension must increase the return time.')
      }
      const extension = bookingCharge(booking.expectedReturnAt, newReturnAt, booking.dailyRate)
      const days = hireDays(booking.startAt, newReturnAt)
      await tx.carHireExtension.create({
        data: {
          bookingId: id,
          previousReturnAt: booking.expectedReturnAt,
          newReturnAt,
          extraDays: extension.days,
          extraAmount: extension.baseCharge,
          createdBy: profile.fullName || profile.id,
        },
      })
      await tx.carBooking.update({
        where: { id },
        data: {
          expectedReturnAt: newReturnAt,
          days,
          additionalCharge: { increment: extension.baseCharge },
          totalCharge: { increment: extension.baseCharge },
          status: 'DISPATCHED',
        },
      })
    })
    refresh()
    return { ok: true, message: 'Hire extended. Extra days charged at the booking daily rate.' }
  } catch (error) { return fail(error) }
}

/** Cancel a reserved booking before dispatch — frees the vehicle. */
export async function cancelCarBooking(id: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.BOOKING_CREATE)
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id } })
      if (booking.status !== 'RESERVED') {
        throw new Error('Only reserved bookings (not yet dispatched) can be cancelled.')
      }
      await tx.carBooking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })
      const stillOpen = await tx.carBooking.count({
        where: {
          vehicleId: booking.vehicleId,
          id: { not: id },
          status: { in: ['RESERVED', 'DISPATCHED', 'OVERDUE'] },
        },
      })
      if (stillOpen === 0) {
        await tx.carVehicle.update({
          where: { id: booking.vehicleId },
          data: { status: 'AVAILABLE' },
        })
      }
    })
    refresh()
    return { ok: true, message: 'Booking cancelled. Vehicle is available again.' }
  } catch (error) { return fail(error) }
}

export async function checkInCarBooking(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.BOOKING_CHECKIN)
    const check = returnConditionSchema.parse(values(formData))
    const newDamage = String(formData.get('newDamage') || '') === 'true' || formData.get('newDamage') === 'on'
    const dentsNotes = newDamage
      ? `[NEW DAMAGE] ${check.dentsNotes}`
      : check.dentsNotes
    const conditionRating = Number(formData.get('conditionRating') || 0)
    if (!Number.isInteger(conditionRating) || conditionRating < 1 || conditionRating > 5) {
      return { ok: false, message: 'Select a return condition rating from 1 to 5.' }
    }
    const extras = parseExtraCharges(formData)
    const extrasTotal = extraChargesSum(extras)
    const returnNotes = sanitizeComment(formData.get('returnNotes'))
    const decreaseComment = sanitizeComment(formData.get('decreaseComment'))
    if (conditionRating <= 2 && decreaseComment.length < 3) {
      return { ok: false, message: 'Add a decrease comment when rating is 1 or 2.' }
    }
    const condition = {
      dentsNotes,
      fuelLevel: check.fuelLevel,
      odometer: check.odometer,
      componentsOk: check.componentsOk,
      checkedBy: profile.fullName || profile.id,
      conditionRating,
      decreaseComment: conditionRating <= 2 ? decreaseComment : decreaseComment || null,
    }
    const actualReturnAt = new Date(String(formData.get('actualReturnAt') || new Date().toISOString()))
    if (Number.isNaN(actualReturnAt.getTime())) {
      return { ok: false, message: 'Enter a valid actual return date and time.' }
    }

    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({
        where: { id },
        include: { penaltyRule: true, client: true },
      })
      if (!['DISPATCHED', 'OVERDUE'].includes(booking.status)) {
        throw new Error('This booking is not out on hire.')
      }
      let amount = 0
      if (booking.penaltyRule) {
        const result = latenessPenalty(booking.expectedReturnAt, actualReturnAt, booking.penaltyRule)
        amount = result.amount
        if (result.minutesLate > 0) {
          await tx.carPenalty.create({
            data: {
              bookingId: id,
              ruleId: booking.penaltyRule.id,
              minutesLate: result.minutesLate,
              amount,
              calculationNotes: result.notes,
            },
          })
        }
      }
      await tx.conditionCheck.upsert({
        where: { bookingId_stage: { bookingId: id, stage: 'RETURN' } },
        create: { bookingId: id, stage: 'RETURN', ...condition },
        update: condition,
      })
      if (extras.length) {
        await tx.bookingExtraCharge.createMany({
          data: extras.map((item) => ({
            bookingId: id,
            stage: 'RETURN',
            description: item.description,
            amount: item.amount,
          })),
        })
      }
      await tx.carBooking.update({
        where: { id },
        data: {
          actualReturnAt,
          returnedAt: new Date(),
          status: 'RETURNED',
          penaltyAmount: amount,
          totalCharge: { increment: roundMoney(amount + extrasTotal) },
          ...(returnNotes || newDamage ? { returnNotes: returnNotes || dentsNotes } : {}),
        },
      })
      await tx.carVehicle.update({ where: { id: booking.vehicleId }, data: { status: 'AVAILABLE' } })
      await tx.messageLog.create({
        data: {
          recipientType: 'CLIENT',
          recipientId: booking.clientId,
          recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS',
          template: 'vehicle_returned',
          body: `Vehicle returned. Final charge: KES ${(booking.totalCharge + amount).toLocaleString()}.`,
          status: 'QUEUED',
        },
      })
    })

    const { tryAwardLoyaltyForBooking } = await import('@/lib/loyalty/award')
    const loyalty = await tryAwardLoyaltyForBooking(id, { createdBy: profile.id })
    refresh()
    const loyaltyMsg =
      loyalty.awarded > 0
        ? ` Loyalty +${loyalty.awarded} pts.`
        : loyalty.pendingReason
          ? ` Loyalty pending: ${loyalty.pendingReason}`
          : ''
    return {
      ok: true,
      message: `Marked returned — hire ended.${loyaltyMsg}`,
    }
  } catch (error) { return fail(error) }
}

export async function recordCarPayment(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.PAYMENT_RECORD)
    const data = paymentSchema.parse(values(formData))
    const redeemPts = Math.floor(Number(formData.get('redeemPoints') || 0))
    if (redeemPts > 0) {
      const { redeemLoyaltyOnBooking } = await import('@/lib/loyalty/award')
      const redeemed = await redeemLoyaltyOnBooking({
        bookingId: data.bookingId,
        pointsToRedeem: redeemPts,
        createdBy: profile.id,
      })
      if (!redeemed.ok) return { ok: false, message: redeemed.message }
    }
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id: data.bookingId }, include: { client: true } })
      await tx.carPayment.create({
        data: {
          bookingId: data.bookingId,
          amount: data.amount,
          method: data.method,
          mpesaRef: data.mpesaRef || null,
          phone: data.phone || null,
          notes: data.notes || null,
          receivedBy: data.receivedBy || null,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      })
      await tx.messageLog.create({
        data: {
          recipientType: 'CLIENT', recipientId: booking.clientId, recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS', template: 'payment_received',
          body: `Payment of KES ${data.amount.toLocaleString()} received${data.mpesaRef ? ` (${data.mpesaRef})` : ''}.`, status: 'QUEUED',
        },
      })
    })
    const { tryAwardLoyaltyForBooking } = await import('@/lib/loyalty/award')
    const loyalty = await tryAwardLoyaltyForBooking(data.bookingId, { createdBy: profile.id })
    refresh()
    const extra =
      loyalty.awarded > 0 ? ` Loyalty +${loyalty.awarded} pts.` : ''
    return { ok: true, message: `Payment recorded and receipt notification queued.${extra}` }
  } catch (error) { return fail(error) }
}

/** Manual cash / M-Pesa / bank payment — booking optional (reconcile later). */
export async function recordInstaManualPayment(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYMENT_RECORD)
    const raw = instaPayManualSchema.parse(values(formData))
    const bookingId = raw.bookingId?.trim() || null
    if (bookingId) {
      await prisma.carBooking.findUniqueOrThrow({ where: { id: bookingId } })
    }
    await prisma.carPayment.create({
      data: {
        bookingId,
        amount: raw.amount,
        method: raw.method,
        mpesaRef: raw.mpesaRef || null,
        phone: raw.phone || null,
        notes: raw.notes || null,
        receivedBy: raw.receivedBy || null,
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    })
    refresh()
    return {
      ok: true,
      message: bookingId
        ? 'Manual payment recorded against booking.'
        : 'Manual payment recorded — reconcile to a booking when ready.',
    }
  } catch (error) { return fail(error) }
}

/** Prompt client phone with Daraja STK — booking optional. */
export async function initiateInstaStk(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYMENT_STK)
    if (!mpesaConfigured()) {
      return { ok: false, message: 'M-Pesa is not configured. Set Daraja env vars to send STK.' }
    }
    const raw = instaStkSchema.parse(values(formData))
    const bookingId = raw.bookingId?.trim() || null
    let accountReference = (raw.accountRef || 'INSTAPAY').slice(0, 12)
    if (bookingId) {
      const booking = await prisma.carBooking.findUniqueOrThrow({ where: { id: bookingId } })
      accountReference = booking.reference.slice(0, 12)
    }
    const response = await stkPush({
      phone: raw.phone,
      amount: raw.amount,
      accountReference,
      description: 'Doxa car hire',
    })
    if (response.ResponseCode !== '0') {
      return { ok: false, message: response.CustomerMessage || 'STK Push was rejected.' }
    }
    await prisma.carPayment.create({
      data: {
        bookingId,
        amount: raw.amount,
        phone: raw.phone,
        method: 'MPESA',
        status: 'PENDING',
        checkoutId: response.CheckoutRequestID,
        notes: bookingId ? null : 'Insta Pay — awaiting reconcile',
      },
    })
    refresh()
    return {
      ok: true,
      message: response.CustomerMessage || 'STK Push sent. Ask the client to enter their M-Pesa PIN.',
    }
  } catch (error) { return fail(error) }
}

/** Attach a successful (or pending) Insta payment to a car-hire booking. */
export async function reconcileCarPayment(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYMENT_RECORD)
    const { paymentId, bookingId } = reconcilePaymentSchema.parse(values(formData))
    const [payment, booking] = await Promise.all([
      prisma.carPayment.findUniqueOrThrow({ where: { id: paymentId } }),
      prisma.carBooking.findUniqueOrThrow({ where: { id: bookingId }, include: { client: true } }),
    ])
    if (payment.bookingId && payment.bookingId !== bookingId) {
      return { ok: false, message: 'This payment is already linked to another booking.' }
    }
    await prisma.carPayment.update({
      where: { id: paymentId },
      data: {
        bookingId,
        notes: payment.notes?.includes('reconcile')
          ? `Reconciled to ${booking.reference}`
          : payment.notes,
      },
    })
    if (payment.status === 'COMPLETED') {
      await prisma.messageLog.create({
        data: {
          recipientType: 'CLIENT',
          recipientId: booking.clientId,
          recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS',
          template: 'payment_received',
          body: `Payment of KES ${payment.amount.toLocaleString()} reconciled to hire ${booking.reference}.`,
          status: 'QUEUED',
        },
      })
    }
    refresh()
    return { ok: true, message: `Payment reconciled to ${booking.reference}.` }
  } catch (error) { return fail(error) }
}

export async function recordCarExpense(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.EXPENSE_RECORD)
    const data = expenseSchema.parse(values(formData))
    const vehicle = await prisma.carVehicle.findUniqueOrThrow({ where: { id: data.vehicleId } })
    await prisma.carExpense.create({ data: { ...data, ownerId: vehicle.ownerId } })
    await noteCalmingAction(profile.id)
    refresh()
    return { ok: true, message: `Expense recorded on ${vehicle.regNumber}.` }
  } catch (error) { return fail(error) }
}

export async function updateCarExpense(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.EXPENSE_RECORD)
    const data = expenseUpdateSchema.parse(values(formData))
    const existing = await prisma.carExpense.findUniqueOrThrow({
      where: { id: data.expenseId },
      include: { vehicle: { select: { regNumber: true } } },
    })
    await prisma.carExpense.update({
      where: { id: data.expenseId },
      data: {
        description: data.description,
        category: data.category,
        amount: data.amount,
        incurredAt: data.incurredAt,
      },
    })
    await noteCalmingAction(profile.id)
    refresh()
    return { ok: true, message: `Expense updated on ${existing.vehicle.regNumber}.` }
  } catch (error) { return fail(error) }
}

export async function deleteCarExpense(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.EXPENSE_RECORD)
    const data = expenseDeleteSchema.parse(values(formData))
    const existing = await prisma.carExpense.findUniqueOrThrow({
      where: { id: data.expenseId },
      include: { vehicle: { select: { regNumber: true } } },
    })
    await prisma.carExpense.delete({ where: { id: data.expenseId } })
    await trackRecordDeletes({
      userId: profile.id,
      actorName: profile.fullName,
      actorEmail: profile.email,
      entity: 'CarExpense',
      mode: 'single',
      count: 1,
      entityIds: [data.expenseId],
    })
    refresh()
    return { ok: true, message: `Expense removed from ${existing.vehicle.regNumber}.` }
  } catch (error) { return fail(error) }
}

export async function bulkDeleteCarExpenses(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.EXPENSE_RECORD)
    const rawIds = formData.getAll('expenseIds').length
      ? formData.getAll('expenseIds').map(String)
      : String(formData.get('expenseIds') || '')
    const data = expenseBulkDeleteSchema.parse({ expenseIds: rawIds })
    const uniqueIds = [...new Set(data.expenseIds)]
    const result = await prisma.carExpense.deleteMany({ where: { id: { in: uniqueIds } } })
    await trackRecordDeletes({
      userId: profile.id,
      actorName: profile.fullName,
      actorEmail: profile.email,
      entity: 'CarExpense',
      mode: 'bulk',
      count: result.count,
      entityIds: uniqueIds,
    })
    refresh()
    return {
      ok: true,
      message:
        result.count === 1
          ? '1 expense deleted.'
          : `${result.count} expenses deleted.`,
    }
  } catch (error) { return fail(error) }
}

