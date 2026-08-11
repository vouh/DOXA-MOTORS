'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { ensureChartJs, KPI_CHART_COLORS } from '@/components/admin/charts/register'
import { Card } from '@/components/admin/ui'

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

const STORAGE_KEY = 'doxa-kpi-view'

type ViewMode = 'cards' | 'charts'

export default function KpiPanel({
  items,
  title = 'Overview',
  subtitle,
}: {
  items: KpiItem[]
  title?: string
  subtitle?: string
}) {
  const [view, setView] = useState<ViewMode>('cards')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureChartJs()
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'cards' || saved === 'charts') setView(saved)
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  function selectView(next: ViewMode) {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const counts = useMemo(() => items.filter((i) => i.kind === 'count'), [items])
  const money = useMemo(() => items.filter((i) => i.kind === 'money'), [items])

  const doughnutData = useMemo(
    () => ({
      labels: counts.map((i) => i.label),
      datasets: [
        {
          data: counts.map((i) => Math.max(0, i.numericValue)),
          backgroundColor: counts.map((_, idx) => KPI_CHART_COLORS[idx % KPI_CHART_COLORS.length]),
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 10, padding: 14, font: { size: 11 } },
      },
    },
  }

  if (!items.length) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-nowrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-nowrap items-baseline gap-2 overflow-hidden">
          <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary/70 dark:text-blue-200/45">
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-xs text-on-surface-variant dark:text-blue-200/50">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-[#d7dce5] bg-white/90 p-0.5 shadow-sm dark:border-[#1e3a5f] dark:bg-[#0a1628]">
          <button
            type="button"
            onClick={() => selectView('cards')}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              view === 'cards'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-primary dark:text-blue-200/50 dark:hover:text-blue-100'
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
                : 'text-on-surface-variant hover:text-primary dark:text-blue-200/50 dark:hover:text-blue-100'
            }`}
          >
            Charts
          </button>
        </div>
      </div>

      {!ready || view === 'cards' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,10.75rem))] gap-2.5">
          {items.map((item, index) => {
            const isAlert = item.id === 'overdue' || item.id === 'outstanding'
            const useRed = isAlert || index % 4 === 3
            return (
              <div
                key={item.id}
                className={`group relative flex min-h-[4.75rem] items-center overflow-hidden rounded-xl border bg-gradient-to-br px-3 py-3.5 shadow-[0_6px_20px_rgba(4,59,169,0.06)] transition-all hover:-translate-y-0.5 dark:shadow-[0_8px_24px_rgba(2,10,28,0.45)] ${
                  useRed
                    ? 'border-[#f5c4c4] from-white via-[#fff8f8] to-[#ffeeee] hover:shadow-[0_10px_28px_rgba(233,8,9,0.12)] dark:border-error/25 dark:from-[#1a1014] dark:via-[#180e12] dark:to-[#140a0e] dark:hover:border-error/40'
                    : 'border-[#cdd8f0] from-white via-[#f5f8ff] to-[#e8effd] hover:shadow-[0_10px_28px_rgba(12,92,240,0.14)] dark:border-[#1e3a5f] dark:from-[#0c1c38] dark:via-[#0a1830] dark:to-[#071428] dark:hover:border-primary/40'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-[3px] ${
                    useRed
                      ? 'bg-gradient-to-b from-[#E90809] to-[#C50000]'
                      : 'bg-gradient-to-b from-[#0C5CF0] to-[#043BA9]'
                  }`}
                />
                <div className="flex items-center gap-2.5 pl-1">
                  {item.icon ? (
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm ${
                        useRed
                          ? 'bg-[#E90809]/12 text-[#E90809] dark:bg-[#E90809]/20 dark:text-[#ff6b6b]'
                          : 'bg-[#0C5CF0]/12 text-[#0C5CF0] dark:bg-primary/20 dark:text-[#7eb0ff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-number text-[17px] font-bold tabular-nums leading-none tracking-tight ${
                        useRed
                          ? 'text-[#C50000] dark:text-[#ff8a8a]'
                          : 'text-[#043BA9] dark:text-blue-100'
                      }`}
                    >
                      {item.value}
                    </p>
                    <p
                      className={`mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.12em] ${
                        useRed
                          ? 'text-[#E90809]/70 dark:text-[#ff6b6b]/55'
                          : 'text-[#0C5CF0]/65 dark:text-blue-200/45'
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
