'use client'

import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  cancelCarBooking,
  checkInCarBooking,
  dispatchCarBooking,
  extendCarBooking,
  recordCarPayment,
} from '@/app/actions/car-hire'
import { recalculateBookingLoyaltyAction } from '@/app/actions/settings'
import { latenessPenalty } from '@/lib/car-hire/calculations'
import ExtraChargesFields, {
  CommentBox,
  extraRowsTotal,
  newExtraChargeRow,
  type ExtraChargeRow,
} from '@/components/admin/ExtraChargesFields'
import { StatusPill } from '@/components/admin/ui'

export type BookingPaymentRow = {
  id: string
  amount: number
  method: string
  mpesaRef: string | null
  paidAt: string | null
  status: string
}

export type BookingCheckRow = {
  stage: string
  dentsNotes: string | null
  fuelLevel: number | null
  odometer: number | null
  checkedBy: string | null
  createdAt: string
}

export type BookingPenaltyRuleSnap = {
  graceMinutes: number
  rate: number
  rateUnit: 'HOUR' | 'DAY'
  cap: number | null
} | null

export type BookingPenaltyRow = {
  minutesLate: number
  amount: number
  calculationNotes: string
  createdAt: string
}

export type BookingExtraRow = {
  stage: string
  description: string
  amount: number
}

export type BookingDetails = {
  id: string
  reference: string
  status: string
  clientName: string
  clientPhone: string
  vehicleLabel: string
  startAt: string
  expectedReturnAt: string
  dispatchedAt: string | null
  returnedAt: string | null
  days: number
  dailyRate: number
  baseCharge: number
  additionalCharge: number
  penaltyAmount: number
  totalCharge: number
  dispatchNotes: string | null
  returnNotes: string | null
  extraCharges: BookingExtraRow[]
  paid: number
  balance: number
  payments: BookingPaymentRow[]
  checks: BookingCheckRow[]
  penalties: BookingPenaltyRow[]
  penaltyRule: BookingPenaltyRuleSnap
}

type Tab = 'overview' | 'dispatch' | 'checkin' | 'extend' | 'payment' | 'cancel'

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const label =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

function defaultTab(status: string): Tab {
  if (status === 'RESERVED') return 'dispatch'
  if (status === 'DISPATCHED' || status === 'OVERDUE') return 'checkin'
  return 'overview'
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hireIntel(booking: BookingDetails): { tone: 'ok' | 'soon' | 'overdue' | 'done'; text: string } {
  if (booking.status === 'RETURNED') {
    return { tone: 'done', text: 'Returned — overdue counter stopped' }
  }
  if (booking.status === 'CANCELLED') {
    return { tone: 'done', text: 'Cancelled' }
  }
  if (booking.status === 'RESERVED') {
    return { tone: 'ok', text: 'Reserved — not yet dispatched' }
  }
  const due = new Date(booking.expectedReturnAt).getTime()
  const now = Date.now()
  if (booking.status === 'OVERDUE' || due < now) {
    return {
      tone: 'overdue',
      text: `Overdue — due ${new Date(booking.expectedReturnAt).toLocaleString()}`,
    }
  }
  if (due - now <= 2 * 60 * 60 * 1000) {
    return {
      tone: 'soon',
      text: `Ending soon — due ${new Date(booking.expectedReturnAt).toLocaleString()}`,
    }
  }
  return {
    tone: 'ok',
    text: `On time — due ${new Date(booking.expectedReturnAt).toLocaleString()}`,
  }
}

export default function BookingViewButton({ booking }: { booking: BookingDetails }) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>(() => defaultTab(booking.status))
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [returnAt, setReturnAt] = useState(() => toLocalInputValue(new Date().toISOString()))
  const [extras, setExtras] = useState<ExtraChargeRow[]>([])

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, pending])

  function close() {
    if (pending) return
    setOpen(false)
    setError(null)
    setMessage(null)
  }

  function openModal() {
    setTab(defaultTab(booking.status))
    setError(null)
    setMessage(null)
    setReturnAt(toLocalInputValue(new Date().toISOString()))
    setExtras([])
    setOpen(true)
  }

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message)
      router.refresh()
      window.setTimeout(close, 800)
    })
  }

  const canDispatch = booking.status === 'RESERVED'
  const canCheckIn = booking.status === 'DISPATCHED' || booking.status === 'OVERDUE'
  const canExtend = canCheckIn
  const canCancel = booking.status === 'RESERVED'

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'dispatch', label: 'Dispatch', show: canDispatch },
    { id: 'checkin', label: 'Mark returned', show: canCheckIn },
    { id: 'extend', label: 'Extend', show: canExtend },
    { id: 'payment', label: 'Payment', show: true },
    { id: 'cancel', label: 'Cancel', show: canCancel },
  ]

  const intel = hireIntel(booking)
  const dispatchCheck = booking.checks.find((c) => c.stage === 'DISPATCH')
  const returnCheck = booking.checks.find((c) => c.stage === 'RETURN')

  const latePreview = useMemo(() => {
    if (!booking.penaltyRule || !returnAt) return null
    const actual = new Date(returnAt)
    if (Number.isNaN(actual.getTime())) return null
    return latenessPenalty(
      new Date(booking.expectedReturnAt),
      actual,
      booking.penaltyRule,
    )
  }, [booking.expectedReturnAt, booking.penaltyRule, returnAt])

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm dark:bg-black/60"
              onClick={close}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Booking
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <h2
                      id={titleId}
                      className="font-mono text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                    >
                      {booking.reference}
                    </h2>
                    <StatusPill status={booking.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                    {booking.clientName} · {booking.vehicleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809]"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-2 border-b border-outline-variant px-5 py-3 dark:border-[#1e3a5f]">
                <HireFeesPanel booking={booking} />
                {booking.extraCharges?.length ? (
                  <ul className="rounded-lg border border-outline-variant px-3 py-2 text-[12px] dark:border-[#1e3a5f]">
                    {booking.extraCharges.map((row) => (
                      <li key={`${row.stage}-${row.description}`} className="flex justify-between gap-2">
                        <span>
                          {row.stage === 'RETURN' ? 'Return' : 'Booking'}: {row.description}
                        </span>
                        <span className="font-semibold">KES {row.amount.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div
                  className={`rounded-lg px-3 py-2 text-[12px] font-semibold ${
                    intel.tone === 'overdue'
                      ? 'bg-[#E90809]/12 text-[#E90809]'
                      : intel.tone === 'soon'
                        ? 'bg-primary/10 text-primary'
                        : intel.tone === 'done'
                          ? 'bg-surface-container text-on-surface-variant'
                          : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                  }`}
                >
                  This hire: {intel.text}
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-outline-variant px-3 pt-2 dark:border-[#1e3a5f]">
                {tabs
                  .filter((t) => t.show)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTab(t.id)
                        setError(null)
                        setMessage(null)
                      }}
                      className={`shrink-0 rounded-t-lg px-3 py-2 text-[12px] font-semibold transition ${
                        tab === t.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
              </div>

              <div className="thin-theme-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {error ? (
                  <p className="mb-3 rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 text-sm text-on-error-container">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="mb-3 rounded-lg border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {message}
                  </p>
                ) : null}

                {tab === 'overview' ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Info label="Client" value={`${booking.clientName} · ${booking.clientPhone}`} />
                      <Info label="Vehicle" value={booking.vehicleLabel} />
                      <Info
                        label="Period"
                        value={`${new Date(booking.startAt).toLocaleString()} → ${new Date(booking.expectedReturnAt).toLocaleString()}`}
                      />
                      <Info
                        label="Days"
                        value={`${booking.days} · KES ${booking.dailyRate.toLocaleString()}/day`}
                      />
                      {booking.dispatchedAt ? (
                        <Info
                          label="Dispatched"
                          value={new Date(booking.dispatchedAt).toLocaleString()}
                        />
                      ) : null}
                      {booking.returnedAt ? (
                        <Info label="Returned" value={new Date(booking.returnedAt).toLocaleString()} />
                      ) : null}
                    </div>
                    {booking.status === 'RETURNED' ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() => recalculateBookingLoyaltyAction(booking.id))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Recalculate loyalty points
                      </button>
                    ) : null}
                    {booking.penalties.length ? (
                      <div>
                        <p className={label}>Late penalty trail</p>
                        <ul className="space-y-2">
                          {booking.penalties.map((p, i) => (
                            <li
                              key={`${p.createdAt}-${i}`}
                              className="rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-[#1e3a5f]"
                            >
                              <p className="font-semibold text-[#E90809]">
                                KES {p.amount.toLocaleString()} · {p.minutesLate} min late
                              </p>
                              <p className="text-on-surface-variant">{p.calculationNotes}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {booking.checks.length ? (
                      <div>
                        <p className={label}>Condition checks</p>
                        {dispatchCheck && returnCheck ? (
                          <div className="mb-2 grid gap-2 sm:grid-cols-2">
                            <ConditionCard title="Outbound (dispatch)" check={dispatchCheck} />
                            <ConditionCard title="Return" check={returnCheck} />
                          </div>
                        ) : null}
                        <ul className="space-y-2">
                          {booking.checks.map((c) => (
                            <li
                              key={`${c.stage}-${c.createdAt}`}
                              className="rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-[#1e3a5f]"
                            >
                              <p className="font-semibold text-primary">{c.stage}</p>
                              <p className="text-on-surface-variant">
                                {c.dentsNotes || '—'} · Fuel {c.fuelLevel ?? '—'}% · Odo{' '}
                                {c.odometer ?? '—'} km
                              </p>
                              <p className="text-[11px] text-on-surface-variant">
                                {c.checkedBy || '—'} · {new Date(c.createdAt).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {booking.payments.length ? (
                      <div>
                        <p className={label}>Payments</p>
                        <ul className="space-y-1.5">
                          {booking.payments.map((p) => (
                            <li
                              key={p.id}
                              className="flex justify-between gap-2 text-sm text-on-surface-variant"
                            >
                              <span>
                                {p.method}
                                {p.mpesaRef ? ` · ${p.mpesaRef}` : ''} · {p.status}
                              </span>
                              <span className="font-semibold text-on-surface">
                                KES {p.amount.toLocaleString()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {tab === 'dispatch' && canDispatch ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const data = new FormData(e.currentTarget)
                      run(() => dispatchCarBooking(booking.id, data))
                    }}
                  >
                    <p className="text-sm text-on-surface-variant">
                      Record vehicle condition, then release to the client. No document upload here.
                    </p>
                    <label>
                      <span className={label}>Existing dents / marks *</span>
                      <textarea
                        className={field}
                        name="dentsNotes"
                        required
                        rows={3}
                        placeholder='Describe marks, or type "None"'
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className={label}>Fuel % (0–100) *</span>
                        <input
                          className={field}
                          name="fuelLevel"
                          type="number"
                          min="0"
                          max="100"
                          required
                        />
                      </label>
                      <label>
                        <span className={label}>Odometer (km) *</span>
                        <input className={field} name="odometer" type="number" min="0" required />
                      </label>
                    </div>
                    <input type="hidden" name="componentsOk" value="true" />
                    <button
                      type="submit"
                      disabled={pending}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C50000] disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                      {pending ? 'Releasing…' : 'Record condition & release'}
                    </button>
                  </form>
                ) : null}

                {tab === 'checkin' && canCheckIn ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const data = new FormData(e.currentTarget)
                      run(() => checkInCarBooking(booking.id, data))
                    }}
                  >
                    <p className="text-sm text-on-surface-variant">
                      End the hire: record return condition, apply late penalty if any, stop the
                      overdue counter.
                    </p>
                    {dispatchCheck ? (
                      <div className="rounded-lg border border-outline-variant bg-surface-container-low/50 px-3 py-2 text-sm dark:border-[#1e3a5f]">
                        <p className={label}>Outbound (dispatch) — compare</p>
                        <p className="text-on-surface">
                          {dispatchCheck.dentsNotes || '—'} · Fuel {dispatchCheck.fuelLevel ?? '—'}% ·
                          Odo {dispatchCheck.odometer ?? '—'} km
                        </p>
                      </div>
                    ) : null}
                    <label>
                      <span className={label}>Actual return *</span>
                      <input
                        className={field}
                        name="actualReturnAt"
                        type="datetime-local"
                        required
                        value={returnAt}
                        onChange={(e) => setReturnAt(e.target.value)}
                      />
                    </label>
                    <label>
                      <span className={label}>Return dents / marks *</span>
                      <textarea
                        className={field}
                        name="dentsNotes"
                        required
                        rows={3}
                        placeholder='Describe return condition, or type "None"'
                      />
                    </label>
                    <label className="flex items-start gap-2 text-sm text-on-surface">
                      <input type="checkbox" name="newDamage" value="true" className="mt-1" />
                      <span>New damage vs outbound (will be recorded on this hire)</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className={label}>Fuel % *</span>
                        <input
                          className={field}
                          name="fuelLevel"
                          type="number"
                          min="0"
                          max="100"
                          required
                        />
                      </label>
                      <label>
                        <span className={label}>Odometer *</span>
                        <input className={field} name="odometer" type="number" min="0" required />
                      </label>
                    </div>
                    <label>
                      <span className={label}>Condition rating (1–5) *</span>
                      <select className={field} name="conditionRating" required defaultValue="5">
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>
                            {r} {r <= 2 ? '(needs decrease comment)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={label}>Decrease comment (required if rating ≤ 2)</span>
                      <CommentBox
                        name="decreaseComment"
                        rows={2}
                        placeholder="Describe issues that lowered the rating"
                      />
                    </label>
                    <label>
                      <span className={label}>Return notes</span>
                      <CommentBox
                        name="returnNotes"
                        placeholder="Optional — e.g. they split fuel. Line breaks are fine."
                      />
                    </label>
                    <ExtraChargesFields
                      rows={extras}
                      onChange={setExtras}
                      hint="Optional extras on return — fuel, cleaning, a split, or damage add-on."
                    />
                    <p className="text-[11px] text-on-surface-variant">
                      Loyalty points are awarded only after this hire is returned, fully paid (balance
                      0), and the client is active.
                    </p>
                    <input type="hidden" name="componentsOk" value="true" />
                    {latePreview ? (
                      <div className="rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-[#1e3a5f]">
                        <p className={label}>Late penalty preview</p>
                        {latePreview.amount > 0 ? (
                          <p className="font-semibold text-[#E90809]">
                            KES {latePreview.amount.toLocaleString()} — {latePreview.notes}
                          </p>
                        ) : (
                          <p className="text-on-surface-variant">
                            No late penalty for this return time
                            {booking.penaltyRule
                              ? ` (${booking.penaltyRule.graceMinutes} min grace).`
                              : ' (no rule on this booking).'}
                          </p>
                        )}
                      </div>
                    ) : !booking.penaltyRule ? (
                      <p className="text-sm text-amber-700">
                        No penalty rule was snapshotted on this booking — late fee will be KES 0.
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={pending}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                      {pending ? 'Ending hire…' : 'Mark returned / End hire'}
                    </button>
                  </form>
                ) : null}

                {tab === 'extend' && canExtend ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const data = new FormData(e.currentTarget)
                      run(() => extendCarBooking(booking.id, data))
                    }}
                  >
                    <p className="text-sm text-on-surface-variant">
                      Extra days are charged at this booking&apos;s daily rate (KES{' '}
                      {booking.dailyRate.toLocaleString()}/day) — not the late-penalty rule.
                    </p>
                    <Info
                      label="Current expected return"
                      value={new Date(booking.expectedReturnAt).toLocaleString()}
                    />
                    <label>
                      <span className={label}>New return date / time *</span>
                      <input
                        className={field}
                        name="newReturnAt"
                        type="datetime-local"
                        required
                        min={toLocalInputValue(booking.expectedReturnAt)}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={pending}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">update</span>
                      {pending ? 'Extending…' : 'Extend hire'}
                    </button>
                  </form>
                ) : null}

                {tab === 'cancel' && canCancel ? (
                  <div className="grid gap-3">
                    <p className="text-sm text-on-surface-variant">
                      Cancel this reservation before dispatch. The vehicle becomes available again.
                      No late penalty applies.
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => cancelCarBooking(booking.id))}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E90809]/40 bg-[#E90809]/10 px-4 py-2.5 text-sm font-semibold text-[#E90809] transition hover:bg-[#E90809]/20 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      {pending ? 'Cancelling…' : 'Cancel reserved booking'}
                    </button>
                  </div>
                ) : null}

                {tab === 'payment' ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const data = new FormData(e.currentTarget)
                      run(() => recordCarPayment(data))
                    }}
                  >
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <p className="text-sm text-on-surface-variant">
                      Balance due: <strong>KES {booking.balance.toLocaleString()}</strong>
                    </p>
                    <label>
                      <span className={label}>Redeem loyalty points (optional)</span>
                      <input
                        className={field}
                        name="redeemPoints"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span className={label}>Amount (KES) *</span>
                      <input
                        className={field}
                        name="amount"
                        type="number"
                        min=".01"
                        step=".01"
                        required
                        defaultValue={booking.balance > 0 ? booking.balance : undefined}
                      />
                    </label>
                    <label>
                      <span className={label}>Method</span>
                      <select className={field} name="method" defaultValue="MPESA">
                        <option value="MPESA">M-Pesa</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                    <label>
                      <span className={label}>M-Pesa / bank reference</span>
                      <input className={field} name="mpesaRef" placeholder="Optional" />
                    </label>
                    <button
                      type="submit"
                      disabled={pending}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      {pending ? 'Saving…' : 'Save payment'}
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="flex justify-end border-t border-outline-variant px-5 py-3 dark:border-[#1e3a5f]">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container"
                >
                  Close
                </button>
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
        onClick={openModal}
        title="View booking"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 dark:text-[#7eb0ff] dark:hover:bg-primary/20"
      >
        <span className="material-symbols-outlined text-[20px]">visibility</span>
      </button>
      {modal}
    </>
  )
}

function HireFeesPanel({ booking }: { booking: BookingDetails }) {
  const extrasTotal = (booking.extraCharges ?? []).reduce((sum, row) => sum + row.amount, 0)
  const rows = [
    { label: 'Hire (booked days)', value: booking.baseCharge },
    { label: 'Extra costs', value: extrasTotal },
    { label: 'Extensions', value: booking.additionalCharge },
    { label: 'Late penalty', value: booking.penaltyAmount },
    { label: 'Total due', value: booking.totalCharge, strong: true },
    { label: 'Paid', value: booking.paid },
    { label: 'Balance', value: booking.balance, strong: true },
  ]
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 px-3 py-2.5 dark:border-[#1e3a5f]">
      <p className={label}>Hire fees</p>
      <dl className="grid gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-on-surface-variant">{row.label}</dt>
            <dd
              className={
                row.strong ? 'font-bold text-on-surface' : 'font-semibold text-on-surface'
              }
            >
              KES {row.value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ConditionCard({ title, check }: { title: string; check: BookingCheckRow }) {
  return (
    <div className="rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-[#1e3a5f]">
      <p className="font-semibold text-primary">{title}</p>
      <p className="text-on-surface-variant">
        {check.dentsNotes || '—'} · Fuel {check.fuelLevel ?? '—'}% · Odo {check.odometer ?? '—'} km
      </p>
    </div>
  )
}

function Info({ label: l, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={label}>{l}</p>
      <p className="text-sm text-on-surface">{value}</p>
    </div>
  )
}
