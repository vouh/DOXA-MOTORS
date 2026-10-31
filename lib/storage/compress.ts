import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'

export type CompressResult = {
  bytes: Buffer
  contentType: string
  originalBytes: number
  storedBytes: number
  /** True when stored payload is smaller than the original upload. */
  compressed: boolean
  method: 'none' | 'pdf-rewrite' | 'image-sharp'
}

const IMAGE_MAX_EDGE = 2000
const JPEG_QUALITY = 82

function pickSmaller(original: Buffer, candidate: Buffer): Buffer {
  return candidate.length < original.length ? candidate : original
}

async function compressImage(bytes: Buffer, ext: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const base = sharp(bytes, { failOn: 'none' }).rotate()
    const meta = await base.metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    let pipeline = base
    if (width > IMAGE_MAX_EDGE || height > IMAGE_MAX_EDGE) {
      pipeline = pipeline.resize(IMAGE_MAX_EDGE, IMAGE_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    if (ext === 'png') {
      const out = await pipeline.png({ compressionLevel: 6, effort: 4 }).toBuffer()
      return { bytes: pickSmaller(bytes, out), contentType: 'image/png' }
    }

    const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
    return { bytes: pickSmaller(bytes, out), contentType: 'image/jpeg' }
  } catch {
    return null
  }
}

/**
 * Shrink upload payloads where it helps without breaking downloads.
 * - PDF: rewrite with object streams
 * - JPG/PNG: resize large edges + re-encode (sharp)
 * - Office (.docx/.xlsx) are already zip — skip
 * - CSV: leave as-is
 */
export async function compressDocumentBytes(input: {
  bytes: Buffer
  contentType: string
  ext: string
}): Promise<CompressResult> {
  const originalBytes = input.bytes.length
  const ext = input.ext.toLowerCase()
  const mime = (input.contentType || '').toLowerCase()

  if (ext === 'pdf' || mime === 'application/pdf') {
    try {
      const doc = await PDFDocument.load(input.bytes, { ignoreEncryption: true })
      const rewritten = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      })
      const out = Buffer.from(rewritten)
      if (out.length < originalBytes) {
        return {
          bytes: out,
          contentType: 'application/pdf',
          originalBytes,
          storedBytes: out.length,
          compressed: true,
          method: 'pdf-rewrite',
        }
      }
    } catch {
      /* keep original if encrypted/corrupt */
    }
  }

  const isJpeg = ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg'
  const isPng = ext === 'png' || mime === 'image/png'
  if (isJpeg || isPng) {
    const result = await compressImage(input.bytes, isPng ? 'png' : 'jpeg')
    if (result && result.bytes.length < originalBytes) {
      return {
        bytes: result.bytes,
        contentType: result.contentType,
        originalBytes,
        storedBytes: result.bytes.length,
        compressed: true,
        method: 'image-sharp',
      }
    }
    if (result) {
      return {
        bytes: result.bytes,
        contentType: result.contentType,
        originalBytes,
        storedBytes: result.bytes.length,
        compressed: false,
        method: 'none',
      }
    }
  }

  return {
    bytes: input.bytes,
    contentType: input.contentType,
    originalBytes,
    storedBytes: originalBytes,
    compressed: false,
    method: 'none',
  }
}
