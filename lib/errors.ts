/**
 * Shared error classification — user-facing copy never leaks DB/Prisma/stack details.
 * Always pair with logDevError() so developers still see the real cause in the console.
 */

export type ErrorKind =
  | 'offline'
  | 'connection'
  | 'auth'
  | 'forbidden'
  | 'validation'
  | 'not_found'
  | 'rate_limit'
  | 'unknown'

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong'
}

export function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code || '')
  }
  return ''
}

/** Detailed console logging — full error in development, compact in production. */
export function logDevError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  const label = `[doxa:${scope}]`
  if (process.env.NODE_ENV === 'development') {
    console.warn(label, error, extra ?? '')
    if (error instanceof Error && error.stack) {
      console.warn(`${label} stack`, error.stack)
    }
  } else {
    console.error(label, errorMessage(error), errorCode(error) || undefined, extra)
  }
}

/** Browser / transport offline — not a DB failure. */
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  const name = error instanceof Error ? error.name : ''
  if (name === 'OfflineError') return true

  const msg = errorMessage(error).toLowerCase()
  return (
    msg.includes('you are offline') ||
    msg.includes("you're offline") ||
    msg.includes('you appear to be offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('the internet connection appears to be offline') ||
    (msg.includes('network') && msg.includes('fail'))
  )
}

export function isConnectionError(error: unknown): boolean {
  // Client offline / dropped network is classified separately.
  if (isOfflineError(error)) return false

  const msg = errorMessage(error).toLowerCase()
  const code = errorCode(error)

  if (['P1001', 'P1002', 'P1017', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(code)) {
    return true
  }

  return (
    msg.includes("can't reach database") ||
    msg.includes('cant reach database') ||
    msg.includes('could not reach the database') ||
    msg.includes('server has closed the connection') ||
    msg.includes('connection refused') ||
    msg.includes('connection timed out') ||
    msg.includes('connect_timeout') ||
    msg.includes('timed out fetching') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    (msg.includes('unavailable') && msg.includes('database')) ||
    (msg.includes('prisma') && (msg.includes('connect') || msg.includes('timeout')))
  )
}

function looksInternal(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    /postgres|postgresql|prisma|supabase\.co|connection string|database url|direct_url|pgbouncer/.test(m) ||
    /p\d{4}\b/.test(m) ||
    /econn|etimedout|enotfound|econnreset/.test(m) ||
    m.includes('at async') ||
    m.includes('node_modules') ||
    m.includes('\\projects\\') ||
    m.includes('/projects/') ||
    m.includes('invocation') ||
    m.includes('aggregateerror') ||
    msg.length > 220
  )
}

function mapAuthMessage(msg: string): string | null {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (m.includes('incorrect password')) return 'Incorrect password. Please try again.'
  if (m.includes('email not confirmed') || m.includes('not verified')) {
    return 'Your email address has not been verified yet.'
  }
  if (m.includes('too many') || m.includes('rate limit') || m.includes('locked')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (m.includes('user not found') || m.includes('no staff')) {
    return 'No staff account found for this email. Ask a Director to invite you.'
  }
  if (m.includes('suspended')) return 'Your account has been suspended. Contact a Director.'
  if (m.includes('not active') || m.includes('inactive')) {
    return 'Your account is not active. Contact a Director.'
  }
  return null
}

export function classifyError(error: unknown): ErrorKind {
  if (isOfflineError(error)) return 'offline'
  if (isConnectionError(error)) return 'connection'
  const name = error instanceof Error ? error.name : ''
  if (name === 'ForbiddenError') return 'forbidden'
  if (name === 'ZodError') return 'validation'
  const msg = errorMessage(error).toLowerCase()
  if (mapAuthMessage(msg)) return 'auth'
  if (msg.includes('not found') || errorCode(error) === 'P2025') return 'not_found'
  if (msg.includes('too many') || msg.includes('429')) return 'rate_limit'
  return 'unknown'
}

export function titleForErrorKind(kind: ErrorKind): string {
  switch (kind) {
    case 'offline':
      return "You're offline"
    case 'connection':
      return 'Connection problem'
    case 'auth':
      return 'Sign-in issue'
    case 'forbidden':
      return 'Not allowed'
    case 'validation':
      return 'Check your details'
    case 'not_found':
      return 'Not found'
    case 'rate_limit':
      return 'Please wait'
    default:
      return 'Something went wrong'
  }
}

/** User-facing copy — never dump raw Prisma / Node / SQL text. */
export function friendlyErrorMessage(error: unknown): string {
  const kind = classifyError(error)
  if (kind === 'offline') {
    return "You're offline. Check your internet connection and try again."
  }
  if (kind === 'connection') {
    return 'We could not reach the database just now. This is usually brief — wait a moment and try again.'
  }

  const name = error instanceof Error ? error.name : ''
  if (name === 'ForbiddenError') {
    const msg = errorMessage(error)
    return looksInternal(msg) ? 'You do not have permission to do that.' : msg
  }
  if (name === 'ZodError' && error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues?: { message?: string }[] }).issues
    const first = issues?.[0]?.message
    if (first && !looksInternal(first)) return first
    return 'Please check the form fields and try again.'
  }

  const raw = errorMessage(error)
  const authMapped = mapAuthMessage(raw)
  if (authMapped) return authMapped

  if (looksInternal(raw)) {
    return 'Something went wrong on our side. Please try again. If it keeps happening, contact support.'
  }

  return raw || 'Something went wrong. Please try again.'
}

/** Urgency for themed modals — red = urgent, blue = informational/recoverable. */
export function urgencyForErrorKind(kind: ErrorKind): 'urgent' | 'info' {
  if (kind === 'offline' || kind === 'connection' || kind === 'auth' || kind === 'forbidden' || kind === 'unknown') {
    return 'urgent'
  }
  return 'info'
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
    logDevError('softQuery', error)
    return { ok: false, data: null, error: friendlyErrorMessage(error) }
  }
}

/** Standard ActionResult failure helper for server actions. */
export function actionFail(error: unknown): { ok: false; message: string } {
  logDevError('action', error)
  return { ok: false, message: friendlyErrorMessage(error) }
}
