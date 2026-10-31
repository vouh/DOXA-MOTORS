import { createServerClient } from '@/lib/supabase-server'
import {
  ALLOWED_MIME_TYPES,
  DOCS_BUCKET,
  MAX_FILE_BYTES,
} from '@/lib/storage/limits'

const DEFAULT_BUCKET = DOCS_BUCKET

/** Skip repeated listBuckets/createBucket calls within this process. */
const ensuredBuckets = new Set<string>()

export type UploadInput = {
  bytes: ArrayBuffer | Buffer
  path: string
  contentType: string
  bucket?: string
}

async function syncBucketConfig(bucket: string) {
  const admin = createServerClient()
  const { error } = await admin.storage.updateBucket(bucket, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  })
  // Older projects / missing permission — upload can still work with existing config.
  if (error && !/not found|does not exist/i.test(error.message)) {
    console.warn(`[storage] updateBucket(${bucket}):`, error.message)
  }
}

/** Create private bucket if missing; always sync size/MIME limits (service role). */
export async function ensurePrivateBucket(bucket = DEFAULT_BUCKET) {
  if (ensuredBuckets.has(bucket)) return

  const admin = createServerClient()
  const { data: buckets, error: listError } = await admin.storage.listBuckets()
  if (listError) throw new Error(`Storage unavailable: ${listError.message}`)

  if (buckets?.some((b) => b.id === bucket || b.name === bucket)) {
    await syncBucketConfig(bucket)
    ensuredBuckets.add(bucket)
    return
  }

  const { error: createError } = await admin.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  })
  if (
    createError &&
    !/already exists|duplicate|resource already|409/i.test(createError.message)
  ) {
    throw new Error(
      `Could not create document storage (${bucket}). In Supabase → Storage, create a private bucket named "${bucket}", or run supabase/storage.sql.`,
    )
  }
  await syncBucketConfig(bucket)
  ensuredBuckets.add(bucket)
}

function isBucketMissingError(message: string) {
  return /bucket not found|the resource was not found/i.test(message)
}

/** Upload to a private bucket. Returns bucket + path (use signed URLs to read). */
export async function uploadPrivateObject(input: UploadInput) {
  const bucket = input.bucket || DEFAULT_BUCKET
  const admin = createServerClient()
  await ensurePrivateBucket(bucket)

  const body = Buffer.isBuffer(input.bytes)
    ? input.bytes
    : Buffer.from(input.bytes as ArrayBuffer)
  if (body.length > MAX_FILE_BYTES) {
    throw new Error('File must be 5 MB or smaller after compression.')
  }

  let { error } = await admin.storage.from(bucket).upload(input.path, body, {
    contentType: input.contentType,
    upsert: false,
  })

  if (error && isBucketMissingError(error.message)) {
    ensuredBuckets.delete(bucket)
    await ensurePrivateBucket(bucket)
    ;({ error } = await admin.storage.from(bucket).upload(input.path, body, {
      contentType: input.contentType,
      upsert: false,
    }))
  }

  if (error) {
    if (isBucketMissingError(error.message)) {
      throw new Error(
        `Document storage bucket "${bucket}" was not found. Create a private bucket with that name in Supabase Storage (or run supabase/storage.sql).`,
      )
    }
    throw new Error(`Upload failed: ${error.message}`)
  }
  ensuredBuckets.add(bucket)
  return { bucket, path: input.path }
}

export async function createSignedDownloadUrl(bucket: string, path: string, expiresIn = 3600) {
  const admin = createServerClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not create signed URL')
  return data.signedUrl
}

/** Download object bytes via service role (for same-origin Open/proxy). */
export async function downloadPrivateObject(bucket: string, path: string) {
  const admin = createServerClient()
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) throw new Error(error?.message || 'Could not download file')
  return Buffer.from(await data.arrayBuffer())
}

export async function deletePrivateObject(bucket: string, path: string) {
  const admin = createServerClient()
  const { error } = await admin.storage.from(bucket).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
