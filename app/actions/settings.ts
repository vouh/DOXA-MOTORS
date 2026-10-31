'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { actionFail } from '@/lib/errors'
import { ForbiddenError, requirePermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import {
  SETTINGS_KEYS,
  VEHICLE_TYPES,
} from '@/lib/loyalty/defaults'
import {
  getCategoryStartingPrices,
  getLoyaltyConfig,
  parseCategoryPrices,
  parseLoyaltyConfig,
  upsertSetting,
} from '@/lib/settings/hire-settings'
import { calculateLoyaltyPoints } from '@/lib/loyalty/points'
import { tryAwardLoyaltyForBooking } from '@/lib/loyalty/award'
import type { VehicleType } from '@prisma/client'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function fail(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message }
  if (error instanceof ZodError) {
    return { ok: false, message: error.issues[0]?.message || 'Invalid settings.' }
  }
  return actionFail(error)
}

function refresh() {
  revalidatePath('/admin', 'layout')
}

export async function loadHireSettingsAction() {
  await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  const [loyalty, prices] = await Promise.all([
    getLoyaltyConfig(),
    getCategoryStartingPrices(),
  ])
  return { loyalty, prices }
}

export async function saveCategoryPricesAction(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
    const raw: Record<string, number> = {}
    for (const t of VEHICLE_TYPES) {
      raw[t] = Number(formData.get(t) || 0)
    }
    const prices = parseCategoryPrices(raw)
    await upsertSetting(SETTINGS_KEYS.categoryStartingPrices, prices, profile.id)
    refresh()
    return { ok: true, message: 'Category starting prices saved.' }
  } catch (error) {
    return fail(error)
  }
}

export async function saveLoyaltyConfigAction(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
    const category: Record<string, { basePoints: number; pointsPerDay: number }> = {}
    for (const t of VEHICLE_TYPES) {
      category[t] = {
        basePoints: Number(formData.get(`${t}_base`) || 0),
        pointsPerDay: Number(formData.get(`${t}_day`) || 0),
      }
    }
    const bonus = [1, 2, 3, 4, 5].map((r) => Number(formData.get(`bonus_${r}`) || 0))
    const raw = {
      enabled: formData.get('enabled') === 'on' || formData.get('enabled') === 'true',
      kesPerPointEarn: Number(formData.get('kesPerPointEarn') || 100),
      category,
      conditionBonusPoints: bonus,
      kesPerPointRedeem: Number(formData.get('kesPerPointRedeem') || 1),
      minPointsToRedeem: Number(formData.get('minPointsToRedeem') || 50),
      maxDiscountPercentOfHire: Number(formData.get('maxDiscountPercentOfHire') || 20),
    }
    const config = parseLoyaltyConfig(raw)
    await upsertSetting(SETTINGS_KEYS.loyaltyConfig, config, profile.id)
    refresh()
    return { ok: true, message: 'Loyalty metrics saved.' }
  } catch (error) {
    return fail(error)
  }
}

const previewSchema = z.object({
  vehicleType: z.enum(['ECONOMY', 'SALOON', 'PICKUP', 'VAN_MINIBUS', 'SUV_4X4']),
  hireDays: z.coerce.number().int().positive(),
  hireAmountKes: z.coerce.number().nonnegative(),
  conditionRating: z.coerce.number().int().min(1).max(5),
})

export async function previewLoyaltyPointsAction(formData: FormData): Promise<
  ActionResult & { points?: number }
> {
  try {
    await requirePermission(PERMISSIONS.SETTINGS_VIEW)
    const data = previewSchema.parse({
      vehicleType: formData.get('vehicleType'),
      hireDays: formData.get('hireDays'),
      hireAmountKes: formData.get('hireAmountKes'),
      conditionRating: formData.get('conditionRating'),
    })
    const config = await getLoyaltyConfig()
    const points = calculateLoyaltyPoints(
      {
        vehicleType: data.vehicleType as VehicleType,
        hireDays: data.hireDays,
        hireAmountKes: data.hireAmountKes,
        conditionRating: data.conditionRating,
      },
      config,
    )
    return { ok: true, message: `${points} points`, points }
  } catch (error) {
    return fail(error)
  }
}

export async function recalculateBookingLoyaltyAction(
  bookingId: string,
): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
    const result = await tryAwardLoyaltyForBooking(bookingId, {
      createdBy: profile.id,
      forceRecalc: true,
    })
    if (result.pendingReason && result.awarded === 0) {
      return { ok: false, message: result.pendingReason }
    }
    refresh()
    return {
      ok: true,
      message: `Loyalty recalculated: ${result.awarded} points.`,
    }
  } catch (error) {
    return fail(error)
  }
}

/** Recalculate earn rows for all returned, paid bookings for one client. */
export async function recalculateClientLoyaltyAction(
  clientId: string,
): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
    const { prisma } = await import('@/lib/prisma')
    const bookings = await prisma.carBooking.findMany({
      where: { clientId, status: 'RETURNED' },
      select: { id: true },
    })
    let awarded = 0
    let skipped = 0
    for (const b of bookings) {
      const result = await tryAwardLoyaltyForBooking(b.id, {
        createdBy: profile.id,
        forceRecalc: true,
      })
      if (result.pendingReason && result.awarded === 0) skipped += 1
      else awarded += result.awarded
    }
    refresh()
    return {
      ok: true,
      message: `Recalculated ${bookings.length} hire(s). Latest earn total touch: ${awarded} pts${skipped ? ` (${skipped} skipped — unpaid or missing rating)` : ''}.`,
    }
  } catch (error) {
    return fail(error)
  }
}
