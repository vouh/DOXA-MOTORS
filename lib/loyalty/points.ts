import type { VehicleType } from '@prisma/client'
import {
  DEFAULT_LOYALTY_CONFIG,
  type LoyaltyConfig,
  VEHICLE_TYPES,
} from '@/lib/loyalty/defaults'

export type EarnInput = {
  vehicleType: VehicleType
  hireDays: number
  hireAmountKes: number
  conditionRating: number
}

export function clampRating(rating: number): 1 | 2 | 3 | 4 | 5 {
  const n = Math.round(rating)
  if (n < 1) return 1
  if (n > 5) return 5
  return n as 1 | 2 | 3 | 4 | 5
}

/** Simple earn: category base + days + amount + rating bonus. */
export function calculateLoyaltyPoints(
  input: EarnInput,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG,
): number {
  if (!config.enabled) return 0
  const type = VEHICLE_TYPES.includes(input.vehicleType as (typeof VEHICLE_TYPES)[number])
    ? (input.vehicleType as (typeof VEHICLE_TYPES)[number])
    : 'SALOON'
  const row = config.category[type]
  const days = Math.max(1, Math.floor(input.hireDays) || 1)
  const amount = Math.max(0, input.hireAmountKes)
  const rating = clampRating(input.conditionRating)
  const fromAmount =
    config.kesPerPointEarn > 0 ? Math.floor(amount / config.kesPerPointEarn) : 0
  const bonus = config.conditionBonusPoints[rating - 1] ?? 0
  return Math.max(
    0,
    Math.round(row.basePoints + row.pointsPerDay * days + fromAmount + bonus),
  )
}

export function discountKesFromPoints(
  points: number,
  hireAmountKes: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG,
): { pointsUsed: number; discountKes: number } {
  if (points < config.minPointsToRedeem || points <= 0) {
    return { pointsUsed: 0, discountKes: 0 }
  }
  const maxKes = (Math.max(0, hireAmountKes) * config.maxDiscountPercentOfHire) / 100
  const rawKes = points * config.kesPerPointRedeem
  const discountKes = Math.min(rawKes, maxKes)
  const pointsUsed =
    config.kesPerPointRedeem > 0
      ? Math.min(points, Math.ceil(discountKes / config.kesPerPointRedeem))
      : 0
  return {
    pointsUsed,
    discountKes: Math.round(discountKes * 100) / 100,
  }
}
