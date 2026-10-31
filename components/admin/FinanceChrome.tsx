'use client'

import { Suspense, useEffect, useState } from 'react'
import type { PeriodPreset } from '@/lib/calendar/period'
import type { KpiItem } from '@/components/admin/KpiPanel'
import KpiPanel from '@/components/admin/KpiPanel'
import FinancePeriodBar, { type FinanceViewMode } from '@/components/admin/FinancePeriodBar'
import FinanceCharts from '@/components/admin/FinanceCharts'
import type { FinanceSeriesPoint, FleetFinanceTotals } from '@/lib/intelligence/fleet-finance'

const KPI_HIDE_KEY = 'doxa-finance-kpi-hidden'

const control =
  'inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-primary/25 bg-primary/[0.04] px-2.5 text-[12px] font-semibold text-primary outline-none transition hover:border-primary/45 hover:bg-primary/[0.08] dark:border-primary/35 dark:bg-primary/10 dark:text-[#7eb0ff] dark:hover:border-primary/55 dark:hover:bg-primary/15'

/** Finance title + filters (incl. Show KPIs) + KPI cards + period charts. */
export default function FinanceChrome({
  period,
  fromYmd,
  toYmd,
  label,
  view,
  kpiItems,
  totals,
  series,
}: {
  period: PeriodPreset
  fromYmd: string
  toYmd: string
  label: string
  view: FinanceViewMode
  kpiItems: KpiItem[]
  totals: FleetFinanceTotals
  series: FinanceSeriesPoint[]
}) {
  const [kpiHidden, setKpiHidden] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KPI_HIDE_KEY) === '1') setKpiHidden(true)
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  function toggleKpis() {
    setKpiHidden((prev) => {
      const next = !prev
      try {
        localStorage.setItem(KPI_HIDE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <>
      <div className="relative flex flex-row flex-wrap items-center justify-between gap-3 pl-3 before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.5 before:rounded-full before:bg-secondary-container/70 before:content-['']">
        <div className="min-w-0 shrink-0">
          <h1 className="font-h3 text-xl font-bold tracking-tight text-on-surface dark:text-blue-50">
            Finance
          </h1>
          <p className="mt-0.5 text-sm text-on-surface-variant dark:text-blue-200/55">
            Cash collected and fleet costs by period
          </p>
        </div>

        <Suspense fallback={<div className="h-9 w-72 animate-pulse rounded-lg bg-surface-container/50" />}>
          <FinancePeriodBar
            period={period}
            fromYmd={fromYmd}
            toYmd={toYmd}
            label={label}
            view={view}
            trailing={
              <>
                <button
                  type="button"
                  onClick={toggleKpis}
                  className={control}
                  aria-expanded={ready ? !kpiHidden : undefined}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {kpiHidden ? 'expand_more' : 'expand_less'}
                  </span>
                  {kpiHidden ? 'Show KPIs' : 'Hide KPIs'}
                </button>
                <a
                  href="/admin/finance/failed"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E90809]/30 bg-[rgba(233,8,9,0.04)] px-3 text-[12px] font-semibold text-[#E90809] transition hover:border-[#E90809] hover:bg-[rgba(233,8,9,0.1)] dark:border-[#E90809]/40 dark:bg-[rgba(233,8,9,0.12)] dark:text-[#ff8a8a]"
                >
                  <span className="material-symbols-outlined text-[16px]">money_off</span>
                  Failed payments
                </a>
              </>
            }
          />
        </Suspense>
      </div>

      {ready && !kpiHidden ? (
        <>
          <FinanceCharts periodLabel={label} totals={totals} series={series} />
          <KpiPanel items={kpiItems} title="" collapsible={false} cardsOnly />
        </>
      ) : null}
    </>
  )
}
