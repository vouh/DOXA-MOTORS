'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  bulkDeleteCarExpenses,
  deleteCarExpense,
  recordCarExpense,
  updateCarExpense,
} from '@/app/actions/car-hire'
import type { VehicleExpenseRow, VehicleFinanceSummary } from '@/lib/intelligence/finance-types'

const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repairs',
  'Tyres',
  'Insurance',
  'Fuel',
  'Parking',
  'Other',
] as const

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

function kes(n: number) {
  return `KES ${Math.abs(n).toLocaleString()}`
}

function ymd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function VehicleCostsPanel({
  vehicleId,
  canExpense,
}: {
  vehicleId: string
  canExpense: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [summary, setSummary] = useState<VehicleFinanceSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<VehicleExpenseRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/admin/intelligence/finance?vehicleId=${encodeURIComponent(vehicleId)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        vehicle?: VehicleFinanceSummary
      }
      if (!res.ok || !data.ok || !data.vehicle) {
        setLoadError(data.error || 'Could not load vehicle costs.')
        return
      }
      setSummary(data.vehicle)
      setSelectedIds([])
    } catch {
      setLoadError('Could not load vehicle costs.')
    }
  }, [vehicleId])

  useEffect(() => {
    void load()
  }, [load])

  const expenses: VehicleExpenseRow[] = summary?.expenseRows ?? []
  const categoryOptions = editing
    ? Array.from(new Set([...EXPENSE_CATEGORIES, editing.category]))
    : [...EXPENSE_CATEGORIES]
  const allSelected = expenses.length > 0 && selectedIds.length === expenses.length

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-on-surface-variant">
        Costs on this car roll up to the owner’s Payouts summary this month.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-outline-variant px-2.5 py-2">
          <p className={labelCls}>Collected</p>
          <p className="text-[13px] font-semibold tabular-nums">{kes(summary?.collected ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-outline-variant px-2.5 py-2">
          <p className={labelCls}>Expenses</p>
          <p className="text-[13px] font-semibold tabular-nums">{kes(summary?.expenses ?? 0)}</p>
        </div>
      </div>

      {loadError ? (
        <p className="text-xs text-on-error-container">{loadError}</p>
      ) : null}

      {canExpense ? (
        <form
          key={editing?.id ?? 'new'}
          className="rounded-lg border border-outline-variant p-3"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const data = new FormData(form)
            data.set('vehicleId', vehicleId)
            const category = String(data.get('category') || 'Expense').trim()
            if (!String(data.get('description') || '').trim()) {
              data.set('description', category)
            }
            setMessage(null)
            setError(null)
            startTransition(async () => {
              if (editing) data.set('expenseId', editing.id)
              const result = editing
                ? await updateCarExpense(data)
                : await recordCarExpense(data)
              if (!result.ok) {
                setError(result.message)
                return
              }
              setMessage(result.message)
              setEditing(null)
              form.reset()
              void load()
            })
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {editing ? 'Edit expense' : 'Record expense'}
            </p>
            {editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setError(null)
                  setMessage(null)
                }}
                className="text-[11px] font-semibold text-on-surface-variant hover:text-primary"
              >
                Cancel
              </button>
            ) : null}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label>
              <span className={labelCls}>Category *</span>
              <select
                className={field}
                name="category"
                required
                defaultValue={editing?.category ?? 'Maintenance'}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Date *</span>
              <input
                className={field}
                name="incurredAt"
                type="date"
                required
                defaultValue={editing?.incurredAt ?? ymd()}
              />
            </label>
            <label>
              <span className={labelCls}>Amount (KES) *</span>
              <input
                className={field}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={editing?.amount ?? ''}
              />
            </label>
          </div>
          {error ? <p className="mt-2 text-xs text-on-error-container">{error}</p> : null}
          {message ? <p className="mt-2 text-xs text-green-800">{message}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Saving…' : editing ? 'Update expense' : 'Save expense'}
          </button>
        </form>
      ) : null}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            This month
          </p>
          {canExpense && selectedIds.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Delete ${selectedIds.length} selected expense(s)?`)) return
                setError(null)
                startTransition(async () => {
                  const data = new FormData()
                  for (const id of selectedIds) data.append('expenseIds', id)
                  const result = await bulkDeleteCarExpenses(data)
                  if (!result.ok) {
                    setError(result.message)
                    return
                  }
                  setMessage(result.message)
                  setSelectedIds([])
                  void load()
                })
              }}
              className="inline-flex items-center gap-1 rounded-md bg-[#E90809]/10 px-2 py-1 text-[11px] font-semibold text-[#E90809] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
              Delete {selectedIds.length}
            </button>
          ) : null}
        </div>
        {expenses.length ? (
          <ul className="mt-2 divide-y divide-outline-variant/70 rounded-lg border border-outline-variant">
            {canExpense ? (
              <li className="flex items-center gap-2 bg-surface-container/40 px-3 py-1.5 text-[11px]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelectedIds(allSelected ? [] : expenses.map((r) => r.id))
                  }
                  aria-label="Select all expenses"
                  className="rounded border-outline-variant"
                />
                <span className="text-on-surface-variant">Select all</span>
              </li>
            ) : null}
            {expenses.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
                <div className="flex min-w-0 items-center gap-2">
                  {canExpense ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(row.id)
                            ? prev.filter((x) => x !== row.id)
                            : [...prev, row.id],
                        )
                      }
                      aria-label={`Select ${row.category}`}
                      className="rounded border-outline-variant"
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold">{row.category}</p>
                    <p className="text-[11px] text-on-surface-variant">{row.incurredAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-1 font-semibold tabular-nums">{kes(row.amount)}</span>
                  {canExpense ? (
                    <>
                      <button
                        type="button"
                        title="Edit expense"
                        onClick={() => {
                          setEditing(row)
                          setError(null)
                          setMessage(null)
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-primary/10 hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        title="Delete expense"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm('Delete this expense?')) return
                          setError(null)
                          startTransition(async () => {
                            const data = new FormData()
                            data.set('expenseId', row.id)
                            const result = await deleteCarExpense(data)
                            if (!result.ok) {
                              setError(result.message)
                              return
                            }
                            setMessage(result.message)
                            void load()
                          })
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-[#E90809]/10 hover:text-[#E90809] disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-on-surface-variant">No expenses on this car this month.</p>
        )}
      </div>
    </div>
  )
}
