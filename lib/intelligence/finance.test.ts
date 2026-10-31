import { describe, expect, it } from 'vitest'
import { rollUpOwnerFinance, splitOwnerEarnings } from './finance'

describe('finance intelligence', () => {
  it('rolls vehicle hire and costs into owner net', () => {
    const result = rollUpOwnerFinance({
      vehicles: [
        { billed: 10_000, collected: 8_000, expenses: 1_000 },
        { billed: 5_000, collected: 5_000, expenses: 500 },
      ],
      commissionType: 'PERCENTAGE',
      commissionValue: 30,
      recurringDeduction: 200,
    })
    expect(result.billed).toBe(15_000)
    expect(result.collected).toBe(13_000)
    expect(result.expenses).toBe(1_500)
    expect(result.commission).toBe(3_900)
    expect(result.deductions).toBe(200)
    expect(result.netPay).toBe(7_400)
  })

  it('splits paid hire into Doxa share and owner share', () => {
    const pct = splitOwnerEarnings({
      totalEarned: 60_000,
      commissionType: 'PERCENTAGE',
      commissionValue: 90,
    })
    expect(pct.doxaShare).toBe(54_000)
    expect(pct.ownerShare).toBe(6_000)

    const fixed = splitOwnerEarnings({
      totalEarned: 60_000,
      commissionType: 'FIXED',
      commissionValue: 50_000,
    })
    expect(fixed.doxaShare).toBe(50_000)
    expect(fixed.ownerShare).toBe(10_000)
  })
})
