import { prisma } from '@/lib/prisma'
import { calculateLoyaltyPoints, discountKesFromPoints } from '@/lib/loyalty/points'
import { getLoyaltyConfig } from '@/lib/settings/hire-settings'

function bookingBalance(
  totalCharge: number,
  loyaltyDiscountKes: number,
  paid: number,
): number {
  return Math.max(0, totalCharge - loyaltyDiscountKes - paid)
}

/**
 * Award loyalty when booking is RETURNED, balance is 0, and client is ACTIVE.
 * Idempotent via sourceKey `earn:{bookingId}`.
 */
export async function tryAwardLoyaltyForBooking(
  bookingId: string,
  opts?: { createdBy?: string | null; forceRecalc?: boolean },
): Promise<{ awarded: number; pendingReason?: string }> {
  const config = await getLoyaltyConfig()
  if (!config.enabled) {
    return { awarded: 0, pendingReason: 'Loyalty program is disabled in Settings.' }
  }

  const booking = await prisma.carBooking.findUnique({
    where: { id: bookingId },
    include: {
      client: true,
      vehicle: { select: { type: true } },
      payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
      checks: { where: { stage: 'RETURN' }, take: 1 },
    },
  })
  if (!booking) return { awarded: 0, pendingReason: 'Booking not found.' }
  if (booking.status !== 'RETURNED') {
    return { awarded: 0, pendingReason: 'Car must be marked returned first.' }
  }
  if (booking.client.status !== 'ACTIVE') {
    return { awarded: 0, pendingReason: 'Client is suspended — no points.' }
  }

  const paid = booking.payments.reduce((s, p) => s + p.amount, 0)
  const balance = bookingBalance(booking.totalCharge, booking.loyaltyDiscountKes, paid)
  if (balance > 0.009) {
    return {
      awarded: 0,
      pendingReason: 'Settle the hire balance to 0 before points are awarded.',
    }
  }

  const rating = booking.checks[0]?.conditionRating
  if (!rating || rating < 1 || rating > 5) {
    return { awarded: 0, pendingReason: 'Return condition rating (1–5) is required.' }
  }

  const points = calculateLoyaltyPoints({
    vehicleType: booking.vehicle.type,
    hireDays: booking.days,
    hireAmountKes: booking.totalCharge,
    conditionRating: rating,
  })

  const sourceKey = `earn:${bookingId}`
  const existing = await prisma.loyaltyLedger.findUnique({ where: { sourceKey } })

  if (existing && !opts?.forceRecalc) {
    return { awarded: existing.points }
  }

  if (existing && opts?.forceRecalc) {
    const delta = points - existing.points
    if (delta === 0) return { awarded: points }
    const updated = await prisma.$transaction(async (tx) => {
      const client = await tx.carClient.update({
        where: { id: booking.clientId },
        data: { loyaltyPoints: { increment: delta } },
      })
      await tx.loyaltyLedger.update({
        where: { id: existing.id },
        data: {
          points,
          balanceAfter: client.loyaltyPoints,
          note: `Earn (recalculated ${existing.points} → ${points})`,
        },
      })
      await tx.carBooking.update({
        where: { id: bookingId },
        data: { loyaltyPointsEarned: points },
      })
      await tx.loyaltyLedger.create({
        data: {
          clientId: booking.clientId,
          bookingId,
          kind: 'RECALC',
          points: delta,
          balanceAfter: client.loyaltyPoints,
          note: `Recalc delta for booking ${booking.reference}`,
          createdBy: opts.createdBy ?? null,
        },
      })
      return points
    })
    return { awarded: updated }
  }

  if (points <= 0) {
    await prisma.carBooking.update({
      where: { id: bookingId },
      data: { loyaltyPointsEarned: 0 },
    })
    return { awarded: 0 }
  }

  await prisma.$transaction(async (tx) => {
    const client = await tx.carClient.update({
      where: { id: booking.clientId },
      data: { loyaltyPoints: { increment: points } },
    })
    await tx.loyaltyLedger.create({
      data: {
        clientId: booking.clientId,
        bookingId,
        kind: 'EARN',
        points,
        balanceAfter: client.loyaltyPoints,
        note: `Hire ${booking.reference} returned & paid`,
        createdBy: opts?.createdBy ?? null,
        sourceKey,
      },
    })
    await tx.carBooking.update({
      where: { id: bookingId },
      data: { loyaltyPointsEarned: points },
    })
  })

  return { awarded: points }
}

/** Apply loyalty points as KES discount on an open or returned booking. */
export async function redeemLoyaltyOnBooking(opts: {
  bookingId: string
  pointsToRedeem: number
  createdBy?: string | null
}): Promise<{ ok: true; discountKes: number; pointsUsed: number } | { ok: false; message: string }> {
  const config = await getLoyaltyConfig()
  if (!config.enabled) return { ok: false, message: 'Loyalty program is disabled.' }

  const pointsWanted = Math.floor(opts.pointsToRedeem)
  if (pointsWanted <= 0) return { ok: false, message: 'Enter points to redeem.' }

  const booking = await prisma.carBooking.findUnique({
    where: { id: opts.bookingId },
    include: {
      client: true,
      payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
    },
  })
  if (!booking) return { ok: false, message: 'Booking not found.' }
  if (booking.client.status !== 'ACTIVE') {
    return { ok: false, message: 'Suspended clients cannot redeem points.' }
  }
  if (booking.client.loyaltyPoints < pointsWanted) {
    return { ok: false, message: 'Not enough loyalty points.' }
  }

  const paid = booking.payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, booking.totalCharge - booking.loyaltyDiscountKes - paid)
  if (remaining <= 0) return { ok: false, message: 'Nothing left to discount on this hire.' }

  const { pointsUsed, discountKes } = discountKesFromPoints(
    pointsWanted,
    remaining,
    config,
  )
  if (pointsUsed <= 0 || discountKes <= 0) {
    return {
      ok: false,
      message: `Need at least ${config.minPointsToRedeem} points (within max discount %).`,
    }
  }

  await prisma.$transaction(async (tx) => {
    const client = await tx.carClient.update({
      where: { id: booking.clientId },
      data: { loyaltyPoints: { decrement: pointsUsed } },
    })
    await tx.carBooking.update({
      where: { id: booking.id },
      data: {
        loyaltyPointsRedeemed: { increment: pointsUsed },
        loyaltyDiscountKes: { increment: discountKes },
      },
    })
    await tx.loyaltyLedger.create({
      data: {
        clientId: booking.clientId,
        bookingId: booking.id,
        kind: 'REDEEM',
        points: -pointsUsed,
        balanceAfter: client.loyaltyPoints,
        note: `Redeemed on ${booking.reference} (−KES ${discountKes})`,
        createdBy: opts.createdBy ?? null,
      },
    })
  })

  return { ok: true, discountKes, pointsUsed }
}

/** Clear loyalty to 0 when client is suspended. */
export async function clearLoyaltyOnSuspend(
  clientId: string,
  createdBy?: string | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const client = await tx.carClient.findUniqueOrThrow({ where: { id: clientId } })
    if (client.loyaltyPoints === 0) return
    const cleared = client.loyaltyPoints
    await tx.carClient.update({
      where: { id: clientId },
      data: { loyaltyPoints: 0 },
    })
    await tx.loyaltyLedger.create({
      data: {
        clientId,
        kind: 'ADJUST',
        points: -cleared,
        balanceAfter: 0,
        note: 'Suspended — loyalty cleared',
        createdBy: createdBy ?? null,
      },
    })
  })
}
