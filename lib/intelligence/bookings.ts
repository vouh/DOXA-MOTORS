import { prisma } from '@/lib/prisma'

export type BookingAlertKind = 'ending_soon' | 'overdue'

export type BookingAlert = {
  id: string
  kind: BookingAlertKind
  urgency: 'info' | 'urgent'
  reference: string
  clientName: string
  vehicleLabel: string
  expectedReturnAt: string
  minutesRemaining: number | null
  minutesOverdue: number | null
  title: string
  message: string
}

const ENDING_SOON_MS = 2 * 60 * 60 * 1000
const STAFF_DEST = 'dashboard'

function vehicleLabel(v: { make: string; model: string; regNumber: string }) {
  return `${v.make} ${v.model} (${v.regNumber})`
}

/** Mark DISPATCHED hires past expected return as OVERDUE and queue staff + client notices (deduped). */
export async function syncOverdueBookings(now = new Date()) {
  const late = await prisma.carBooking.findMany({
    where: { status: 'DISPATCHED', expectedReturnAt: { lt: now } },
    include: { client: true, vehicle: true },
  })

  let marked = 0
  for (const booking of late) {
    await prisma.carBooking.update({
      where: { id: booking.id },
      data: { status: 'OVERDUE' },
    })

    const bookingRef = `booking:${booking.id}`
    const staffExists = await prisma.messageLog.findFirst({
      where: {
        recipientType: 'STAFF',
        template: 'staff_booking_overdue',
        subject: bookingRef,
      },
      select: { id: true },
    })
    if (!staffExists) {
      await prisma.messageLog.create({
        data: {
          recipientType: 'STAFF',
          recipientId: 'system',
          recipientName: 'Yard / Office',
          destination: STAFF_DEST,
          channel: 'EMAIL',
          template: 'staff_booking_overdue',
          subject: bookingRef,
          body: `${booking.reference}: ${vehicleLabel(booking.vehicle)} hired by ${booking.client.fullName} is overdue (due ${booking.expectedReturnAt.toLocaleString()}).`,
          status: 'QUEUED',
        },
      })
    }

    const clientExists = await prisma.messageLog.findFirst({
      where: {
        recipientId: booking.clientId,
        template: 'vehicle_overdue',
        subject: bookingRef,
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    })
    if (!clientExists) {
      await prisma.messageLog.create({
        data: {
          recipientType: 'CLIENT',
          recipientId: booking.clientId,
          recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS',
          template: 'vehicle_overdue',
          subject: bookingRef,
          body: `${booking.vehicle.regNumber} is overdue. Please contact Doxa Motor Solutions.`,
          status: 'QUEUED',
        },
      })
    }

    marked++
  }
  return marked
}

/** Ending-soon staff prompts (within 2 hours) — one staff notice per booking per 12h. */
export async function syncEndingSoonStaffNotices(now = new Date()) {
  const until = new Date(now.getTime() + ENDING_SOON_MS)
  const ending = await prisma.carBooking.findMany({
    where: {
      status: 'DISPATCHED',
      expectedReturnAt: { gt: now, lte: until },
    },
    include: { client: true, vehicle: true },
  })

  let queued = 0
  for (const booking of ending) {
    const bookingRef = `booking:${booking.id}`
    const exists = await prisma.messageLog.findFirst({
      where: {
        recipientType: 'STAFF',
        template: 'staff_hire_ending_soon',
        subject: bookingRef,
        createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      },
      select: { id: true },
    })
    if (exists) continue

    await prisma.messageLog.create({
      data: {
        recipientType: 'STAFF',
        recipientId: 'system',
        recipientName: 'Yard / Office',
        destination: STAFF_DEST,
        channel: 'EMAIL',
        template: 'staff_hire_ending_soon',
        subject: bookingRef,
        body: `${booking.reference}: ${vehicleLabel(booking.vehicle)} due back at ${booking.expectedReturnAt.toLocaleString()} (${booking.client.fullName}).`,
        status: 'QUEUED',
      },
    })
    queued++
  }
  return queued
}

export async function listBookingAlerts(now = new Date()): Promise<BookingAlert[]> {
  await syncOverdueBookings(now)
  await syncEndingSoonStaffNotices(now)

  const open = await prisma.carBooking.findMany({
    where: { status: { in: ['DISPATCHED', 'OVERDUE'] } },
    include: { client: true, vehicle: true },
    orderBy: { expectedReturnAt: 'asc' },
  })

  const alerts: BookingAlert[] = []
  const endingUntil = now.getTime() + ENDING_SOON_MS

  for (const booking of open) {
    const due = booking.expectedReturnAt.getTime()
    const label = vehicleLabel(booking.vehicle)

    if (booking.status === 'OVERDUE' || due < now.getTime()) {
      const minutesOverdue = Math.max(1, Math.round((now.getTime() - due) / 60000))
      alerts.push({
        id: booking.id,
        kind: 'overdue',
        urgency: 'urgent',
        reference: booking.reference,
        clientName: booking.client.fullName,
        vehicleLabel: label,
        expectedReturnAt: booking.expectedReturnAt.toISOString(),
        minutesRemaining: null,
        minutesOverdue,
        title: 'Hire overdue',
        message: `${booking.reference} · ${label} was due ${minutesOverdue} min ago (${booking.client.fullName}).`,
      })
      continue
    }

    if (booking.status === 'DISPATCHED' && due <= endingUntil) {
      const minutesRemaining = Math.max(0, Math.round((due - now.getTime()) / 60000))
      alerts.push({
        id: booking.id,
        kind: 'ending_soon',
        urgency: 'info',
        reference: booking.reference,
        clientName: booking.client.fullName,
        vehicleLabel: label,
        expectedReturnAt: booking.expectedReturnAt.toISOString(),
        minutesRemaining,
        minutesOverdue: null,
        title: 'Hire ending soon',
        message: `${booking.reference} · ${label} is due in ${minutesRemaining} min (${booking.client.fullName}).`,
      })
    }
  }

  // Urgent first, then soonest due
  alerts.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === 'urgent' ? -1 : 1
    return new Date(a.expectedReturnAt).getTime() - new Date(b.expectedReturnAt).getTime()
  })

  return alerts
}
