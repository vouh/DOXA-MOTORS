export type PenaltyRuleInput = {
  graceMinutes: number
  rate: number
  rateUnit: 'HOUR' | 'DAY'
  cap?: number | null
}

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

export function hireDays(start: Date, end: Date): number {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error('The return time must be after the start time.')
  }
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS))
}

export function bookingCharge(start: Date, end: Date, dailyRate: number) {
  if (!Number.isFinite(dailyRate) || dailyRate < 0) throw new Error('Daily rate must be positive.')
  const days = hireDays(start, end)
  return { days, baseCharge: roundMoney(days * dailyRate) }
}

export function latenessPenalty(expected: Date, actual: Date, rule: PenaltyRuleInput) {
  const rawMinutes = Math.max(0, Math.ceil((actual.getTime() - expected.getTime()) / 60_000))
  const chargeableMinutes = Math.max(0, rawMinutes - Math.max(0, rule.graceMinutes))
  const unitMinutes = rule.rateUnit === 'HOUR' ? 60 : 1_440
  const units = chargeableMinutes === 0 ? 0 : Math.ceil(chargeableMinutes / unitMinutes)
  const uncapped = roundMoney(units * rule.rate)
  const amount = rule.cap == null ? uncapped : Math.min(uncapped, Math.max(0, rule.cap))
  return {
    minutesLate: rawMinutes,
    chargeableMinutes,
    units,
    amount: roundMoney(amount),
    notes: `${rawMinutes} minute(s) late; ${rule.graceMinutes} minute grace; ${units} ${rule.rateUnit.toLowerCase()} unit(s) × KES ${roundMoney(rule.rate)}${rule.cap == null ? '' : `; capped at KES ${roundMoney(rule.cap)}`}`,
  }
}

export function bookingBalance(totalCharge: number, completedPayments: number[]) {
  return roundMoney(Math.max(0, totalCharge - completedPayments.reduce((sum, value) => sum + value, 0)))
}

export function ownerSettlement(input: {
  bookingRevenue: number[]
  expenseAmounts: number[]
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  recurringDeduction?: number
}) {
  const grossEarnings = roundMoney(input.bookingRevenue.reduce((sum, value) => sum + value, 0))
  const totalExpenses = roundMoney(input.expenseAmounts.reduce((sum, value) => sum + value, 0))
  const commission = roundMoney(
    input.commissionType === 'PERCENTAGE'
      ? grossEarnings * Math.max(0, input.commissionValue) / 100
      : Math.max(0, input.commissionValue),
  )
  const deductions = roundMoney(Math.max(0, input.recurringDeduction ?? 0))
  const netPay = roundMoney(Math.max(0, grossEarnings - commission - totalExpenses - deductions))
  return { grossEarnings, commission, totalExpenses, deductions, netPay }
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
