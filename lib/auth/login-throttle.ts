/**
 * Login brute-force guard — in-memory sliding window per email + IP.
 * Enough for a single Node process / warm serverless instance.
 * Limits: 5 failures → lock 15 minutes. Success clears counters.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

type Bucket = { failures: number; firstAt: number; lockedUntil?: number }

const byKey = new Map<string, Bucket>()

function prune(key: string, now: number) {
  const bucket = byKey.get(key)
  if (!bucket) return
  if (bucket.lockedUntil && bucket.lockedUntil <= now) {
    byKey.delete(key)
    return
  }
  if (!bucket.lockedUntil && now - bucket.firstAt > WINDOW_MS) {
    byKey.delete(key)
  }
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function keyFor(email: string, ip: string) {
  return `${email.toLowerCase()}|${ip}`
}

/** Returns remaining lock seconds if locked, else 0. */
export function loginLockRemaining(email: string, ip: string): number {
  const now = Date.now()
  const key = keyFor(email, ip)
  prune(key, now)
  const bucket = byKey.get(key)
  if (!bucket?.lockedUntil) return 0
  return Math.max(0, Math.ceil((bucket.lockedUntil - now) / 1000))
}

export function recordLoginFailure(email: string, ip: string): { locked: boolean; retryAfterSec: number } {
  const now = Date.now()
  const key = keyFor(email, ip)
  prune(key, now)

  let bucket = byKey.get(key)
  if (!bucket) {
    bucket = { failures: 0, firstAt: now }
    byKey.set(key, bucket)
  } else if (now - bucket.firstAt > WINDOW_MS && !bucket.lockedUntil) {
    bucket.failures = 0
    bucket.firstAt = now
  }

  bucket.failures += 1
  if (bucket.failures >= MAX_FAILURES) {
    bucket.lockedUntil = now + WINDOW_MS
    return { locked: true, retryAfterSec: Math.ceil(WINDOW_MS / 1000) }
  }
  return { locked: false, retryAfterSec: 0 }
}

export function clearLoginFailures(email: string, ip: string) {
  byKey.delete(keyFor(email, ip))
}

export const LOGIN_THROTTLE = {
  maxFailures: MAX_FAILURES,
  windowMinutes: WINDOW_MS / 60_000,
} as const
