import type { VehicleType } from '@prisma/client'

export const VEHICLE_TYPES = [
  'ECONOMY',
  'SALOON',
  'PICKUP',
  'VAN_MINIBUS',
  'SUV_4X4',
] as const satisfies readonly VehicleType[]

export type CategoryPointsRow = {
  basePoints: number
  pointsPerDay: number
}

export type LoyaltyConfig = {
  enabled: boolean
  /** Points from hire amount: floor(amount / kesPerPointEarn) */
  kesPerPointEarn: number
  category: Record<(typeof VEHICLE_TYPES)[number], CategoryPointsRow>
  /** Extra points by return rating 1–5 */
  conditionBonusPoints: [number, number, number, number, number]
  kesPerPointRedeem: number
  minPointsToRedeem: number
  maxDiscountPercentOfHire: number
}

export type CategoryStartingPrices = Record<(typeof VEHICLE_TYPES)[number], number>

export const DEFAULT_CATEGORY_STARTING_PRICES: CategoryStartingPrices = {
  ECONOMY: 3500,
  SALOON: 5000,
  PICKUP: 6000,
  VAN_MINIBUS: 7500,
  SUV_4X4: 9000,
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  kesPerPointEarn: 100,
  category: {
    ECONOMY: { basePoints: 5, pointsPerDay: 8 },
    SALOON: { basePoints: 8, pointsPerDay: 12 },
    PICKUP: { basePoints: 10, pointsPerDay: 14 },
    VAN_MINIBUS: { basePoints: 12, pointsPerDay: 16 },
    SUV_4X4: { basePoints: 15, pointsPerDay: 20 },
  },
  conditionBonusPoints: [0, 2, 5, 10, 20],
  kesPerPointRedeem: 1,
  minPointsToRedeem: 50,
  maxDiscountPercentOfHire: 20,
}

export const SETTINGS_KEYS = {
  categoryStartingPrices: 'category_starting_prices',
  loyaltyConfig: 'loyalty_config',
} as const
