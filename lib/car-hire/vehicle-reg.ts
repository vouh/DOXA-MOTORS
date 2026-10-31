import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Canonical plate for uniqueness: KDA 665Z / kda665z → KDA665Z */
export function normalizeRegKey(regNumber: string) {
  return String(regNumber || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Display form: uppercase, single spaces, max 12. */
export function formatRegNumber(regNumber: string) {
  return String(regNumber || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, 12)
}

/**
 * Find an existing vehicle with the same plate (ignores spaces/punctuation/case).
 */
export async function findVehicleByRegNumber(
  regNumber: string,
  excludeId?: string,
): Promise<{ id: string; regNumber: string; make: string; model: string } | null> {
  const key = normalizeRegKey(regNumber)
  if (key.length < 5) return null

  const rows = excludeId
    ? await prisma.$queryRaw<
        Array<{ id: string; regNumber: string; make: string; model: string }>
      >(Prisma.sql`
        SELECT id, "regNumber", make, model
        FROM car_vehicles
        WHERE regexp_replace(upper("regNumber"), '[^A-Z0-9]', '', 'g') = ${key}
          AND id <> ${excludeId}
        LIMIT 1
      `)
    : await prisma.$queryRaw<
        Array<{ id: string; regNumber: string; make: string; model: string }>
      >(Prisma.sql`
        SELECT id, "regNumber", make, model
        FROM car_vehicles
        WHERE regexp_replace(upper("regNumber"), '[^A-Z0-9]', '', 'g') = ${key}
        LIMIT 1
      `)

  return rows[0] ?? null
}

export function vehicleRegConflictMessage(existing: {
  regNumber: string
  make: string
  model: string
}) {
  return `Registration ${existing.regNumber} already exists (${existing.make} ${existing.model}). Use a different plate.`
}
