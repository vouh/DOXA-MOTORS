import { createServerClient } from '@/lib/supabase-server'

const DEFAULT_BUCKET = 'car-hire-docs'

export type UploadInput = {
  bytes: ArrayBuffer | Buffer
  path: string
  contentType: string
  bucket?: string
}

/** Upload to a private bucket. Returns bucket + path (use signed URLs to read). */
export async function uploadPrivateObject(input: UploadInput) {
  const bucket = input.bucket || DEFAULT_BUCKET
  const admin = createServerClient()
  const body = input.bytes instanceof Buffer ? input.bytes : Buffer.from(input.bytes)
  const { error } = await admin.storage.from(bucket).upload(input.path, body, {
    contentType: input.contentType,
    upsert: false,
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return { bucket, path: input.path }
}

export async function createSignedDownloadUrl(bucket: string, path: string, expiresIn = 3600) {
  const admin = createServerClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not create signed URL')
  return data.signedUrl
}
