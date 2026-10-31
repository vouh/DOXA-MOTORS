export type DocumentMeta = {
  category: string
  title: string | null
  notes: string | null
  originalName: string
  fileSize: number
}

const META_PREFIX = 'DOC_META:'

export function encodeDocumentKind(meta: DocumentMeta): string {
  return META_PREFIX + JSON.stringify(meta)
}

export function parseDocumentKind(kind: string): DocumentMeta {
  if (kind.startsWith(META_PREFIX)) {
    try {
      const parsed = JSON.parse(kind.slice(META_PREFIX.length)) as Partial<DocumentMeta>
      return {
        category: String(parsed.category || 'OTHER'),
        title: parsed.title ? String(parsed.title) : null,
        notes: parsed.notes ? String(parsed.notes) : null,
        originalName: String(parsed.originalName || 'document'),
        fileSize: Number(parsed.fileSize) || 0,
      }
    } catch {
      /* fall through */
    }
  }
  return {
    category: kind || 'OTHER',
    title: null,
    notes: null,
    originalName: 'document',
    fileSize: 0,
  }
}
