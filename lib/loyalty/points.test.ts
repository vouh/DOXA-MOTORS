import { describe, expect, it } from 'vitest'
import { calculateLoyaltyPoints, discountKesFromPoints } from '@/lib/loyalty/points'
import { DEFAULT_LOYALTY_CONFIG } from '@/lib/loyalty/defaults'

describe('calculateLoyaltyPoints', () => {
  it('sums category base, days, amount, and rating bonus', () => {
    // SALOON: 8 + 12*3 + floor(15000/100) + bonus[5]=20 = 8+36+150+20 = 214
    const pts = calculateLoyaltyPoints({
      vehicleType: 'SALOON',
      hireDays: 3,
      hireAmountKes: 15_000,
      conditionRating: 5,
    })
    expect(pts).toBe(214)
  })

  it('returns 0 when loyalty disabled', () => {
    const pts = calculateLoyaltyPoints(
      {
        vehicleType: 'ECONOMY',
        hireDays: 2,
        hireAmountKes: 5000,
        conditionRating: 5,
      },
      { ...DEFAULT_LOYALTY_CONFIG, enabled: false },
    )
    expect(pts).toBe(0)
  })
})

describe('discountKesFromPoints', () => {
  it('caps discount by max percent of hire', () => {
    const r = discountKesFromPoints(10_000, 10_000, DEFAULT_LOYALTY_CONFIG)
    // 20% of 10000 = 2000
    expect(r.discountKes).toBe(2000)
  })
})
