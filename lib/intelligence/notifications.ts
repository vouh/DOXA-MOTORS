import { prisma } from '@/lib/prisma'
import { listBookingAlerts, type BookingAlert } from '@/lib/intelligence/bookings'

export type StaffNoticeKind =
  | 'overdue'
  | 'ending_soon'
  | 'late_payment'
  | 'new_cost'
  | 'document_expiry'

export type StaffNotice = {
  id: string
  kind: StaffNoticeKind
  urgency: 'info' | 'urgent'
  title: string
  message: string
  href: string
  at: string
}

function fromBookingAlert(alert: BookingAlert): StaffNotice {
  return {
    id: `booking:${alert.kind}:${alert.id}`,
    kind: alert.kind,
    urgency: alert.urgency,
    title: alert.title,
    message: alert.message,
    href: '/admin/bookings',
    at: alert.expectedReturnAt,
  }
}

/** Build live notice candidates (not yet filtered by delete). */
export async function buildLiveStaffNotices(now = new Date()): Promise<StaffNotice[]> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const expiryLimit = new Date(now.getTime() + 7 * 86_400_000)

  const [bookingAlerts, openHires, recentCosts, expiringDocs] = await Promise.all([
    listBookingAlerts(now),
    prisma.carBooking.findMany({
      where: { status: { in: ['DISPATCHED', 'OVERDUE', 'RETURNED'] } },
      include: {
        client: true,
        vehicle: { select: { regNumber: true } },
        payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
      },
      orderBy: { expectedReturnAt: 'asc' },
      take: 80,
    }),
    prisma.carExpense.findMany({
      where: { incurredAt: { gte: weekAgo } },
      include: {
        vehicle: { select: { regNumber: true } },
        owner: { select: { fullName: true } },
      },
      orderBy: { incurredAt: 'desc' },
      take: 20,
    }),
    prisma.vehicleDocument.findMany({
      where: { expiryDate: { lte: expiryLimit } },
      include: { vehicle: { select: { regNumber: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 40,
    }),
  ])

  const notices: StaffNotice[] = bookingAlerts.map(fromBookingAlert)

  for (const booking of openHires) {
    const paid = booking.payments.reduce((sum, p) => sum + p.amount, 0)
    const balance = Math.max(0, booking.totalCharge - paid)
    if (balance <= 0) continue
    const late =
      booking.status === 'OVERDUE' ||
      booking.status === 'RETURNED' ||
      booking.expectedReturnAt < now
    notices.push({
      id: `payment:${booking.id}`,
      kind: 'late_payment',
      urgency: late ? 'urgent' : 'info',
      title: late ? 'Late payment' : 'Outstanding hire balance',
      message: `${booking.reference} · ${booking.vehicle.regNumber} · ${booking.client.fullName} owes KES ${balance.toLocaleString()}.`,
      href: '/admin/bookings',
      at: (booking.returnedAt ?? booking.expectedReturnAt).toISOString(),
    })
  }

  for (const cost of recentCosts) {
    notices.push({
      id: `cost:${cost.id}`,
      kind: 'new_cost',
      urgency: 'info',
      title: 'New vehicle cost',
      message: `${cost.vehicle.regNumber} · ${cost.category} · KES ${cost.amount.toLocaleString()} (${cost.owner.fullName}).`,
      href: '/admin/vehicles',
      at: cost.incurredAt.toISOString(),
    })
  }

  for (const doc of expiringDocs) {
    const expired = doc.expiryDate < now
    notices.push({
      id: `doc:${doc.id}`,
      kind: 'document_expiry',
      urgency: expired ? 'urgent' : 'info',
      title: expired ? 'Document expired' : 'Document expiring',
      message: `${doc.vehicle.regNumber} · ${doc.type} · ${doc.expiryDate.toLocaleDateString()}.`,
      href: '/admin/vehicles',
      at: doc.expiryDate.toISOString(),
    })
  }

  notices.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === 'urgent' ? -1 : 1
    return new Date(b.at).getTime() - new Date(a.at).getTime()
  })

  return notices
}

/** Upsert live notices; never revive soft-deleted rows. */
export async function syncStaffNotifications(now = new Date()): Promise<void> {
  const inbox = prisma.staffNotification
  if (!inbox?.findUnique || !inbox?.upsert) {
    console.warn(
      '[notifications] prisma.staffNotification unavailable — run npx prisma generate after stopping the dev server.',
    )
    return
  }
  const live = await buildLiveStaffNotices(now)
  for (const notice of live) {
    const existing = await inbox.findUnique({
      where: { sourceKey: notice.id },
      select: { deletedAt: true },
    })
    if (existing?.deletedAt) continue
    await inbox.upsert({
      where: { sourceKey: notice.id },
      create: {
        sourceKey: notice.id,
        kind: notice.kind,
        title: notice.title,
        message: notice.message,
        href: notice.href,
        urgency: notice.urgency,
        eventAt: new Date(notice.at),
      },
      update: {
        kind: notice.kind,
        title: notice.title,
        message: notice.message,
        href: notice.href,
        urgency: notice.urgency,
        eventAt: new Date(notice.at),
      },
    })
  }
}

export type PersistedStaffNotice = StaffNotice & { dbId: string; read: boolean }

/** Active inbox rows (not deleted), after sync. `read` is per staff user. */
export async function listStaffNotifications(
  userId: string,
  now = new Date(),
): Promise<PersistedStaffNotice[]> {
  await syncStaffNotifications(now)
  const inbox = prisma.staffNotification
  if (!inbox?.findMany) return []

  try {
    const rows = await inbox.findMany({
      where: { deletedAt: null },
      orderBy: [{ urgency: 'desc' }, { eventAt: 'desc' }],
      take: 200,
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
      },
    })
    return rows.map((row) => ({
      dbId: row.id,
      id: row.sourceKey,
      kind: row.kind as StaffNoticeKind,
      urgency: row.urgency === 'urgent' ? 'urgent' : 'info',
      title: row.title,
      message: row.message,
      href: row.href,
      at: row.eventAt.toISOString(),
      read: row.reads.length > 0,
    }))
  } catch (error) {
    // Migration not applied / stale client — still show inbox as unread.
    console.warn('[notifications] list with reads failed; falling back', error)
    const rows = await inbox.findMany({
      where: { deletedAt: null },
      orderBy: [{ urgency: 'desc' }, { eventAt: 'desc' }],
      take: 200,
    })
    return rows.map((row) => ({
      dbId: row.id,
      id: row.sourceKey,
      kind: row.kind as StaffNoticeKind,
      urgency: row.urgency === 'urgent' ? 'urgent' : 'info',
      title: row.title,
      message: row.message,
      href: row.href,
      at: row.eventAt.toISOString(),
      read: false,
    }))
  }
}

export async function countUnreadStaffNotifications(userId: string): Promise<number> {
  try {
    await syncStaffNotifications()
    const inbox = prisma.staffNotification
    if (!inbox?.count) return 0
    return await inbox.count({
      where: {
        deletedAt: null,
        reads: { none: { userId } },
      },
    })
  } catch (error) {
    console.warn('[notifications] unread count failed', error)
    return 0
  }
}

/** @deprecated Prefer markStaffNotificationRead — kept for compatibility. */
export async function markStaffNotificationsViewed(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { notificationsViewedAt: new Date() },
  })
}

export async function markStaffNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.staffNotificationRead.upsert({
    where: {
      userId_notificationId: { userId, notificationId },
    },
    create: { userId, notificationId },
    update: { readAt: new Date() },
  })
}

export async function deleteStaffNotification(dbId: string): Promise<void> {
  const inbox = prisma.staffNotification
  if (!inbox?.update) {
    throw new Error(
      'Notifications are unavailable. Stop the dev server and run npx prisma generate.',
    )
  }
  await inbox.update({
    where: { id: dbId },
    data: { deletedAt: new Date() },
  })
}
