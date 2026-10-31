import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { phoneVariants } from '@/lib/car-hire/client-lookup'

export type ClientIdentityInput = {
  phone?: string | null
  idOrPassportNo?: string | null
  email?: string | null
  /** When editing, ignore this client row. */
  excludeId?: string
}

function statusLabel(status: string) {
  return status === 'SUSPENDED' ? 'Suspended' : 'Active'
}

/**
 * Phone, National ID/passport, and email must be unique across all clients
 * (including suspended). Licence is intentionally not unique.
 * Empty fields are skipped. Returns a staff-facing error message, or null if clear.
 *
 * Uses one indexed OR query (not three round-trips) so wizard Continue stays snappy.
 */
export async function clientIdentityConflictMessage(
  input: ClientIdentityInput,
): Promise<string | null> {
  const phoneDigits = String(input.phone ?? '').replace(/\D/g, '')
  const phones = phoneDigits.length >= 9 ? phoneVariants(phoneDigits) : []
  const idNorm = String(input.idOrPassportNo ?? '').replace(/[^A-Za-z0-9]/g, '')
  const emailNorm = input.email?.trim().toLowerCase() || null

  if (!phones.length && !idNorm && !emailNorm) return null

  const or: Prisma.CarClientWhereInput[] = []
  if (phones.length) or.push({ phone: { in: phones } })
  if (idNorm.length >= 4) or.push({ idOrPassportNo: idNorm })
  if (emailNorm) or.push({ email: emailNorm })
  if (!or.length) return null

  const where: Prisma.CarClientWhereInput = {
    OR: or,
    ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
  }

  const hits = await prisma.carClient.findMany({
    where,
    select: {
      fullName: true,
      status: true,
      phone: true,
      idOrPassportNo: true,
      email: true,
    },
    take: 6,
  })

  if (!hits.length) return null

  const phoneSet = new Set(phones)
  const byPhone = phones.length
    ? hits.find((h) => {
        const stored = String(h.phone || '')
        const storedDigits = stored.replace(/\D/g, '')
        return (
          phoneSet.has(stored) ||
          phoneSet.has(storedDigits) ||
          phoneVariants(storedDigits).some((v) => phoneSet.has(v))
        )
      })
    : undefined

  const byId =
    idNorm.length >= 4
      ? hits.find(
          (h) => String(h.idOrPassportNo || '').replace(/[^A-Za-z0-9]/g, '') === idNorm,
        )
      : undefined
  const byEmail = emailNorm
    ? hits.find((h) => (h.email || '').trim().toLowerCase() === emailNorm)
    : undefined

  const parts: string[] = []

  if (byPhone) {
    parts.push(
      `Phone number already exists for ${byPhone.fullName} (${statusLabel(byPhone.status)}).`,
    )
  }
  if (byId) {
    parts.push(
      `National ID already exists for ${byId.fullName} (${statusLabel(byId.status)}).`,
    )
  }
  if (byEmail) {
    parts.push(
      `Email address already exists for ${byEmail.fullName} (${statusLabel(byEmail.status)}).`,
    )
  }

  // Fallback if OR matched but field matching failed (unusual formatting)
  if (!parts.length && hits[0]) {
    parts.push(
      `A client with these details already exists (${hits[0].fullName}, ${statusLabel(hits[0].status)}).`,
    )
  }

  if (!parts.length) return null

  const suspendedHint =
    byPhone?.status === 'SUSPENDED' ||
    byId?.status === 'SUSPENDED' ||
    byEmail?.status === 'SUSPENDED'
      ? ' Suspended clients cannot be re-registered — reactivate the existing record instead of adding a duplicate.'
      : ' This client already exists — open their profile instead of creating another account.'

  return `${parts.join(' ')}${suspendedHint}`
}

/** Map Prisma unique constraint failures to plain-English field messages. */
export function uniqueConstraintMessage(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    const target = (error as { meta?: { target?: string | string[] } }).meta?.target
    const fields = Array.isArray(target) ? target : target ? [target] : []
    const joined = fields.join(',').toLowerCase()
    if (joined.includes('phone')) return 'This phone number already exists in the system.'
    if (joined.includes('idorpassport') || joined.includes('id_or_passport')) {
      return 'This National ID already exists in the system.'
    }
    if (joined.includes('email')) return 'This email address already exists in the system.'
    if (joined.includes('regnumber') || joined.includes('reg_number')) {
      return 'This registration plate already exists on another vehicle.'
    }
    return 'A record with these details already exists in the system.'
  }
  return null
}
