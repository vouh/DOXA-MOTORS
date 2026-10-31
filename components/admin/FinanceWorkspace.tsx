'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { bulkDeleteCarExpenses, deleteCarExpense, recordCarExpense, updateCarExpense } from '@/app/actions/car-hire'
import type { FinancePaymentRow, FleetVehicleFinanceCard } from '@/lib/intelligence/fleet-finance'
import { StatusPill } from '@/components/admin/ui'

const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repairs',
  'Tyres',
  'Insurance',
  'Fuel',
  'Parking',
  'Other',
] as const

type ExpenseDraft = {
  id?: string
  category: string
  amount: number
  incurredAt: string
}

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant'

function kes(n: number) {
  const sign = n < 0 ? '−' : ''
  return `${sign}KES ${Math.abs(n).toLocaleString()}`
}

function fmtWhen(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function ymdToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtExpenseDate(ymd: string) {
  const d = new Date(`${ymd}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function PaymentEye({ payment }: { payment: FinancePaymentRow }) {
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-2xl dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-2 border-b border-outline-variant px-4 py-3 dark:border-[#1e3a5f]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E90809]">
                    Payment
                  </p>
                  <h2 id={titleId} className="text-base font-bold text-on-surface">
                    {kes(payment.amount)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-error/10 hover:text-[#E90809]"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <dl className="space-y-2.5 px-4 py-4 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Status</dt>
                  <dd>
                    <StatusPill status={payment.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Method</dt>
                  <dd className="font-semibold">{payment.method}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">When</dt>
                  <dd className="tabular-nums">{fmtWhen(payment.paidAt ?? payment.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">M-Pesa ref</dt>
                  <dd className="font-mono text-[12px]">{payment.mpesaRef ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Phone</dt>
                  <dd>{payment.phone ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Client</dt>
                  <dd className="text-right font-semibold">{payment.clientName ?? 'Unlinked'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Vehicle</dt>
                  <dd className="text-right">{payment.vehicleLabel ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Booking</dt>
                  <dd className="font-mono text-[12px]">{payment.bookingRef ?? '—'}</dd>
                </div>
                {payment.notes ? (
                  <div>
                    <dt className="mb-0.5 text-on-surface-variant">Notes</dt>
                    <dd className="rounded-lg bg-surface-container px-2.5 py-2 text-[12px]">
                      {payment.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {payment.bookingId ? (
                <div className="border-t border-outline-variant px-4 py-3 dark:border-[#1e3a5f]">
                  <a
                    href={`/admin/bookings`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">event</span>
                    Open bookings (ref {payment.bookingRef})
                  </a>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View payment"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary dark:border-[#1e3a5f]"
      >
        <span className="material-symbols-outlined text-[18px]">visibility</span>
      </button>
      {modal}
    </>
  )
}

function VehicleExpenseForm({
  vehicleId,
  regNumber,
  draft,
  onDone,
  onCancel,
}: {
  vehicleId: string
  regNumber: string
  draft: ExpenseDraft | null
  onDone: () => void
  onCancel?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const editing = Boolean(draft?.id)
  const formKey = draft?.id ?? 'new'
  const categoryOptions = Array.from(
    new Set([
      ...EXPENSE_CATEGORIES,
      ...(draft?.category ? [draft.category] : []),
    ]),
  )

  return (
    <form
      key={formKey}
      className="mt-3 space-y-2 rounded-lg border border-dashed border-outline-variant bg-surface-container/40 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const data = new FormData(form)
        data.set('vehicleId', vehicleId)
        const category = String(data.get('category') || 'Expense').trim()
        if (!String(data.get('description') || '').trim()) {
          data.set('description', category)
        }
        setError(null)
        setMessage(null)
        startTransition(async () => {
          if (editing && draft?.id) data.set('expenseId', draft.id)
          const result = editing ? await updateCarExpense(data) : await recordCarExpense(data)
          if (!result.ok) {
            setError(result.message)
            return
          }
          setMessage(result.message)
          if (!editing) form.reset()
          onDone()
        })
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-on-surface">
          {editing ? 'Edit expense' : 'Add expense'} · {regNumber}
        </p>
        {editing && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-semibold text-on-surface-variant hover:text-primary"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Category *</span>
          <select
            className={field}
            name="category"
            required
            defaultValue={draft?.category ?? 'Maintenance'}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Amount *</span>
          <input
            className={field}
            name="amount"
            type="number"
            min=".01"
            step=".01"
            required
            placeholder="0.00"
            defaultValue={draft?.amount ?? ''}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Date *</span>
          <input
            className={field}
            name="incurredAt"
            type="date"
            required
            defaultValue={draft?.incurredAt ?? ymdToday()}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#C50000] disabled:opacity-60"
          >
            {pending ? 'Saving…' : editing ? 'Update expense' : 'Save expense'}
          </button>
        </div>
      </div>
      {error ? <p className="text-[11px] text-[#E90809]">{error}</p> : null}
      {message ? <p className="text-[11px] text-green-700">{message}</p> : null}
    </form>
  )
}

function VehicleEye({
  card,
  canExpense,
}: {
  card: FleetVehicleFinanceCard
  canExpense: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletePending, startDelete] = useTransition()
  const [listError, setListError] = useState<string | null>(null)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setSelectedIds([])
    setListError(null)
  }, [open, card.vehicleId])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const profitPositive = card.profit >= 0
  const allSelected =
    card.expenseRows.length > 0 && selectedIds.length === card.expenseRows.length

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : card.expenseRows.map((r) => r.id))
  }

  const runDeleteOne = (id: string) => {
    if (!window.confirm('Delete this expense?')) return
    setListError(null)
    startDelete(async () => {
      const data = new FormData()
      data.set('expenseId', id)
      const result = await deleteCarExpense(data)
      if (!result.ok) {
        setListError(result.message)
        return
      }
      setSelectedIds((prev) => prev.filter((x) => x !== id))
      router.refresh()
    })
  }

  const runBulkDelete = () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Delete ${selectedIds.length} selected expense(s)?`)) return
    setListError(null)
    startDelete(async () => {
      const data = new FormData()
      for (const id of selectedIds) data.append('expenseIds', id)
      const result = await bulkDeleteCarExpenses(data)
      if (!result.ok) {
        setListError(result.message)
        return
      }
      setSelectedIds([])
      router.refresh()
    })
  }

  const startAddExpense = () => {
    setExpenseDraft(null)
    setShowExpense(true)
  }

  const startEditExpense = (row: FleetVehicleFinanceCard['expenseRows'][number]) => {
    setExpenseDraft({
      id: row.id,
      category: row.category,
      amount: row.amount,
      incurredAt: row.incurredAt,
    })
    setShowExpense(true)
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 max-h-[min(92vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-2xl dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-2 border-b border-outline-variant px-4 py-3 dark:border-[#1e3a5f]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E90809]">
                    Vehicle
                  </p>
                  <h2 id={titleId} className="text-base font-bold text-on-surface">
                    {card.regNumber}
                  </h2>
                  <p className="text-[12px] text-on-surface-variant">
                    {card.label} · {card.ownerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-error/10 hover:text-[#E90809]"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="thin-theme-scroll max-h-[min(70vh,520px)] space-y-3 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-surface-container/60 px-2.5 py-2 dark:bg-white/5">
                    <p className={labelCls}>Earned</p>
                    <p className="text-[13px] font-semibold tabular-nums">{kes(card.collected)}</p>
                    <p className="text-[10px] text-on-surface-variant">{card.paymentCount} payments</p>
                  </div>
                  <div className="rounded-lg bg-surface-container/60 px-2.5 py-2 dark:bg-white/5">
                    <p className={labelCls}>Expenses</p>
                    <p className="text-[13px] font-semibold tabular-nums">{kes(card.expenses)}</p>
                    <p className="text-[10px] text-on-surface-variant">{card.expenseCount} costs</p>
                  </div>
                  <div className="rounded-lg bg-surface-container/60 px-2.5 py-2 dark:bg-white/5">
                    <p className={labelCls}>Pending balance</p>
                    <p className="text-[13px] font-semibold tabular-nums text-[#E90809]">
                      {kes(card.pendingBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-container/60 px-2.5 py-2 dark:bg-white/5">
                    <p className={labelCls}>Profit</p>
                    <p
                      className={`text-[13px] font-semibold tabular-nums ${
                        profitPositive ? 'text-green-700 dark:text-green-400' : 'text-[#E90809]'
                      }`}
                    >
                      {kes(card.profit)}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-on-surface-variant">
                  Billed (touched hires):{' '}
                  <span className="font-semibold text-on-surface">{kes(card.billed)}</span>
                </p>

                <div className="border-t border-outline-variant pt-3 dark:border-[#1e3a5f]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      Expenses this period
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {canExpense && selectedIds.length > 0 ? (
                        <button
                          type="button"
                          disabled={deletePending}
                          onClick={runBulkDelete}
                          className="inline-flex items-center gap-1 rounded-md bg-[#E90809]/10 px-2 py-1 text-[11px] font-semibold text-[#E90809] hover:bg-[#E90809]/15 disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                          Delete {selectedIds.length}
                        </button>
                      ) : null}
                      {canExpense ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (showExpense && !expenseDraft?.id) {
                              setShowExpense(false)
                              return
                            }
                            startAddExpense()
                          }}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {showExpense && !expenseDraft?.id ? 'expand_less' : 'add_circle'}
                          </span>
                          {showExpense && !expenseDraft?.id ? 'Hide form' : 'Add expense'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {listError ? (
                    <p className="mt-2 text-[11px] text-[#E90809]">{listError}</p>
                  ) : null}

                  {card.expenseRows.length > 0 ? (
                    <ul className="mt-2 divide-y divide-outline-variant/70 rounded-lg border border-outline-variant dark:divide-[#1e3a5f] dark:border-[#1e3a5f]">
                      {canExpense ? (
                        <li className="flex items-center gap-2 bg-surface-container/40 px-3 py-1.5 text-[11px] dark:bg-white/5">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all expenses"
                            className="rounded border-outline-variant"
                          />
                          <span className="text-on-surface-variant">Select all</span>
                        </li>
                      ) : null}
                      {card.expenseRows.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {canExpense ? (
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(row.id)}
                                onChange={() => toggleSelect(row.id)}
                                aria-label={`Select ${row.category}`}
                                className="rounded border-outline-variant"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="font-semibold text-on-surface">{row.category}</p>
                              <p className="text-[11px] text-on-surface-variant">
                                {fmtExpenseDate(row.incurredAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="mr-1 font-semibold tabular-nums">{kes(row.amount)}</span>
                            {canExpense ? (
                              <>
                                <button
                                  type="button"
                                  title="Edit expense"
                                  onClick={() => startEditExpense(row)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-primary/10 hover:text-primary"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button
                                  type="button"
                                  title="Delete expense"
                                  disabled={deletePending}
                                  onClick={() => runDeleteOne(row.id)}
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
                    <p className="mt-2 text-[12px] text-on-surface-variant">
                      No expenses in this period.
                    </p>
                  )}

                  {canExpense && showExpense ? (
                    <VehicleExpenseForm
                      vehicleId={card.vehicleId}
                      regNumber={card.regNumber}
                      draft={expenseDraft}
                      onCancel={
                        expenseDraft?.id
                          ? () => {
                              setExpenseDraft(null)
                              setShowExpense(false)
                            }
                          : undefined
                      }
                      onDone={() => {
                        setExpenseDraft(null)
                        setShowExpense(false)
                        router.refresh()
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowExpense(false)
          setExpenseDraft(null)
          setOpen(true)
        }}
        title="View vehicle"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary dark:border-[#1e3a5f]"
      >
        <span className="material-symbols-outlined text-[18px]">visibility</span>
      </button>
      {modal}
    </>
  )
}

export type { FinanceViewMode } from '@/components/admin/FinancePeriodBar'

export default function FinanceWorkspace({
  view,
  payments,
  vehicles,
  canExpense,
}: {
  view: 'payments' | 'vehicles'
  payments: FinancePaymentRow[]
  vehicles: FleetVehicleFinanceCard[]
  canExpense: boolean
}) {
  if (view === 'vehicles') {
    return (
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-white dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-outline-variant bg-surface-container/50 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:border-[#1e3a5f]">
              <tr>
                <th className="px-3 py-2.5">Vehicle</th>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5 text-right">Earned</th>
                <th className="px-3 py-2.5 text-right">Expenses</th>
                <th className="px-3 py-2.5 text-right">Pending</th>
                <th className="px-3 py-2.5 text-right">Profit</th>
                <th className="px-3 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant dark:divide-[#1e3a5f]">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-on-surface-variant">
                    No vehicles in fleet.
                  </td>
                </tr>
              ) : (
                vehicles.map((card) => (
                  <tr key={card.vehicleId} className="hover:bg-surface-container/40">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-on-surface">{card.regNumber}</p>
                      <p className="text-[10px] text-on-surface-variant">{card.label}</p>
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">{card.ownerName}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {kes(card.collected)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{kes(card.expenses)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[#E90809]">
                      {kes(card.pendingBalance)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                        card.profit >= 0
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-[#E90809]'
                      }`}
                    >
                      {kes(card.profit)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <VehicleEye card={card} canExpense={canExpense} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-white dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="border-b border-outline-variant bg-surface-container/50 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:border-[#1e3a5f]">
            <tr>
              <th className="px-3 py-2.5">When</th>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Vehicle</th>
              <th className="px-3 py-2.5">Method</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant dark:divide-[#1e3a5f]">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-on-surface-variant">
                  No payments in this period.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container/40">
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-on-surface-variant">
                    {fmtWhen(p.paidAt ?? p.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-on-surface">
                    {p.clientName ?? (
                      <span className="text-on-surface-variant">Unlinked</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {p.vehicleLabel ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold">{p.method}</span>
                    {p.mpesaRef ? (
                      <span className="mt-0.5 block font-mono text-[10px] text-on-surface-variant">
                        {p.mpesaRef}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {kes(p.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <PaymentEye payment={p} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
