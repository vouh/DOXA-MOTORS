'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  bookingSchema, clientSchema, conditionSchema, expenseSchema, ownerSchema,
  paymentSchema, penaltyRuleSchema, vehicleSchema,
} from '@/lib/car-hire/validation'
import { bookingCharge, latenessPenalty, ownerSettlement } from '@/lib/car-hire/calculations'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function values(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function fail(error: unknown): ActionResult {
  const message = error instanceof Error ? error.message : 'The operation could not be completed.'
  return { ok: false, message }
}

function refresh() {
  revalidatePath('/admin', 'layout')
}

export async function createCarClient(formData: FormData): Promise<ActionResult> {
  try {
    const data = clientSchema.parse(values(formData))
    await prisma.carClient.create({ data: { ...data, email: data.email || null } })
    refresh()
    return { ok: true, message: 'Client registered.' }
  } catch (error) { return fail(error) }
}

export async function setCarClientStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<ActionResult> {
  try {
    await prisma.carClient.update({ where: { id }, data: { status } })
    refresh()
    return { ok: true, message: `Client ${status === 'ACTIVE' ? 'activated' : 'suspended'}.` }
  } catch (error) { return fail(error) }
}

export async function createCarOwner(formData: FormData): Promise<ActionResult> {
  try {
    const data = ownerSchema.parse(values(formData))
    await prisma.carOwner.create({ data: { ...data, email: data.email || null } })
    refresh()
    return { ok: true, message: 'Owner registered.' }
  } catch (error) { return fail(error) }
}

export async function createCarVehicle(formData: FormData): Promise<ActionResult> {
  try {
    const data = vehicleSchema.parse(values(formData))
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

export async function createPenaltyRule(formData: FormData): Promise<ActionResult> {
  try {
    const data = penaltyRuleSchema.parse(values(formData))
    await prisma.$transaction([
      prisma.penaltyRule.updateMany({ where: { active: true }, data: { active: false } }),
      prisma.penaltyRule.create({ data }),
    ])
    refresh()
    return { ok: true, message: 'Penalty rule activated.' }
  } catch (error) { return fail(error) }
}

export async function createCarBooking(formData: FormData): Promise<ActionResult> {
  try {
    const data = bookingSchema.parse(values(formData))
    const { days, baseCharge } = bookingCharge(data.startAt, data.expectedReturnAt, data.dailyRate)
    const rule = await prisma.penaltyRule.findFirst({ where: { active: true }, orderBy: { effectiveFrom: 'desc' } })
    const reference = `DX-${Date.now().toString(36).toUpperCase()}`
    await prisma.$transaction(async (tx) => {
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
      await tx.carBooking.create({
        data: { ...data, reference, days, baseCharge, totalCharge: baseCharge, penaltyRuleId: rule?.id },
      })
      await tx.carVehicle.update({ where: { id: data.vehicleId }, data: { status: 'RESERVED' } })
    })
    refresh()
    return { ok: true, message: `Booking ${reference} created.` }
  } catch (error) { return fail(error) }
}

export async function dispatchCarBooking(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const check = conditionSchema.parse(values(formData))
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id }, include: { client: true, vehicle: true } })
      if (booking.status !== 'RESERVED') throw new Error('Only reserved bookings can be dispatched.')
      await tx.conditionCheck.upsert({
        where: { bookingId_stage: { bookingId: id, stage: 'DISPATCH' } },
        create: { bookingId: id, stage: 'DISPATCH', ...check },
        update: check,
      })
      await tx.carBooking.update({ where: { id }, data: { status: 'DISPATCHED', dispatchedAt: new Date() } })
      await tx.carVehicle.update({ where: { id: booking.vehicleId }, data: { status: 'HIRED' } })
      await tx.messageLog.create({
        data: {
          recipientType: 'CLIENT', recipientId: booking.clientId, recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS', template: 'vehicle_dispatched',
          body: `${booking.vehicle.regNumber} dispatched. Return by ${booking.expectedReturnAt.toLocaleString()}.`,
          status: 'QUEUED',
        },
      })
    })
    refresh()
    return { ok: true, message: 'Vehicle dispatched and notification queued.' }
  } catch (error) { return fail(error) }
}

export async function extendCarBooking(id: string, newReturnAt: Date): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id } })
      if (!['DISPATCHED', 'OVERDUE'].includes(booking.status)) throw new Error('Only active hires can be extended.')
      if (newReturnAt <= booking.expectedReturnAt) throw new Error('Extension must increase the return time.')
      const extension = bookingCharge(booking.expectedReturnAt, newReturnAt, booking.dailyRate)
      await tx.carHireExtension.create({
        data: {
          bookingId: id, previousReturnAt: booking.expectedReturnAt, newReturnAt,
          extraDays: extension.days, extraAmount: extension.baseCharge,
        },
      })
      await tx.carBooking.update({
        where: { id },
        data: {
          expectedReturnAt: newReturnAt,
          additionalCharge: { increment: extension.baseCharge },
          totalCharge: { increment: extension.baseCharge },
          status: 'DISPATCHED',
        },
      })
    })
    refresh()
    return { ok: true, message: 'Hire extended.' }
  } catch (error) { return fail(error) }
}

export async function checkInCarBooking(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const check = conditionSchema.parse(values(formData))
    const actualReturnAt = new Date(String(formData.get('actualReturnAt') || new Date().toISOString()))
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id }, include: { penaltyRule: true, client: true } })
      if (!['DISPATCHED', 'OVERDUE'].includes(booking.status)) throw new Error('This booking is not out on hire.')
      let amount = 0
      if (booking.penaltyRule) {
        const result = latenessPenalty(booking.expectedReturnAt, actualReturnAt, booking.penaltyRule)
        amount = result.amount
        if (result.minutesLate > 0) {
          await tx.carPenalty.create({
            data: {
              bookingId: id, ruleId: booking.penaltyRule.id, minutesLate: result.minutesLate,
              amount, calculationNotes: result.notes,
            },
          })
        }
      }
      await tx.conditionCheck.upsert({
        where: { bookingId_stage: { bookingId: id, stage: 'RETURN' } },
        create: { bookingId: id, stage: 'RETURN', ...check },
        update: check,
      })
      await tx.carBooking.update({
        where: { id },
        data: { actualReturnAt, returnedAt: new Date(), status: 'RETURNED', penaltyAmount: amount, totalCharge: { increment: amount } },
      })
      await tx.carVehicle.update({ where: { id: booking.vehicleId }, data: { status: 'AVAILABLE' } })
      await tx.messageLog.create({
        data: {
          recipientType: 'CLIENT', recipientId: booking.clientId, recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS', template: 'vehicle_returned',
          body: `Vehicle returned. Final charge: KES ${(booking.totalCharge + amount).toLocaleString()}.`, status: 'QUEUED',
        },
      })
    })
    refresh()
    return { ok: true, message: 'Vehicle checked in and final charge calculated.' }
  } catch (error) { return fail(error) }
}

export async function recordCarPayment(formData: FormData): Promise<ActionResult> {
  try {
    const data = paymentSchema.parse(values(formData))
    await prisma.$transaction(async (tx) => {
      const booking = await tx.carBooking.findUniqueOrThrow({ where: { id: data.bookingId }, include: { client: true } })
      await tx.carPayment.create({
        data: { ...data, mpesaRef: data.mpesaRef || null, status: 'COMPLETED', paidAt: new Date() },
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
    refresh()
    return { ok: true, message: 'Payment recorded and receipt notification queued.' }
  } catch (error) { return fail(error) }
}

export async function recordCarExpense(formData: FormData): Promise<ActionResult> {
  try {
    const data = expenseSchema.parse(values(formData))
    const vehicle = await prisma.carVehicle.findUniqueOrThrow({ where: { id: data.vehicleId } })
    await prisma.carExpense.create({ data: { ...data, ownerId: vehicle.ownerId } })
    refresh()
    return { ok: true, message: 'Expense recorded.' }
  } catch (error) { return fail(error) }
}

export async function generateOwnerPayout(ownerId: string, periodStart: Date, periodEnd: Date): Promise<ActionResult> {
  try {
    const owner = await prisma.carOwner.findUniqueOrThrow({
      where: { id: ownerId },
      include: {
        vehicles: {
          include: {
            bookings: { where: { status: 'RETURNED', returnedAt: { gte: periodStart, lte: periodEnd } } },
          },
        },
        expenses: { where: { incurredAt: { gte: periodStart, lte: periodEnd } } },
      },
    })
    const figures = ownerSettlement({
      bookingRevenue: owner.vehicles.flatMap((vehicle) => vehicle.bookings.map((booking) => booking.totalCharge)),
      expenseAmounts: owner.expenses.map((expense) => expense.amount),
      commissionType: owner.commissionType,
      commissionValue: owner.commissionValue,
      recurringDeduction: owner.recurringDeduction,
    })
    await prisma.ownerPayout.upsert({
      where: { ownerId_periodStart_periodEnd: { ownerId, periodStart, periodEnd } },
      create: { ownerId, periodStart, periodEnd, ...figures },
      update: figures,
    })
    refresh()
    return { ok: true, message: 'Owner payout statement generated.' }
  } catch (error) { return fail(error) }
}
