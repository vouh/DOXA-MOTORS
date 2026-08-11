'use client'

import { useEffect } from 'react'
import { friendlyErrorMessage, isConnectionError } from '@/lib/errors'

export default function ErrorFallback({
  error,
  reset,
  homeHref = '/admin',
}: {
  error: Error & { digest?: string }
  reset: () => void
  homeHref?: string
}) {
  const connection = isConnectionError(error)
  const message = friendlyErrorMessage(error)

  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 text-center shadow-[0_16px_48px_rgba(4,59,169,0.12)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            connection
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
              : 'bg-[#E90809]/10 text-[#E90809]'
          }`}
        >
          <span className="material-symbols-outlined text-[26px]">
            {connection ? 'cloud_off' : 'error'}
          </span>
        </div>
        <h2 className="mt-4 text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50">
          {connection ? 'Connection problem' : 'Something went wrong'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant dark:text-blue-200/60">
          {message}
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-on-surface-variant/70 dark:text-blue-200/35">
            Ref {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Try again
          </button>
          <a
            href={homeHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container dark:border-[#1e3a5f] dark:text-blue-100 dark:hover:bg-white/5"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
