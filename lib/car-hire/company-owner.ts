import { prisma } from '@/lib/prisma'

/** Stable key so company fleet ownership can be selected on every vehicle form. */
export const DOXA_COMPANY_OWNER_NATIONAL_ID = 'DOXA-COMPANY'

export const DOXA_COMPANY_OWNER_NAME = 'Doxa'

/**
 * Ensures the in-house “Doxa” owner exists for company-owned vehicles.
 * Safe to call on every vehicles page load (upsert by national ID).
 */
export async function ensureDoxaCompanyOwner() {
  return prisma.carOwner.upsert({
    where: { nationalId: DOXA_COMPANY_OWNER_NATIONAL_ID },
    create: {
      fullName: DOXA_COMPANY_OWNER_NAME,
      phone: '0700000000',
      email: null,
      nationalId: DOXA_COMPANY_OWNER_NATIONAL_ID,
      commissionType: 'PERCENTAGE',
      commissionValue: 0,
      recurringDeduction: 0,
      active: true,
    },
    update: {
      fullName: DOXA_COMPANY_OWNER_NAME,
      active: true,
    },
    select: { id: true, fullName: true, nationalId: true },
  })
}

export function isDoxaCompanyOwner(owner: { nationalId?: string | null; fullName?: string | null }) {
  return (
    owner.nationalId === DOXA_COMPANY_OWNER_NATIONAL_ID ||
    owner.fullName?.trim().toLowerCase() === DOXA_COMPANY_OWNER_NAME.toLowerCase()
  )
}

/** Put Doxa first in owner pickers; label company fleet clearly. */
export function formatOwnerOptionLabel(owner: { fullName: string; nationalId?: string | null }) {
  if (isDoxaCompanyOwner(owner)) return 'Doxa (company owned)'
  return owner.fullName
}

export function sortOwnersForPicker<T extends { fullName: string; nationalId?: string | null }>(
  owners: T[],
): T[] {
  return [...owners].sort((a, b) => {
    const aDoxa = isDoxaCompanyOwner(a) ? 0 : 1
    const bDoxa = isDoxaCompanyOwner(b) ? 0 : 1
    if (aDoxa !== bDoxa) return aDoxa - bDoxa
    return a.fullName.localeCompare(b.fullName)
  })
}
