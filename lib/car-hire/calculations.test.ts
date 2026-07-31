import { describe, expect, it } from 'vitest'
import { bookingBalance, bookingCharge, latenessPenalty, ownerSettlement } from './calculations'

describe('car-hire calculations', () => {
  it('computes hire days and base charge', () => {
    expect(
      bookingCharge(new Date('2026-07-01T08:00:00Z'), new Date('2026-07-03T08:00:00Z'), 2500),
    ).toEqual({ days: 2, baseCharge: 5000 })
  })

  it('applies lateness penalty with grace and units', () => {
    const penalty = latenessPenalty(
      new Date('2026-07-03T08:00:00Z'),
      new Date('2026-07-03T10:31:00Z'),
      { graceMinutes: 30, rate: 500, rateUnit: 'HOUR', cap: 2000 },
    )
    expect(penalty.units).toBe(3)
    expect(penalty.amount).toBe(1500)
  })

  it('computes outstanding balance', () => {
    expect(bookingBalance(6500, [3000, 1000])).toBe(2500)
  })

  it('settles owner percentage commission', () => {
    expect(
      ownerSettlement({
        bookingRevenue: [10_000, 5_000],
        expenseAmounts: [1_500],
        commissionType: 'PERCENTAGE',
        commissionValue: 20,
        recurringDeduction: 500,
      }),
    ).toEqual({
      grossEarnings: 15_000,
      commission: 3_000,
      totalExpenses: 1_500,
      deductions: 500,
      netPay: 10_000,
    })
  })
})
