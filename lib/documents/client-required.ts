import { prisma } from '@/lib/prisma'
import { parseDocumentKind } from '@/lib/documents/meta'

export const CLIENT_ID_COPY = 'ID_COPY'
export const CLIENT_LICENCE_COPY = 'LICENCE'

const IDENTITY_CATEGORIES = new Set([
  CLIENT_ID_COPY,
  CLIENT_LICENCE_COPY,
  'ID',
  'PASSPORT',
  'DRIVING_LICENCE',
  'LICENSE',
])

/** True for ID / passport / driving-licence attachment categories. */
export function isClientIdentityCategory(category: string): boolean {
  return IDENTITY_CATEGORIES.has(category.trim().toUpperCase())
}

export type ClientIdentityDocsStatus = {
  hasIdNumber: boolean
  hasLicenceNumber: boolean
  hasIdCopy: boolean
  hasLicenceCopy: boolean
  complete: boolean
  missing: string[]
}

/** Identity is complete when ID + licence numbers are on the client record. */
export async function getClientIdentityDocsStatus(
  clientId: string,
): Promise<ClientIdentityDocsStatus> {
  const [client, rows] = await Promise.all([
    prisma.carClient.findUnique({
      where: { id: clientId },
      select: { idOrPassportNo: true, licenceNo: true },
    }),
    prisma.attachment.findMany({
      where: { entityType: 'CLIENT', entityId: clientId },
      select: { id: true, kind: true },
    }),
  ])

  const hasIdNumber = Boolean(client?.idOrPassportNo?.trim())
  const hasLicenceNumber = Boolean(client?.licenceNo?.trim())

  let hasIdCopy = false
  let hasLicenceCopy = false
  for (const row of rows) {
    const category = parseDocumentKind(row.kind).category.toUpperCase()
    if (category === CLIENT_ID_COPY || category === 'ID' || category === 'PASSPORT') {
      hasIdCopy = true
    }
    if (category === CLIENT_LICENCE_COPY || category === 'DRIVING_LICENCE' || category === 'LICENSE') {
      hasLicenceCopy = true
    }
  }

  const missing: string[] = []
  if (!hasIdNumber) missing.push('National ID / passport number')
  if (!hasLicenceNumber) missing.push('driving licence number')

  return {
    hasIdNumber,
    hasLicenceNumber,
    hasIdCopy,
    hasLicenceCopy,
    complete: hasIdNumber && hasLicenceNumber,
    missing,
  }
}

/** Throws if ID or licence number is missing (block hire create / dispatch). */
export async function assertClientHasIdentityDocs(clientId: string): Promise<void> {
  const status = await getClientIdentityDocsStatus(clientId)
  if (status.complete) return
  throw new Error(
    `Add ${status.missing.join(' and ')} on the client profile before booking or dispatch.`,
  )
}

export type ClientDocListItem = {
  id: string
  category: string
  title: string | null
  originalName: string
  uploadedAt: string
}

export async function listClientIdentityDocs(clientId: string): Promise<ClientDocListItem[]> {
  const rows = await prisma.attachment.findMany({
    where: { entityType: 'CLIENT', entityId: clientId },
    orderBy: { uploadedAt: 'desc' },
    take: 40,
  })
  return rows
    .map((row) => {
      const meta = parseDocumentKind(row.kind)
      const category = meta.category.toUpperCase()
      if (!isClientIdentityCategory(category)) {
        return null
      }
      return {
        id: row.id,
        category:
          category === CLIENT_LICENCE_COPY || category === 'DRIVING_LICENCE' || category === 'LICENSE'
            ? CLIENT_LICENCE_COPY
            : CLIENT_ID_COPY,
        title: meta.title,
        originalName: meta.originalName,
        uploadedAt: row.uploadedAt.toISOString(),
      }
    })
    .filter((row): row is ClientDocListItem => row !== null)
}
