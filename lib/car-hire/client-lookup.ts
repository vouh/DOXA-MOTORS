import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Slim select for search — enough for result rows + ClientViewButton. */
const clientLookupSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  idOrPassportNo: true,
  licenceNo: true,
  licenceExpiry: true,
  physicalAddress: true,
  nextOfKin: true,
  employer: true,
  secondContact: true,
  notes: true,
  status: true,
} satisfies Prisma.CarClientSelect

export type ClientLookupRecord = Prisma.CarClientGetPayload<{ select: typeof clientLookupSelect }> & {
  _count?: { bookings: number }
}

/** KE phone variants: 07… ↔ 254… ↔ bare 9-digit. */
export function phoneVariants(digits: string): string[] {
  const out = new Set<string>()
  if (!digits) return []
  out.add(digits)
  if (digits.startsWith('254') && digits.length >= 12) {
    out.add(`0${digits.slice(3)}`)
    out.add(digits.slice(3))
  } else if (digits.startsWith('0') && digits.length >= 10) {
    out.add(`254${digits.slice(1)}`)
    out.add(digits.slice(1))
  } else if (digits.length === 9) {
    out.add(`0${digits}`)
    out.add(`254${digits}`)
  }
  return [...out]
}

type LookupKind = 'phone' | 'id' | 'name'

function classifyQuery(raw: string): { kind: LookupKind; digits: string; alnum: string; name: string } {
  const name = raw.trim()
  const digits = name.replace(/\D/g, '').slice(0, 15)
  const alnum = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 20)
  const compact = name.replace(/\s+/g, '')
  const digitRatio = compact.length ? digits.length / compact.length : 0

  const looksLikePhone =
    (digits.startsWith('0') && digits.length >= 9 && digits.length <= 12) ||
    (digits.startsWith('254') && digits.length >= 12) ||
    (digits.length === 9 && digitRatio >= 0.9 && !name.includes(' '))

  if (looksLikePhone) {
    return { kind: 'phone', digits, alnum, name }
  }

  if (
    /^\d{4,10}$/.test(alnum) ||
    (alnum.length >= 4 && digitRatio >= 0.6 && !/[a-zA-Z]{3,}/.test(name))
  ) {
    return { kind: 'id', digits, alnum, name }
  }

  return { kind: 'name', digits, alnum, name }
}

/**
 * Fast indexed lookup — phone exact; ID/licence exact then prefix; name prefix then contains.
 * Supports name, phone, National ID, and driving licence.
 */
export async function findClientsByLookupQuery(query: string, take = 12): Promise<ClientLookupRecord[]> {
  const raw = query.trim()
  if (raw.length < 2) return []

  const { kind, digits, alnum, name } = classifyQuery(raw)

  if (kind === 'phone') {
    const phones = phoneVariants(digits)
    const hits = await Promise.all(
      phones.map((phone) =>
        prisma.carClient.findUnique({
          where: { phone },
          select: clientLookupSelect,
        }),
      ),
    )
    const found = hits.filter(Boolean) as ClientLookupRecord[]
    if (found.length) {
      const seen = new Set<string>()
      return found.filter((row) => {
        if (seen.has(row.id)) return false
        seen.add(row.id)
        return true
      }).slice(0, take)
    }
    return []
  }

  if (kind === 'id') {
    const [byId, byLicence] = await Promise.all([
      prisma.carClient.findUnique({
        where: { idOrPassportNo: alnum },
        select: clientLookupSelect,
      }),
      prisma.carClient.findFirst({
        where: { licenceNo: alnum },
        select: clientLookupSelect,
      }),
    ])
    const exact: ClientLookupRecord[] = []
    if (byId) exact.push(byId)
    if (byLicence && byLicence.id !== byId?.id) exact.push(byLicence)
    if (exact.length) return exact.slice(0, take)

    return prisma.carClient.findMany({
      where: {
        OR: [
          { idOrPassportNo: { startsWith: alnum } },
          { licenceNo: { startsWith: alnum } },
        ],
      },
      select: clientLookupSelect,
      take,
      orderBy: { fullName: 'asc' },
    })
  }

  // Name (and mixed text): prefix first
  const byPrefix = await prisma.carClient.findMany({
    where: { fullName: { startsWith: name, mode: 'insensitive' } },
    select: clientLookupSelect,
    take,
    orderBy: { fullName: 'asc' },
  })
  if (byPrefix.length) return byPrefix

  return prisma.carClient.findMany({
    where: {
      OR: [
        { fullName: { contains: name, mode: 'insensitive' } },
        ...(alnum.length >= 3
          ? [
              { licenceNo: { startsWith: alnum } },
              { idOrPassportNo: { startsWith: alnum } },
            ]
          : []),
      ],
    },
    select: clientLookupSelect,
    take,
    orderBy: { fullName: 'asc' },
  })
}

/** @deprecated Prefer findClientsByLookupQuery */
export function buildClientLookupWhere(rawQuery: string): Prisma.CarClientWhereInput | undefined {
  const raw = rawQuery.trim()
  if (!raw) return undefined
  const { kind, digits, alnum, name } = classifyQuery(raw)
  if (kind === 'phone') {
    return { phone: { in: phoneVariants(digits) } }
  }
  if (kind === 'id') {
    return {
      OR: [
        { idOrPassportNo: { equals: alnum } },
        { idOrPassportNo: { startsWith: alnum } },
        { licenceNo: { equals: alnum } },
        { licenceNo: { startsWith: alnum } },
      ],
    }
  }
  return {
    OR: [
      { fullName: { startsWith: name, mode: 'insensitive' } },
      { fullName: { contains: name, mode: 'insensitive' } },
      ...(alnum.length >= 3
        ? [{ licenceNo: { startsWith: alnum } }, { idOrPassportNo: { startsWith: alnum } }]
        : []),
    ],
  }
}
