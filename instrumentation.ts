import { validateEnv } from '@/lib/env'

export async function register() {
  validateEnv()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    if (dsn) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.init({
        dsn,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
        enabled: Boolean(dsn),
      })
    }
  }
}
