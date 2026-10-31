'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChartOptions } from 'chart.js'
import { FINANCE_MONEY_COLORS } from '@/components/admin/charts/colors'
import { Card } from '@/components/admin/ui'
import type { FinanceSeriesPoint, FleetFinanceTotals } from '@/lib/intelligence/fleet-finance'

type MixChart = 'pie' | 'doughnut'
type TrendChart = 'line' | 'bar'

type ChartBundle = {
  Pie: typeof import('react-chartjs-2').Pie
  Doughnut: typeof import('react-chartjs-2').Doughnut
  Bar: typeof import('react-chartjs-2').Bar
  Line: typeof import('react-chartjs-2').Line
}

const MIX_KEY = 'doxa-finance-chart-mix'
const TREND_KEY = 'doxa-finance-chart-trend'

const pill =
  'inline-flex rounded-full border border-primary/25 bg-primary/[0.04] p-0.5 dark:border-primary/35 dark:bg-primary/10'
const pillBtn = (active: boolean) =>
  `rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
    active
      ? 'bg-primary text-white shadow-sm'
      : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
  }`

/**
 * Period-scoped finance charts (follow Period filter above):
 * 1) Pie / donut — money mix (collected, expenses, profit/loss, outstanding)
 * 2) Line / bar — collected vs expenses over time buckets in that period
 */
export default function FinanceCharts({
  periodLabel,
  totals,
  series,
}: {
  periodLabel: string
  totals: FleetFinanceTotals
  series: FinanceSeriesPoint[]
}) {
  const [mixType, setMixType] = useState<MixChart>('pie')
  const [trendType, setTrendType] = useState<TrendChart>('bar')
  const [charts, setCharts] = useState<ChartBundle | null>(null)

  useEffect(() => {
    try {
      const mix = localStorage.getItem(MIX_KEY)
      const trend = localStorage.getItem(TREND_KEY)
      if (mix === 'pie' || mix === 'doughnut') setMixType(mix)
      if (trend === 'line' || trend === 'bar') setTrendType(trend)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { ensureChartJs } = await import('@/components/admin/charts/register')
        ensureChartJs()
        const mod = await import('react-chartjs-2')
        if (!cancelled) {
          setCharts({
            Pie: mod.Pie,
            Doughnut: mod.Doughnut,
            Bar: mod.Bar,
            Line: mod.Line,
          })
        }
      } catch {
        /* chart lib failed to load */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function chooseMix(next: MixChart) {
    setMixType(next)
    try {
      localStorage.setItem(MIX_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function chooseTrend(next: TrendChart) {
    setTrendType(next)
    try {
      localStorage.setItem(TREND_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const profit = Math.max(0, totals.net)
  const loss = Math.max(0, -totals.net)
  const hasMix =
    totals.collected > 0 || totals.expenses > 0 || totals.pendingBalance > 0 || profit > 0 || loss > 0
  const hasTrend = series.some((p) => p.collected > 0 || p.expenses > 0 || p.net !== 0)

  const mixData = useMemo(() => {
    const labels: string[] = []
    const values: number[] = []
    const colors: string[] = []
    if (totals.collected > 0) {
      labels.push('Collected')
      values.push(totals.collected)
      colors.push(FINANCE_MONEY_COLORS.collected)
    }
    if (totals.expenses > 0) {
      labels.push('Expenses')
      values.push(totals.expenses)
      colors.push(FINANCE_MONEY_COLORS.expenses)
    }
    if (profit > 0) {
      labels.push('Profit')
      values.push(profit)
      colors.push(FINANCE_MONEY_COLORS.profit)
    }
    if (loss > 0) {
      labels.push('Loss')
      values.push(loss)
      colors.push(FINANCE_MONEY_COLORS.loss)
    }
    if (totals.pendingBalance > 0) {
      labels.push('Outstanding (unpaid)')
      values.push(totals.pendingBalance)
      colors.push(FINANCE_MONEY_COLORS.outstanding)
    }
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 8,
        },
      ],
    }
  }, [totals, profit, loss])

  const trendData = useMemo(
    () => ({
      labels: series.map((p) => p.label),
      datasets: [
        {
          label: 'Collected',
          data: series.map((p) => p.collected),
          borderColor: FINANCE_MONEY_COLORS.collected,
          backgroundColor:
            trendType === 'bar'
              ? FINANCE_MONEY_COLORS.collectedFill
              : FINANCE_MONEY_COLORS.collectedSoft,
          tension: 0.35,
          fill: trendType === 'line',
          borderRadius: 6,
          maxBarThickness: 32,
          pointRadius: trendType === 'line' ? 3 : 0,
        },
        {
          label: 'Expenses',
          data: series.map((p) => p.expenses),
          borderColor: FINANCE_MONEY_COLORS.expenses,
          backgroundColor:
            trendType === 'bar'
              ? FINANCE_MONEY_COLORS.expensesFill
              : FINANCE_MONEY_COLORS.expensesSoft,
          tension: 0.35,
          fill: trendType === 'line',
          borderRadius: 6,
          maxBarThickness: 32,
          pointRadius: trendType === 'line' ? 3 : 0,
        },
        {
          label: 'Profit',
          data: series.map((p) => p.net),
          borderColor: FINANCE_MONEY_COLORS.profit,
          backgroundColor:
            trendType === 'bar' ? FINANCE_MONEY_COLORS.profitFill : FINANCE_MONEY_COLORS.profitSoft,
          tension: 0.35,
          fill: false,
          borderRadius: 6,
          maxBarThickness: 32,
          pointRadius: trendType === 'line' ? 3 : 0,
        },
      ],
    }),
    [series, trendType],
  )

  const mixOptions: ChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, padding: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const n = Number(ctx.raw)
            const total = (ctx.dataset.data as number[]).reduce((s, v) => s + Number(v), 0)
            const pct = total > 0 ? Math.round((n / total) * 100) : 0
            return ` ${ctx.label}: KES ${n.toLocaleString()} (${pct}%)`
          },
        },
      },
    },
  }

  const trendOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, padding: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const y =
              typeof ctx.parsed === 'object' && ctx.parsed && 'y' in ctx.parsed
                ? Number(ctx.parsed.y)
                : Number(ctx.raw)
            return ` ${ctx.dataset.label}: KES ${y.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 40, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(140,146,157,0.15)' },
        ticks: {
          font: { size: 10 },
          callback: (v) => (typeof v === 'number' ? v.toLocaleString() : String(v)),
        },
      },
    },
  }

  const MixChart = mixType === 'pie' ? charts?.Pie : charts?.Doughnut
  const TrendChartComp = trendType === 'line' ? charts?.Line : charts?.Bar

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            Period charts
          </p>
          <p className="text-[12px] text-on-surface-variant">
            Showing <span className="font-semibold text-on-surface">{periodLabel}</span> — switch
            Period above and these update with it.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-bold text-on-surface">Money mix</p>
              <p className="text-[11px] text-on-surface-variant">
                Blue collected · amber expenses · green profit · red outstanding (unpaid hires)
              </p>
            </div>
            <div className={pill} role="group" aria-label="Mix chart type">
              <button type="button" className={pillBtn(mixType === 'pie')} onClick={() => chooseMix('pie')}>
                Pie
              </button>
              <button
                type="button"
                className={pillBtn(mixType === 'doughnut')}
                onClick={() => chooseMix('doughnut')}
              >
                Donut
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            {!MixChart ? (
              <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                Loading chart…
              </p>
            ) : !hasMix ? (
              <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                No money activity in this period.
              </p>
            ) : (
              <MixChart data={mixData} options={mixOptions} />
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-bold text-on-surface">Over time</p>
              <p className="text-[11px] text-on-surface-variant">
                Collected, expenses, and profit across the selected dates
              </p>
            </div>
            <div className={pill} role="group" aria-label="Trend chart type">
              <button
                type="button"
                className={pillBtn(trendType === 'bar')}
                onClick={() => chooseTrend('bar')}
              >
                Bar
              </button>
              <button
                type="button"
                className={pillBtn(trendType === 'line')}
                onClick={() => chooseTrend('line')}
              >
                Line
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            {!TrendChartComp ? (
              <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                Loading chart…
              </p>
            ) : !hasTrend ? (
              <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
                No timed activity in this period.
              </p>
            ) : (
              <TrendChartComp data={trendData} options={trendOptions} />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
