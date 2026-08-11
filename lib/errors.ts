/**
 * Shared error classification for DB / network failures so UI can soft-fail
 * instead of blowing up the whole admin shell.
 */

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong'
}

export function isConnectionError(error: unknown): boolean {
  const msg = errorMessage(error).toLowerCase()
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''

  if (['P1001', 'P1002', 'P1017', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(code)) {
    return true
  }

  return (
    msg.includes("can't reach database") ||
    msg.includes('cant reach database') ||
    msg.includes('server has closed the connection') ||
    msg.includes('connection refused') ||
    msg.includes('connection timed out') ||
    msg.includes('connect_timeout') ||
    msg.includes('timed out fetching') ||
    msg.includes('fetch failed') ||
    msg.includes('network') && msg.includes('fail') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('unavailable') && msg.includes('database')
  )
}

/** User-facing copy — never dump raw Prisma / Node stack text when we can classify. */
export function friendlyErrorMessage(error: unknown): string {
  if (isConnectionError(error)) {
    return 'Database is temporarily unreachable. This is usually a brief connection hiccup — wait a moment and retry.'
  }
  const msg = errorMessage(error)
  if (msg.length > 180) {
    return 'Something went wrong while loading this page. Please try again.'
  }
  return msg || 'Something went wrong. Please try again.'
}

export type SoftResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string }

/** Run a DB/network call; never throw — return a friendly error string instead. */
export async function softQuery<T>(fn: () => Promise<T>): Promise<SoftResult<T>> {
  try {
    const data = await fn()
    return { ok: true, data, error: null }
  } catch (error) {
    console.error('[softQuery]', error)
    return { ok: false, data: null, error: friendlyErrorMessage(error) }
  }
}
