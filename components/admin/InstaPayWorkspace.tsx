'use client'

import { useState, type FormEvent } from 'react'
import {
  initiateInstaStk,
  recordInstaManualPayment,
  reconcileCarPayment,
} from '@/app/actions/car-hire'
import { Card, StatusPill, Th } from '@/components/admin/ui'

const field =
  'w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-0'

const cta =
  'rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,92,240,0.28)] hover:opacity-95 disabled:opacity-60'

export type InstaPaymentRow = {
  id: string
  amount: number
  method: string
  status: string
  phone: string | null
  mpesaRef: string | null
  failureReason: string | null
  notes: string | null
  createdAt: string
  paidAt: string | null
  bookingId: string | null
  bookingRef: string | null
  clientName: string | null
}

export type BookingOption = {
  id: string
  label: string
}

function Feedback({ ok, message }: { ok: boolean | null; message: string }) {
  if (!message) return null
  return (
    <p
      className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}
      role={ok ? 'status' : 'alert'}
    >
      {message}
    </p>
  )
}

function ReconcileButton({
  paymentId,
  bookings,
}: {
  paymentId: string
  bookings: BookingOption[]
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const result = await reconcileCarPayment(new FormData(e.currentTarget))
    setBusy(false)
    setMsg(result.message)
    if (result.ok) setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-primary hover:underline"
      >
        Reconcile
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex min-w-[200px] flex-col gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <select name="bookingId" required className={`${field} text-xs`} defaultValue="">
        <option value="" disabled>
          Select booking…
        </option>
        {bookings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${cta} !px-3 !py-1.5 !text-xs`}>
          {busy ? '…' : 'Link'}
        </button>
        <button
          type="button"
          className="text-xs text-on-surface-variant hover:underline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      <Feedback ok={msg ? msg.includes('reconciled') : null} message={msg} />
    </form>
  )
}

export default function InstaPayWorkspace({
  payments,
  failed,
  bookings,
}: {
  payments: InstaPaymentRow[]
  failed: InstaPaymentRow[]
  bookings: BookingOption[]
}) {
  const [stkMsg, setStkMsg] = useState<{ ok: boolean; message: string } | null>(null)
  const [manualMsg, setManualMsg] = useState<{ ok: boolean; message: string } | null>(null)
  const [stkBusy, setStkBusy] = useState(false)
  const [manualBusy, setManualBusy] = useState(false)

  async function onStk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStkBusy(true)
    setStkMsg(null)
    const form = e.currentTarget
    const result = await initiateInstaStk(new FormData(form))
    setStkBusy(false)
    setStkMsg(result)
    if (result.ok) form.reset()
  }

  async function onManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setManualBusy(true)
    setManualMsg(null)
    const form = e.currentTarget
    const result = await recordInstaManualPayment(new FormData(form))
    setManualBusy(false)
    setManualMsg(result)
    if (result.ok) form.reset()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Prompt STK push
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Send M-Pesa prompt to a client phone. Link to a hire later if needed.
          </p>
          <form onSubmit={onStk} className="mt-4 grid gap-3">
            <label className="block text-xs font-semibold text-on-surface-variant">
              Phone *
              <input
                name="phone"
                required
                placeholder="07… or 254…"
                className={field}
              />
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Amount (KES) *
              <input
                name="amount"
                type="number"
                min=".01"
                step=".01"
                required
                className={field}
              />
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Link booking (optional)
              <select name="bookingId" className={field} defaultValue="">
                <option value="">Reconcile later</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            {stkMsg && <Feedback ok={stkMsg.ok} message={stkMsg.message} />}
            <button type="submit" disabled={stkBusy} className={`${cta} justify-self-start`}>
              {stkBusy ? 'Sending…' : 'Send STK prompt'}
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Add payment manually
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Record cash, M-Pesa, or bank when the client already paid outside STK.
          </p>
          <form onSubmit={onManual} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-on-surface-variant">
              Amount (KES) *
              <input
                name="amount"
                type="number"
                min=".01"
                step=".01"
                required
                className={field}
              />
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Method *
              <select name="method" required className={field} defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
                <option value="BANK">Bank</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Phone / payer
              <input name="phone" className={field} placeholder="Optional" />
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Reference (M-Pesa / bank)
              <input name="mpesaRef" className={field} placeholder="Optional" />
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant sm:col-span-2">
              Booking (optional)
              <select name="bookingId" className={field} defaultValue="">
                <option value="">Reconcile later</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant sm:col-span-2">
              Notes
              <input name="notes" className={field} placeholder="e.g. paid at yard desk" />
            </label>
            {manualMsg && (
              <div className="sm:col-span-2">
                <Feedback ok={manualMsg.ok} message={manualMsg.message} />
              </div>
            )}
            <button
              type="submit"
              disabled={manualBusy}
              className={`${cta} justify-self-start sm:col-span-2`}
            >
              {manualBusy ? 'Saving…' : 'Save payment'}
            </button>
          </form>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="font-semibold text-on-surface">Recent Insta payments</h2>
          <p className="text-xs text-on-surface-variant">
            Successful prompts show Completed. Unlinked rows can be reconciled to a hire.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th
              cols={['When', 'Phone', 'Method', 'Amount', 'Status', 'Booking', 'Action']}
            />
            <tbody className="divide-y divide-outline-variant">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-5 text-on-surface-variant">
                    No payments yet. Send an STK or add a manual payment.
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 whitespace-nowrap">{p.createdAt}</td>
                  <td className="p-3">{p.phone || '—'}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3 font-semibold tabular-nums">
                    {p.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <StatusPill status={p.status} />
                    {p.mpesaRef ? (
                      <p className="mt-0.5 text-[10px] text-on-surface-variant">{p.mpesaRef}</p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {p.bookingRef ? (
                      <span>
                        {p.bookingRef}
                        {p.clientName ? (
                          <span className="block text-[10px] text-on-surface-variant">
                            {p.clientName}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant font-medium">Unlinked</span>
                    )}
                  </td>
                  <td className="p-3">
                    {!p.bookingId ? (
                      <ReconcileButton paymentId={p.id} bookings={bookings} />
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden" id="failed">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="font-semibold text-on-surface">Failed payments</h2>
          <p className="text-xs text-on-surface-variant">
            Reasons from M-Pesa (wrong PIN, cancelled, timeout). Use when a client claims success.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['When', 'Phone', 'Amount', 'Reason', 'Booking', 'Action']} />
            <tbody className="divide-y divide-outline-variant">
              {failed.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-5 text-on-surface-variant">
                    No failed STK payments recorded.
                  </td>
                </tr>
              )}
              {failed.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 whitespace-nowrap">{p.createdAt}</td>
                  <td className="p-3">{p.phone || '—'}</td>
                  <td className="p-3 font-semibold tabular-nums">
                    {p.amount.toLocaleString()}
                  </td>
                  <td className="p-3 text-on-surface-variant font-medium max-w-xs">
                    {p.failureReason || 'Failed (no reason returned)'}
                  </td>
                  <td className="p-3">{p.bookingRef || '—'}</td>
                  <td className="p-3">
                    {!p.bookingId ? (
                      <ReconcileButton paymentId={p.id} bookings={bookings} />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
