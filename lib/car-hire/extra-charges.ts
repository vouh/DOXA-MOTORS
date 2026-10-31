import { extraChargesTotal, roundMoney } from './calculations'
import { EXTRA_DESC_MAX, EXTRA_MAX_ROWS, sanitizeComment } from './input-rules'

export type ExtraChargeInput = {
  description: string
  amount: number
}

export function parseExtraCharges(formData: FormData): ExtraChargeInput[] {
  const descriptions = formData.getAll('extraDescription')
  const amounts = formData.getAll('extraAmount')
  const n = Math.max(descriptions.length, amounts.length)
  if (n > EXTRA_MAX_ROWS) {
    throw new Error(`You can add at most ${EXTRA_MAX_ROWS} extra costs.`)
  }

  const rows: ExtraChargeInput[] = []
  for (let i = 0; i < n; i += 1) {
    const description = sanitizeComment(descriptions[i], EXTRA_DESC_MAX)
    const amountRaw = String(amounts[i] ?? '').trim()
    if (!description && !amountRaw) continue
    const amount = Number(amountRaw)
    if (!description) {
      throw new Error('Each extra cost needs a short description.')
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      throw new Error('Each extra cost needs an amount greater than 0.')
    }
    rows.push({ description, amount: roundMoney(amount) })
  }
  return rows
}

export function extraChargesSum(rows: ExtraChargeInput[]) {
  return extraChargesTotal(rows.map((row) => row.amount))
}
