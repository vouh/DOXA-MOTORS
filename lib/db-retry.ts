import { isConnectionError, logDevError } from '@/lib/errors'

const RETRY_DELAYS_MS = [0, 800, 2000, 4000] as const

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Retry transient Postgres / pooler reachability failures (common on first hit). */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  scope = 'db-retry',
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt]
    if (delay > 0) await sleep(delay)
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const last = attempt === RETRY_DELAYS_MS.length - 1
      if (!isConnectionError(error) || last) throw error
      logDevError(scope, error, {
        attempt: attempt + 1,
        retriesLeft: RETRY_DELAYS_MS.length - attempt - 1,
      })
    }
  }
  throw lastError
}
