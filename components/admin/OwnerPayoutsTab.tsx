'use client'

import { useCallback, useEffect, useState } from 'react'
import { StatusPill } from '@/components/admin/ui'
import {
  approveOwnerPayout,
  generateOwnerPayout,
  markOwnerPayoutPaid,
} from '@/app/actions/owners'
import type {
  FinanceVehicleLine,
  OwnerFinanceSummary,
  OwnerPayoutStatement,
} from '@/lib/intelligence/finance-types'

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

function kes(n: number) {
  const formatted = Math.abs(n).toLocaleString()
  return n < 0 ? `−KES ${formatted}` : `KES ${formatted}`
}

function ymd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthStartYmd() {
  const now = new Date()
  return ymd(new Date(now.getFullYear(), now.getMonth(), 1))
}

export default function OwnerPayoutsTab({
  ownerId,
  canPayout,
  pending,
  onRun,
}: {
  ownerId: string
  canPayout: boolean
  pending: boolean
  onRun: (action: () => Promise<{ ok: boolean; message: string }>) => void
}) {
  const [from, setFrom] = useState(monthStartYmd)
  const [to, setTo] = useState(() => ymd())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [summary, setSummary] = useState<OwnerFinanceSummary | null>(null)
  const [statements, setStatements] = useState<OwnerPayoutStatement[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/admin/intelligence/finance?ownerId=${encodeURIComponent(ownerId)}&from=${from}&to=${to}`,
        { credentials: 'same-origin', cache: 'no-store' },
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        summary?: OwnerFinanceSummary
        statements?: OwnerPayoutStatement[]
      }
      if (!res.ok || !data.ok || !data.summary) {
        setLoadError(data.error || 'Could not load payout summary.')
        return
      }
      setSummary(data.summary)
      setStatements(data.statements ?? [])
    } catch {
      setLoadError('Could not load payout summary.')
    } finally {
      setLoading(false)
    }
  }, [ownerId, from, to])

  useEffect(() => {
    void load()
  }, [load])

  function after(action: () => Promise<{ ok: boolean; message: string }>) {
    onRun(async () => {
      const result = await action()
      if (result.ok) void load()
      return result
    })
  }

  const vehicles: FinanceVehicleLine[] = summary?.vehicles ?? []

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-on-surface-variant">
        Summary from this owner’s vehicles. Record service and other costs on each car under Fleet
        Management. Net uses collected hire money, vehicle expenses, then {summary?.commissionLabel ?? 'commission'}.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className={labelCls}>From</span>
          <input className={field} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex-1">
          <span className={labelCls}>To</span>
          <input className={field} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {loadError ? (
        <p className="rounded-md border border-error/30 bg-error-container/50 px-2.5 py-1.5 text-xs text-on-error-container">
          {loadError}
        </p>
      ) : null}

      {loading && !summary ? (
        <p className="text-[12px] text-on-surface-variant">Loading vehicle totals…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <table className="w-full text-[12px]">
            <thead className="bg-surface-container-low text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-right">Collected</th>
                <th className="px-3 py-2 text-right">Expenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/70">
              {vehicles.map((v) => (
                <tr key={v.vehicleId}>
                  <td className="px-3 py-2 font-semibold">
                    {v.regNumber}
                    <span className="block font-normal text-on-surface-variant">
                      {v.make} {v.model}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{kes(v.collected)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{kes(v.expenses)}</td>
                </tr>
              ))}
              {!vehicles.length ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-on-surface-variant">
                    No vehicles linked.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {summary ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low/40 px-3 py-2">
              <p className="text-[11px] text-on-surface-variant">
                Commission {kes(summary.commission)} · deduction {kes(summary.deductions)}
              </p>
              <p
                className={`text-[13px] font-semibold tabular-nums ${
                  summary.net < 0 ? 'text-[#E90809]' : 'text-on-surface'
                }`}
              >
                Net {kes(summary.net)}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-lg border border-outline-variant p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          Statements
        </p>
        {canPayout ? (
          <button
            type="button"
            disabled={pending || loading}
            onClick={() => after(() => generateOwnerPayout(ownerId, from, to))}
            className="mt-2 inline-flex h-[34px] items-center rounded-lg border border-outline-variant px-3 text-[12px] font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {pending ? 'Working…' : 'Generate statement'}
          </button>
        ) : null}

        {statements.length ? (
          <ul className="mt-3 space-y-2">
            {statements.map((row) => (
              <li key={row.id} className="rounded-lg border border-outline-variant/80 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-on-surface">
                    {row.periodStart} → {row.periodEnd}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[13px] font-semibold tabular-nums ${
                        row.netPay < 0 ? 'text-[#E90809]' : 'text-on-surface'
                      }`}
                    >
                      {kes(row.netPay)}
                    </span>
                    <StatusPill status={row.status} />
                  </div>
                </div>
                {canPayout && row.status === 'DRAFT' ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => after(() => approveOwnerPayout(row.id))}
                    className="mt-2 inline-flex items-center rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                ) : null}
                {canPayout && row.status === 'APPROVED' ? (
                  <form
                    className="mt-2 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (pending) return
                      const data = new FormData(e.currentTarget)
                      data.set('payoutId', row.id)
                      after(() => markOwnerPayoutPaid(data))
                    }}
                  >
                    <input
                      className={field}
                      name="paymentRef"
                      required
                      placeholder="M-Pesa / bank reference *"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                    >
                      Mark paid
                    </button>
                  </form>
                ) : null}
                {row.status === 'PAID' && row.paymentRef ? (
                  <p className="mt-1 text-[11px] text-on-surface-variant">Paid · {row.paymentRef}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-on-surface-variant">No statements yet for this owner.</p>
        )}
      </div>
    </div>
  )
}
