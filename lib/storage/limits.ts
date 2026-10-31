/** Shared document storage limits (Supabase bucket + app validation). */

export const DOCS_BUCKET = 'car-hire-docs'

/** Hard upload / bucket limit — 5 MB. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'xls',
  'xlsx',
  'doc',
  'docx',
  'csv',
  'jpg',
  'jpeg',
  'png',
] as const

export const ALLOWED_EXT = new Set<string>(ALLOWED_EXTENSIONS)

/** MIME types enforced by the app and mirrored on the Storage bucket. */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'image/jpeg',
  'image/png',
  // Browsers sometimes omit type or use generic binary for allowed extensions
  'application/octet-stream',
] as const

export const ALLOWED_MIME = new Set<string>(ALLOWED_MIME_TYPES)

export const ACCEPT_FILE_ATTR =
  '.pdf,.xls,.xlsx,.doc,.docx,.csv,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png'

export const ACCEPT_IDENTITY_ATTR =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

export const FILE_TYPES_HINT = 'PDF, Excel, Word, CSV, JPG, or PNG'
export const FILE_SIZE_HINT = 'max 5 MB (compressed on upload)'
