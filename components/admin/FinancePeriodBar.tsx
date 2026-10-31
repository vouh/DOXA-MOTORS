'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useTransition, type ReactNode } from 'react'
import {
  PERIOD_PRESETS,
  type PeriodPreset,
  ymd,
} from '@/lib/calendar/period'

const control =
  'h-9 rounded-lg border border-primary/25 bg-primary/[0.04] px-2.5 text-[12px] font-semibold text-primary outline-none transition hover:border-primary/45 hover:bg-primary/[0.08] focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-primary/35 dark:bg-primary/10 dark:text-[#7eb0ff] dark:hover:border-primary/55 dark:hover:bg-primary/15'

export type FinanceViewMode = 'payments' | 'vehicles'

/** Compact Period / Show controls — no card chrome; sits beside the page title. */
export default function FinancePeriodBar({
  period,
  fromYmd,
  toYmd,
  label,
  view,
  trailing,
}: {
  period: PeriodPreset
  fromYmd: string
  toYmd: string
  label: string
  view: FinanceViewMode
  trailing?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [customFrom, setCustomFrom] = useState(fromYmd)
  const [customTo, setCustomTo] = useState(toYmd)

  function navigate(next: {
    period?: PeriodPreset
    from?: string
    to?: string
    view?: FinanceViewMode
  }) {
    const params = new URLSearchParams(searchParams.toString())
    const p = next.period ?? (params.get('period') as PeriodPreset) ?? period
    params.set('period', p)
    params.set('view', next.view ?? view)
    if (p === 'custom') {
      params.set('from', next.from ?? customFrom)
      params.set('to', next.to ?? customTo)
    } else {
      params.delete('from')
      params.delete('to')
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-2">
      <select
        aria-label="Period"
        title={`Showing ${label}${period !== 'custom' ? ` · ${fromYmd} → ${toYmd}` : ''}`}
        className={`${control} min-w-[8.5rem]`}
        value={period}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as PeriodPreset
          if (next === 'custom') {
            navigate({
              period: 'custom',
              from: customFrom || ymd(new Date()),
              to: customTo || ymd(new Date()),
            })
          } else {
            navigate({ period: next })
          }
        }}
      >
        {PERIOD_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.hint ? ` (${p.hint})` : ''}
          </option>
        ))}
      </select>

      {period === 'custom' ? (
        <>
          <input
            type="date"
            aria-label="From date"
            className={control}
            value={customFrom}
            disabled={pending}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <input
            type="date"
            aria-label="To date"
            className={control}
            value={customTo}
            disabled={pending}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          <button
            type="button"
            disabled={pending || !customFrom || !customTo}
            onClick={() => navigate({ period: 'custom', from: customFrom, to: customTo })}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-primary-container disabled:opacity-50"
          >
            Apply
          </button>
        </>
      ) : null}

      <select
        aria-label="Show"
        className={`${control} min-w-[8rem]`}
        value={view}
        disabled={pending}
        onChange={(e) => navigate({ view: e.target.value as FinanceViewMode })}
      >
        <option value="payments">Payments</option>
        <option value="vehicles">Vehicles / cars</option>
      </select>

      {trailing}

      {pending ? (
        <span className="text-[11px] font-medium text-primary">Updating…</span>
      ) : null}
    </div>
  )
}
