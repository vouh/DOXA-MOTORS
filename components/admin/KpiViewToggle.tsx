'use client'

import { useEffect, useState } from 'react'

export const KPI_VIEW_STORAGE_KEY = 'doxa-kpi-view'
export const KPI_VIEW_EVENT = 'doxa:kpi-view'

export type KpiViewMode = 'cards' | 'charts'

/** Blue Cards / Charts control for page headers (same row as Add Vehicle, etc.). */
export default function KpiViewToggle({
  storageKey = KPI_VIEW_STORAGE_KEY,
}: {
  storageKey?: string
} = {}) {
  const [view, setView] = useState<KpiViewMode>('cards')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === 'cards' || saved === 'charts') setView(saved)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  function select(next: KpiViewMode) {
    setView(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent(KPI_VIEW_EVENT, { detail: { view: next, storageKey } }),
    )
  }

  return (
    <div
      className="inline-flex h-9 shrink-0 items-center rounded-lg border border-primary/25 bg-primary/[0.04] p-0.5 dark:border-primary/35 dark:bg-primary/10"
      role="group"
      aria-label="KPI view"
    >
      <button
        type="button"
        onClick={() => select('cards')}
        className={`h-7 rounded-md px-3 text-[12px] font-semibold transition-all ${
          view === 'cards'
            ? 'bg-primary text-white shadow-sm'
            : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
        }`}
      >
        Cards
      </button>
      <button
        type="button"
        onClick={() => select('charts')}
        className={`h-7 rounded-md px-3 text-[12px] font-semibold transition-all ${
          view === 'charts'
            ? 'bg-primary text-white shadow-sm'
            : 'text-primary/70 hover:text-primary dark:text-[#7eb0ff]/70'
        }`}
      >
        Charts
      </button>
    </div>
  )
}
