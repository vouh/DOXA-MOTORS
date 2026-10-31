'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { BookingAlert } from '@/lib/intelligence/bookings'

const POLL_MS = 60_000
const DISMISS_PREFIX = 'doxa:intel:booking:'

function dismissKey(alert: BookingAlert) {
  return `${DISMISS_PREFIX}${alert.kind}:${alert.id}`
}

function isDismissed(alert: BookingAlert) {
  try {
    const raw = localStorage.getItem(dismissKey(alert))
    if (!raw) return false
    const until = Number(raw)
    if (!Number.isFinite(until)) return false
    return Date.now() < until
  } catch {
    return false
  }
}

function dismiss(alert: BookingAlert) {
  // Overdue: remind again in 30 min. Ending soon: dismiss until due time + buffer.
  const ms =
    alert.kind === 'overdue'
      ? 30 * 60 * 1000
      : Math.max(15 * 60 * 1000, (new Date(alert.expectedReturnAt).getTime() - Date.now()) + 5 * 60 * 1000)
  try {
    localStorage.setItem(dismissKey(alert), String(Date.now() + ms))
  } catch {
    /* ignore */
  }
}

export default function BookingIntelligenceLayer() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [queue, setQueue] = useState<BookingAlert[]>([])
  const [current, setCurrent] = useState<BookingAlert | null>(null)
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => setMounted(true), [])

  const applyAlerts = useCallback((alerts: BookingAlert[]) => {
    const visible = alerts.filter((a) => !isDismissed(a))
    setOverdueCount(alerts.filter((a) => a.kind === 'overdue').length)
    setQueue(visible)
    setCurrent((prev) => {
      if (prev && visible.some((a) => a.id === prev.id && a.kind === prev.kind)) return prev
      return visible[0] ?? null
    })
  }, [])

  const poll = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    try {
      const res = await fetch('/api/admin/intelligence/bookings', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = (await res.json()) as { alerts?: BookingAlert[] }
      applyAlerts(data.alerts ?? [])
    } catch {
      /* offline / transient */
    }
  }, [applyAlerts])

  useEffect(() => {
    void poll()
    const id = window.setInterval(() => void poll(), POLL_MS)
    const onFocus = () => void poll()
    const onVis = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [poll])

  // Expose overdue count for the header bell via custom event
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('doxa:booking-intel', { detail: { overdueCount, hasPrompt: Boolean(current) } }),
    )
  }, [overdueCount, current])

  function closeCurrent() {
    if (!current) return
    dismiss(current)
    const rest = queue.filter((a) => !(a.id === current.id && a.kind === current.kind))
    setQueue(rest)
    setCurrent(rest[0] ?? null)
  }

  function openBooking() {
    if (!current) return
    dismiss(current)
    setCurrent(null)
    setQueue((q) => q.filter((a) => !(a.id === current.id && a.kind === current.kind)))
    router.push('/admin/bookings')
  }

  if (!mounted || !current) return null

  const urgent = current.urgency === 'urgent'
  const accent = urgent ? '#E90809' : '#0C5CF0'
  const accentSoft = urgent ? 'rgba(233,8,9,0.12)' : 'rgba(12,92,240,0.12)'
  const border = urgent ? 'rgba(233,8,9,0.35)' : 'rgba(12,92,240,0.35)'
  const icon = urgent ? 'warning' : 'schedule'

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[190] flex justify-end p-4 sm:p-5">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="booking-intel-title"
        className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border bg-white shadow-[0_16px_40px_rgba(7,20,40,0.22)] dark:bg-[#0c1c38]"
        style={{ borderColor: border }}
      >
        <div className="flex items-start gap-3 px-4 py-3" style={{ background: accentSoft }}>
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: accent }}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: accent }}
            >
              {urgent ? 'Urgent · Bookings' : 'Notice · Bookings'}
            </p>
            <h2
              id="booking-intel-title"
              className="mt-0.5 text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
            >
              {current.title}
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-on-surface-variant dark:text-blue-200/65">
              {current.message}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCurrent}
            aria-label="Dismiss"
            className="rounded-md p-1 text-on-surface-variant transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-outline-variant/80 px-4 py-2.5 dark:border-[#1e3a5f]">
          <p className="text-[11px] text-on-surface-variant">
            {queue.length > 1 ? `${queue.length - 1} more` : 'Booking intelligence'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeCurrent}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container dark:hover:bg-white/10"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={openBooking}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
              style={{ background: accent }}
            >
              Open bookings
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
