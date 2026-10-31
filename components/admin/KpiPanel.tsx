'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChartOptions } from 'chart.js'
import { FLEET_STATUS_COLORS, KPI_CHART_COLORS } from '@/components/admin/charts/colors'
import { Card } from '@/components/admin/ui'
import {
  KPI_VIEW_EVENT,
  KPI_VIEW_STORAGE_KEY,
  type KpiViewMode,
} from '@/components/admin/KpiViewToggle'

export type KpiItem = {
  id: string
  label: string
  /** Display string (e.g. "KES 12,000" or "4") */
  value: string
  /** Raw number for charts */
  numericValue: number
  icon?: string
  kind: 'count' | 'money'
}

const STORAGE_KEY = KPI_VIEW_STORAGE_KEY
const HIDDEN_STORAGE_KEY = 'doxa-kpi-hidden'

type ViewMode = KpiViewMode

type ChartComponents = {
  Bar: typeof import('react-chartjs-2').Bar
  Doughnut: typeof import('react-chartjs-2').Doughnut
}

export default function KpiPanel({
  items,
  title = 'Overview',
  subtitle,
  collapsible = false,
  hideStorageKey = HIDDEN_STORAGE_KEY,
  compact = false,
  cardsOnly = false,
  hideHeader = false,
}: {
  items: KpiItem[]
  title?: string
  subtitle?: string
  /** Show/hide toggle (persisted). */
  collapsible?: boolean
  hideStorageKey?: string
  /** No title row — only cards/charts toggle when content is shown. */
  compact?: boolean
  /** Finance: KPI cards only (charts live in FinanceCharts). */
  cardsOnly?: boolean
  /** Title + Cards/Charts live in the page header (e.g. Vehicles). */
  hideHeader?: boolean
}) {
  const [view, setView] = useState<ViewMode>('cards')
  const [hidden, setHidden] = useState(false)
  const [ready, setReady] = useState(false)
  const [charts, setCharts] = useState<ChartComponents | null>(null)

  // Hydrate preferences once on mount (fixed deps length — avoids HMR hook size mismatch).
  useEffect(() => {
    try {
      if (!cardsOnly) {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'cards' || saved === 'charts') setView(saved)
      } else {
        setView('cards')
      }
      if (collapsible && localStorage.getItem(hideStorageKey) === '1') setHidden(true)
    } catch {
      /* ignore */
    }
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only localStorage hydrate
  }, [])

  useEffect(() => {
    if (cardsOnly) setView('cards')
  }, [cardsOnly])

  useEffect(() => {
    if (cardsOnly || !hideHeader) return
    const onView = (e: Event) => {
      const detail = (e as CustomEvent<{ view?: string; storageKey?: string }>).detail
      if (detail?.storageKey && detail.storageKey !== STORAGE_KEY) return
      if (detail?.view === 'cards' || detail?.view === 'charts') setView(detail.view)
    }
    window.addEventListener(KPI_VIEW_EVENT, onView)
    return () => window.removeEventListener(KPI_VIEW_EVENT, onView)
  }, [cardsOnly, hideHeader])

  useEffect(() => {
    if (view !== 'charts' || charts) return
    let cancelled = false
    void (async () => {
      const { ensureChartJs } = await import('@/components/admin/charts/register')
      ensureChartJs()
      const { Bar, Doughnut } = await import('react-chartjs-2')
      if (!cancelled) setCharts({ Bar, Doughnut })
    })()
    return () => {
      cancelled = true
    }
  }, [view, charts])

  function selectView(next: ViewMode) {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(KPI_VIEW_EVENT, { detail: { view: next, storageKey: STORAGE_KEY } }),
      )
    }
  }

  function toggleHidden() {
    setHidden((prev) => {
      const next = !prev
      try {
        localStorage.setItem(hideStorageKey, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const counts = useMemo(() => items.filter((i) => i.kind === 'count'), [items])
  const money = useMemo(() => items.filter((i) => i.kind === 'money'), [items])

  const doughnutData = useMemo(
    () => ({
      labels: counts.map((i) => i.label),
      datasets: [
        {
          data: counts.map((i) => Math.max(0, i.numericValue)),
          backgroundColor: counts.map(
            (i, idx) =>
              FLEET_STATUS_COLORS[i.id] ?? KPI_CHART_COLORS[idx % KPI_CHART_COLORS.length],
          ),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    }),
    [counts],
  )

  const barData = useMemo(
    () => ({
      labels: money.map((i) => i.label),
      datasets: [
        {
          label: 'KES',
          data: money.map((i) => i.numericValue),
          backgroundColor: money.map((_, idx) => KPI_CHART_COLORS[idx % KPI_CHART_COLORS.length]),
          borderRadius: 10,
          maxBarThickness: 48,
        },
      ],
    }),
    [money],
  )

  const chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, padding: 14, font: { size: 11 } },
      },
    },
  }

  if (!items.length) return null

  const Doughnut = charts?.Doughnut
  const Bar = charts?.Bar

  return (
    <div className="space-y-3">
      {hideHeader || cardsOnly ? null : compact ? (
        <div className="flex justify-end">
          <div className="inline-flex rounded-full border border-primary/25 bg-primary/[0.04] p-0.5 dark:border-primary/35 dark:bg-primary/10">
            <button
              type="button"
              onClick={() => selectView('cards')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                view === 'cards'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => selectView('charts')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                view === 'charts'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
              }`}
            >
              Charts
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-nowrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-nowrap items-baseline gap-2 overflow-hidden">
            <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary/70 dark:text-blue-200/45">
              {title}
            </h2>
            {subtitle && !hidden ? (
              <p className="truncate text-xs text-on-surface-variant dark:text-blue-200/50">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {collapsible ? (
              <button
                type="button"
                onClick={toggleHidden}
                className="inline-flex items-center gap-1 rounded-full border border-[#d7dce5] bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant shadow-sm transition hover:text-primary dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-200/60"
                aria-expanded={!hidden}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {hidden ? 'expand_more' : 'expand_less'}
                </span>
                {hidden ? 'Show KPIs' : 'Hide KPIs'}
              </button>
            ) : null}
            {!hidden ? (
              <div className="inline-flex rounded-full border border-primary/25 bg-primary/[0.04] p-0.5 shadow-sm dark:border-primary/35 dark:bg-primary/10">
                <button
                  type="button"
                  onClick={() => selectView('cards')}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    view === 'cards'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => selectView('charts')}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    view === 'charts'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
                  }`}
                >
                  Charts
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {hidden && !compact && !cardsOnly && !hideHeader ? null : cardsOnly || !ready || view === 'cards' ? (
        <div className="flex w-full justify-center">
          <div className="inline-flex max-w-full flex-wrap justify-start gap-2.5">
          {items.map((item, index) => {
            const fleetColor = FLEET_STATUS_COLORS[item.id]
            const isAlert =
              item.id === 'overdue' ||
              item.id === 'outstanding' ||
              item.id === 'expiring' ||
              item.id === 'HIRED' ||
              item.id === 'MAINTENANCE'
            const useRed = !fleetColor && (isAlert || index % 4 === 3)
            const accent = fleetColor ?? (useRed ? '#E90809' : '#0C5CF0')
            return (
              <div
                key={item.id}
                className={`group relative flex min-h-[4.75rem] w-[12.5rem] max-w-full items-center overflow-hidden rounded-xl border bg-gradient-to-br px-3 py-3.5 shadow-[0_6px_20px_rgba(4,59,169,0.06)] transition-all hover:-translate-y-0.5 dark:shadow-[0_8px_24px_rgba(2,10,28,0.45)] ${
                  useRed && !fleetColor
                    ? 'border-[#f5c4c4] from-white via-[#fff8f8] to-[#ffeeee] hover:shadow-[0_10px_28px_rgba(233,8,9,0.12)] dark:border-error/25 dark:from-[#1a1014] dark:via-[#180e12] dark:to-[#140a0e] dark:hover:border-error/40'
                    : 'border-[#cdd8f0] from-white via-[#f5f8ff] to-[#e8effd] hover:shadow-[0_10px_28px_rgba(12,92,240,0.14)] dark:border-[#1e3a5f] dark:from-[#0c1c38] dark:via-[#0a1830] dark:to-[#071428] dark:hover:border-primary/40'
                }`}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{ background: accent }}
                />
                <div className="flex w-full items-center gap-2.5 pl-1">
                  {item.icon ? (
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                      style={{ backgroundColor: `${accent}1f`, color: accent }}
                    >
                      <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-number text-[17px] font-bold tabular-nums leading-none tracking-tight"
                      style={{ color: accent }}
                    >
                      {item.value}
                    </p>
                    <p
                      className="mt-1 text-[9px] font-semibold uppercase leading-snug tracking-[0.08em] opacity-70"
                      style={{ color: accent }}
                    >
                      {item.label}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      ) : !Doughnut || !Bar ? (
        <p className="rounded-xl border border-outline-variant px-4 py-8 text-center text-sm text-on-surface-variant">
          Loading charts…
        </p>
      ) : (
        <div
          className={`grid gap-4 ${
            counts.length && money.length ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {counts.length > 0 && (
            <Card className="p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant dark:text-blue-200/45">
                Counts
              </p>
              <div className="h-[260px]">
                {counts.every((c) => c.numericValue === 0) ? (
                  <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                    No count data yet.
                  </p>
                ) : (
                  <Doughnut
                    data={doughnutData}
                    options={{
                      ...chartOptions,
                      cutout: '62%',
                    }}
                  />
                )}
              </div>
            </Card>
          )}
          {money.length > 0 && (
            <Card className="p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant dark:text-blue-200/45">
                Money (KES)
              </p>
              <div className="h-[260px]">
                <Bar
                  data={barData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { display: false },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, maxRotation: 0 },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(140,146,157,0.15)' },
                        ticks: {
                          font: { size: 10 },
                          callback: (v) =>
                            typeof v === 'number' ? v.toLocaleString() : String(v),
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
