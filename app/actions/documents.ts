'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { writeAudit } from '@/lib/audit'
import { actionFail } from '@/lib/errors'
import { ForbiddenError, hasPermission, requirePermission } from '@/lib/rbac/require'
import { requireActiveStaff } from '@/lib/auth/session'
import { PERMISSIONS } from '@/lib/rbac/registry'
import {
  CLIENT_ID_COPY,
  CLIENT_LICENCE_COPY,
  getClientIdentityDocsStatus,
  isClientIdentityCategory,
  listClientIdentityDocs,
  type ClientDocListItem,
  type ClientIdentityDocsStatus,
} from '@/lib/documents/client-required'
import {
  createSignedDownloadUrl,
  deletePrivateObject,
  uploadPrivateObject,
} from '@/lib/storage/upload'
import { compressDocumentBytes } from '@/lib/storage/compress'
import {
  ALLOWED_EXT,
  ALLOWED_MIME,
  DOCS_BUCKET,
  FILE_TYPES_HINT,
  MAX_FILE_BYTES,
} from '@/lib/storage/limits'
import { encodeDocumentKind } from '@/lib/documents/meta'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

const BUCKET = DOCS_BUCKET
const GENERAL_ENTITY_ID = 'library'

const ENTITY_TYPES = new Set(['GENERAL', 'CLIENT', 'VEHICLE', 'OWNER'])

function fail(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message }
  const msg = error instanceof Error ? error.message : ''
  if (/bucket not found|document storage/i.test(msg)) {
    return {
      ok: false,
      message:
        msg.includes('Document storage') || msg.includes('Could not create')
          ? msg
          : 'Document storage is not set up. Create a private Supabase bucket named car-hire-docs (or run supabase/storage.sql).',
    }
  }
  return actionFail(error)
}

function refresh(scope: 'full' | 'client' = 'full') {
  revalidatePath('/admin/documents')
  revalidatePath('/admin/clients')
  // Full layout refresh is expensive — skip it for wizard ID/licence uploads.
  if (scope === 'full') {
    revalidatePath('/admin/bookings')
    revalidatePath('/admin', 'layout')
  }
}

function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'document'
}

async function authorizeDocumentUpload(
  profile: Awaited<ReturnType<typeof requireActiveStaff>>,
  entityType: string,
  category: string,
) {
  if (profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.DOC_UPLOAD))) {
    return
  }
  // client:upload alone may only attach ID / licence copies to a client.
  if (
    (await hasPermission(profile, PERMISSIONS.CLIENT_UPLOAD)) &&
    entityType === 'CLIENT' &&
    isClientIdentityCategory(category)
  ) {
    return
  }
  throw new ForbiddenError(`Missing permission: ${PERMISSIONS.DOC_UPLOAD}`)
}

export async function uploadRepositoryDocument(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActiveStaff()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: `Choose a ${FILE_TYPES_HINT} file.` }
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, message: 'File must be 5 MB or smaller.' }
    }

    const ext = extOf(file.name)
    if (!ALLOWED_EXT.has(ext)) {
      return {
        ok: false,
        message: `Allowed types: ${FILE_TYPES_HINT}.`,
      }
    }
    const mime = (file.type || '').toLowerCase()
    if (mime && !ALLOWED_MIME.has(mime) && mime !== 'application/octet-stream') {
      return { ok: false, message: 'That file type is not allowed.' }
    }

    const entityType = String(formData.get('entityType') || 'GENERAL').trim().toUpperCase()
    if (!ENTITY_TYPES.has(entityType)) {
      return { ok: false, message: 'Link the document to General, Client, Vehicle, or Owner.' }
    }

    const category = String(formData.get('kind') || 'OTHER').trim().slice(0, 40) || 'OTHER'
    await authorizeDocumentUpload(profile, entityType, category)

    let entityId = String(formData.get('entityId') || '').trim()
    if (entityType === 'GENERAL') {
      entityId = GENERAL_ENTITY_ID
    } else if (!entityId) {
      return { ok: false, message: 'Select the client, vehicle, or owner to link.' }
    } else if (entityType === 'CLIENT') {
      await prisma.carClient.findUniqueOrThrow({ where: { id: entityId } })
    } else if (entityType === 'VEHICLE') {
      await prisma.carVehicle.findUniqueOrThrow({ where: { id: entityId } })
    } else if (entityType === 'OWNER') {
      await prisma.carOwner.findUniqueOrThrow({ where: { id: entityId } })
    }

    const title = String(formData.get('title') || '').trim().slice(0, 120) || null
    const notes = String(formData.get('notes') || '').trim().slice(0, 500) || null
    const originalName = file.name.slice(0, 200)
    const safe = sanitizeFileName(originalName)
    const path = `repository/${entityType.toLowerCase()}/${entityId}/${Date.now()}-${safe}`

    const raw = Buffer.from(await file.arrayBuffer())
    const contentType = mime || (ext === 'csv' ? 'text/csv' : 'application/octet-stream')
    const packed = await compressDocumentBytes({
      bytes: raw,
      contentType,
      ext,
    })
    const uploaded = await uploadPrivateObject({
      bytes: packed.bytes,
      path,
      contentType: packed.contentType,
      bucket: BUCKET,
    })

    const kind = encodeDocumentKind({
      category,
      title,
      notes,
      originalName,
      fileSize: packed.storedBytes,
    })

    const row = await prisma.attachment.create({
      data: {
        entityType,
        entityId,
        kind,
        bucket: uploaded.bucket,
        path: uploaded.path,
        mimeType: packed.contentType,
        uploadedBy: profile.id,
      },
    })

    await writeAudit({
      userId: profile.id,
      action: 'document.upload',
      entity: 'Attachment',
      entityId: row.id,
      meta: {
        entityType,
        entityId,
        originalName,
        bucket: uploaded.bucket,
        originalBytes: packed.originalBytes,
        storedBytes: packed.storedBytes,
        compress: packed.method,
      },
    })

    const lightRefresh = String(formData.get('_refreshScope') || '') === 'client'
    refresh(lightRefresh ? 'client' : 'full')
    const shrink =
      packed.compressed && packed.originalBytes > 0
        ? ` Compressed ${Math.round((1 - packed.storedBytes / packed.originalBytes) * 100)}%.`
        : ''
    return { ok: true, message: `Document saved.${shrink}` }
  } catch (error) {
    return fail(error)
  }
}

/** Upload ID or licence copy onto a client (Scope 2.1). */
export async function uploadClientIdentityDocument(formData: FormData): Promise<ActionResult> {
  const kind = String(formData.get('kind') || '').trim().toUpperCase()
  if (kind !== CLIENT_ID_COPY && kind !== CLIENT_LICENCE_COPY) {
    return { ok: false, message: 'Choose ID copy or licence copy.' }
  }
  const entityId = String(formData.get('entityId') || '').trim()
  if (!entityId) return { ok: false, message: 'Client is required.' }
  formData.set('entityType', 'CLIENT')
  formData.set('entityId', entityId)
  formData.set('kind', kind)
  formData.set('_refreshScope', 'client')
  if (!String(formData.get('title') || '').trim()) {
    formData.set('title', kind === CLIENT_ID_COPY ? 'National ID / passport copy' : 'Driving licence copy')
  }
  return uploadRepositoryDocument(formData)
}

export async function getClientIdentityDocs(
  clientId: string,
): Promise<
  | { ok: true; status: ClientIdentityDocsStatus; docs: ClientDocListItem[] }
  | { ok: false; message: string }
> {
  try {
    const profile = await requireActiveStaff()
    const canView =
      profile.isSuperAdmin ||
      (await hasPermission(profile, PERMISSIONS.CLIENT_VIEW)) ||
      (await hasPermission(profile, PERMISSIONS.DOC_VIEW))
    if (!canView) throw new ForbiddenError(`Missing permission: ${PERMISSIONS.CLIENT_VIEW}`)
    const id = String(clientId || '').trim()
    if (!id) return { ok: false, message: 'Client id is required.' }
    await prisma.carClient.findUniqueOrThrow({ where: { id } })
    const [status, docs] = await Promise.all([
      getClientIdentityDocsStatus(id),
      listClientIdentityDocs(id),
    ])
    return { ok: true, status, docs }
  } catch (error) {
    return fail(error) as { ok: false; message: string }
  }
}

export async function getDocumentDownloadUrl(
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  try {
    await requirePermission(PERMISSIONS.DOC_VIEW)
    const row = await prisma.attachment.findUniqueOrThrow({ where: { id } })
    const url = await createSignedDownloadUrl(row.bucket, row.path, 600)
    return { ok: true, url }
  } catch (error) {
    return fail(error) as { ok: false; message: string }
  }
}

export async function deleteRepositoryDocument(id: string): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.DOC_DELETE)
    const docId = String(id || '').trim()
    if (!docId) return { ok: false, message: 'Document id is missing.' }

    const row = await prisma.attachment.findUnique({ where: { id: docId } })
    if (!row) return { ok: false, message: 'That document was already removed.' }

    try {
      await deletePrivateObject(row.bucket, row.path)
    } catch (err) {
      console.error('[documents] storage delete failed', err)
      // Still remove the DB row so the list stays accurate.
    }

    await prisma.attachment.delete({ where: { id: docId } })
    await writeAudit({
      userId: profile.id,
      action: 'document.delete',
      entity: 'Attachment',
      entityId: docId,
      meta: { path: row.path, bucket: row.bucket },
    }).catch((err) => {
      console.error('[documents] audit failed after delete', err)
    })

    refresh()
    return { ok: true, message: 'Document deleted.' }
  } catch (error) {
    return fail(error)
  }
}
