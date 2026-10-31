'use client'

import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState } from 'react'

export type FriendlyTone = 'urgent' | 'info' | 'success'

export type FriendlyModalProps = {
  open: boolean
  title: string
  message: string
  tone?: FriendlyTone
  primaryLabel?: string
  secondaryLabel?: string
  /** When false, primary action does not auto-dismiss (e.g. await async delete). Default true. */
  closeOnPrimary?: boolean
  primaryDisabled?: boolean
  onPrimary?: () => void
  onSecondary?: () => void
  onClose: () => void
}

const TONE = {
  urgent: {
    accent: '#E90809',
    soft: 'rgba(233,8,9,0.12)',
    border: 'rgba(233,8,9,0.35)',
    icon: 'error',
    eyebrow: 'Attention',
  },
  info: {
    accent: '#0C5CF0',
    soft: 'rgba(12,92,240,0.12)',
    border: 'rgba(12,92,240,0.35)',
    icon: 'info',
    eyebrow: 'Notice',
  },
  success: {
    accent: '#0B7A3B',
    soft: 'rgba(11,122,59,0.12)',
    border: 'rgba(11,122,59,0.35)',
    icon: 'check_circle',
    eyebrow: 'Done',
  },
} as const

/** Small themed feedback modal — red (urgent), blue (info), green (success). */
export default function FriendlyModal({
  open,
  title,
  message,
  tone = 'urgent',
  primaryLabel = 'OK',
  secondaryLabel,
  closeOnPrimary = true,
  primaryDisabled = false,
  onPrimary,
  onSecondary,
  onClose,
}: FriendlyModalProps) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const locked = Boolean(primaryDisabled)
  const lockedRef = useRef(locked)
  lockedRef.current = locked

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  const t = TONE[tone]

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss"
        disabled={locked}
        className="absolute inset-0 bg-[#071428]/55 backdrop-blur-md disabled:cursor-not-allowed dark:bg-black/60"
        onClick={() => {
          if (!locked) onClose()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border bg-white shadow-[0_24px_64px_rgba(7,20,40,0.35)] dark:bg-[#0c1c38]"
        style={{ borderColor: t.border }}
      >
        <div className="flex items-start gap-3 px-4 py-3" style={{ background: t.soft }}>
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: t.accent }}
          >
            <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: t.accent }}>
              {t.eyebrow}
            </p>
            <h2
              id={titleId}
              className="mt-0.5 text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
            >
              {title}
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-on-surface-variant dark:text-blue-200/65">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            className="rounded-md p-1 text-on-surface-variant transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-outline-variant/80 px-4 py-2.5 dark:border-[#1e3a5f]">
          {secondaryLabel ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                onSecondary?.()
                onClose()
              }}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-50 dark:hover:bg-white/10"
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            disabled={locked}
            onClick={() => {
              onPrimary?.()
              if (closeOnPrimary) onClose()
            }}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: t.accent }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
