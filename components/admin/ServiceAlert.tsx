'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import FriendlyModal from '@/components/ui/FriendlyModal'

type Props = {
  message: string
  title?: string
  className?: string
}

/**
 * Soft-fail UI when a page cannot load data (e.g. DB down).
 * Shows a themed modal once, plus a slim retry banner after dismiss.
 */
export default function ServiceAlert({
  message,
  title = 'Connection problem',
  className = '',
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    // Soft failures are already logged by softQuery — avoid console.error (Next overlay).
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ServiceAlert]', title, message)
    }
  }, [title, message])

  return (
    <>
      <FriendlyModal
        open={modalOpen}
        title={title}
        message={message}
        tone="urgent"
        primaryLabel={pending ? 'Retrying…' : 'Retry'}
        secondaryLabel="Dismiss"
        onPrimary={() => startTransition(() => router.refresh())}
        onSecondary={() => setModalOpen(false)}
        onClose={() => setModalOpen(false)}
      />
      {!modalOpen ? (
        <div
          role="alert"
          className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#E90809]/30 bg-[#E90809]/08 px-4 py-3 text-[#7a0610] shadow-sm dark:border-[#E90809]/40 dark:bg-[#E90809]/10 dark:text-red-100 ${className}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E90809] text-white">
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#C50000] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">
              {pending ? 'progress_activity' : 'refresh'}
            </span>
            {pending ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : null}
    </>
  )
}
