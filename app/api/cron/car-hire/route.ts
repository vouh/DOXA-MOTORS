import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  let reminders = 0
  let overdue = 0
  let expiries = 0

  const ending = await prisma.carBooking.findMany({
    where: { status: 'DISPATCHED', expectedReturnAt: { gt: now, lte: twoHours } },
    include: { client: true, vehicle: true },
  })
  for (const booking of ending) {
    // Dedupe per booking (not per client) — one client can have multiple hires ending soon.
    const bookingRef = `booking:${booking.id}`
    const exists = await prisma.messageLog.findFirst({
      where: {
        recipientId: booking.clientId,
        template: 'hire_ending_soon',
        subject: bookingRef,
        createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      },
    })
    if (!exists) {
      await prisma.messageLog.create({
        data: {
          recipientType: 'CLIENT',
          recipientId: booking.clientId,
          recipientName: booking.client.fullName,
          destination: booking.client.email || booking.client.phone,
          channel: booking.client.email ? 'EMAIL' : 'SMS',
          template: 'hire_ending_soon',
          subject: bookingRef,
          body: `${booking.vehicle.regNumber} is due back at ${booking.expectedReturnAt.toLocaleString()}.`,
        },
      })
      reminders++
    }
  }

  const lateBookings = await prisma.carBooking.findMany({
    where: { status: 'DISPATCHED', expectedReturnAt: { lt: now } },
    include: { client: true, vehicle: true },
  })
  for (const booking of lateBookings) {
    await prisma.carBooking.update({ where: { id: booking.id }, data: { status: 'OVERDUE' } })
    await prisma.messageLog.create({
      data: {
        recipientType: 'CLIENT', recipientId: booking.clientId, recipientName: booking.client.fullName,
        destination: booking.client.email || booking.client.phone, channel: booking.client.email ? 'EMAIL' : 'SMS',
        template: 'vehicle_overdue', body: `${booking.vehicle.regNumber} is overdue. Please contact Doxa Motor Solutions.`,
      },
    })
    overdue++
  }

  const expiring = await prisma.vehicleDocument.findMany({
    where: { expiryDate: { gte: now, lte: sevenDays }, alertSentAt: null },
    include: { vehicle: true },
  })
  for (const document of expiring) {
    await prisma.$transaction([
      prisma.messageLog.create({
        data: {
          recipientType: 'STAFF', recipientId: 'director', recipientName: 'Director',
          destination: process.env.DIRECTOR_ALERT_DESTINATION || 'dashboard', channel: 'EMAIL',
          template: 'document_expiry',
          body: `${document.vehicle.regNumber} ${document.type.toLowerCase()} expires on ${document.expiryDate.toLocaleDateString()}.`,
        },
      }),
      prisma.vehicleDocument.update({ where: { id: document.id }, data: { alertSentAt: now } }),
    ])
    expiries++
  }

  return NextResponse.json({ ok: true, reminders, overdue, expiries, runAt: now.toISOString() })
}
