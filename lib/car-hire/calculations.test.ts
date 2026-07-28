import { strict as assert } from 'node:assert'
import { bookingBalance, bookingCharge, latenessPenalty, ownerSettlement } from './calculations'

const charge = bookingCharge(new Date('2026-07-01T08:00:00Z'), new Date('2026-07-03T08:00:00Z'), 2500)
assert.deepEqual(charge, { days: 2, baseCharge: 5000 })

const penalty = latenessPenalty(
  new Date('2026-07-03T08:00:00Z'),
  new Date('2026-07-03T10:31:00Z'),
  { graceMinutes: 30, rate: 500, rateUnit: 'HOUR', cap: 2000 },
)
assert.equal(penalty.units, 3)
assert.equal(penalty.amount, 1500)
assert.equal(bookingBalance(6500, [3000, 1000]), 2500)

assert.deepEqual(ownerSettlement({
  bookingRevenue: [10_000, 5_000],
  expenseAmounts: [1_500],
  commissionType: 'PERCENTAGE',
  commissionValue: 20,
  recurringDeduction: 500,
}), {
  grossEarnings: 15_000,
  commission: 3_000,
  totalExpenses: 1_500,
  deductions: 500,
  netPay: 10_000,
})

console.log('car-hire calculations: ok')
