'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

type Props = {
  message: string
  title?: string
  className?: string
}

/** Inline banner when a page soft-fails (DB down, etc.) — keeps admin chrome intact. */
export default function ServiceAlert({
  message,
  title = 'Connection problem',
  className = '',
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
          <span className="material-symbols-outlined text-[18px]">cloud_off</span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-sm leading-snug opacity-90">{message}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-amber-900 disabled:opacity-60 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
      >
        <span className="material-symbols-outlined text-[16px]">
          {pending ? 'progress_activity' : 'refresh'}
        </span>
        {pending ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  )
}
