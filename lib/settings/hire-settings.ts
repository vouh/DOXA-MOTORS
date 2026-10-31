import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_CATEGORY_STARTING_PRICES,
  DEFAULT_LOYALTY_CONFIG,
  SETTINGS_KEYS,
  VEHICLE_TYPES,
  type CategoryStartingPrices,
  type LoyaltyConfig,
} from '@/lib/loyalty/defaults'

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function parseLoyaltyConfig(raw: unknown): LoyaltyConfig {
  const o = asObject(raw)
  const category = { ...DEFAULT_LOYALTY_CONFIG.category }
  const catIn = asObject(o.category)
  for (const t of VEHICLE_TYPES) {
    const row = asObject(catIn[t])
    category[t] = {
      basePoints: Number(row.basePoints ?? category[t].basePoints) || 0,
      pointsPerDay: Number(row.pointsPerDay ?? category[t].pointsPerDay) || 0,
    }
  }
  const bonusRaw = Array.isArray(o.conditionBonusPoints)
    ? o.conditionBonusPoints.map((n) => Number(n) || 0)
    : [...DEFAULT_LOYALTY_CONFIG.conditionBonusPoints]
  while (bonusRaw.length < 5) bonusRaw.push(0)
  return {
    enabled: o.enabled !== false,
    kesPerPointEarn:
      Number(o.kesPerPointEarn ?? DEFAULT_LOYALTY_CONFIG.kesPerPointEarn) || 100,
    category,
    conditionBonusPoints: [
      bonusRaw[0],
      bonusRaw[1],
      bonusRaw[2],
      bonusRaw[3],
      bonusRaw[4],
    ],
    kesPerPointRedeem:
      Number(o.kesPerPointRedeem ?? DEFAULT_LOYALTY_CONFIG.kesPerPointRedeem) || 1,
    minPointsToRedeem:
      Number(o.minPointsToRedeem ?? DEFAULT_LOYALTY_CONFIG.minPointsToRedeem) || 0,
    maxDiscountPercentOfHire:
      Number(
        o.maxDiscountPercentOfHire ?? DEFAULT_LOYALTY_CONFIG.maxDiscountPercentOfHire,
      ) || 0,
  }
}

export function parseCategoryPrices(raw: unknown): CategoryStartingPrices {
  const o = asObject(raw)
  const out = { ...DEFAULT_CATEGORY_STARTING_PRICES }
  for (const t of VEHICLE_TYPES) {
    const n = Number(o[t])
    if (Number.isFinite(n) && n >= 0) out[t] = n
  }
  return out
}

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const row = await prisma.carHireSetting.findUnique({
    where: { key: SETTINGS_KEYS.loyaltyConfig },
  })
  return row ? parseLoyaltyConfig(row.value) : { ...DEFAULT_LOYALTY_CONFIG }
}

export async function getCategoryStartingPrices(): Promise<CategoryStartingPrices> {
  const row = await prisma.carHireSetting.findUnique({
    where: { key: SETTINGS_KEYS.categoryStartingPrices },
  })
  return row ? parseCategoryPrices(row.value) : { ...DEFAULT_CATEGORY_STARTING_PRICES }
}

export async function upsertSetting(
  key: string,
  value: Prisma.InputJsonValue,
  updatedBy?: string | null,
) {
  await prisma.carHireSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: updatedBy ?? null },
    update: { value, updatedBy: updatedBy ?? null },
  })
}
