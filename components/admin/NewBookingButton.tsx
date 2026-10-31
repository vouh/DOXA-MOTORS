'use client'

import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createCarBooking } from '@/app/actions/car-hire'
import NewClientButton from '@/components/admin/NewClientButton'
import ExtraChargesFields, {
  extraRowsTotal,
  type ExtraChargeRow,
} from '@/components/admin/ExtraChargesFields'
import { CommentBox } from '@/components/admin/ExtraChargesFields'
import { tryHireDays } from '@/lib/car-hire/calculations'

type Option = { id: string; label: string; dailyRate?: number }

function localDateTimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const label =
  'mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

export default function NewBookingButton({
  clients,
  vehicles,
  defaultClientId = '',
  autoOpen = false,
}: {
  clients: Option[]
  vehicles: Option[]
  defaultClientId?: string
  autoOpen?: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(autoOpen)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [clientList, setClientList] = useState(clients)
  const [clientId, setClientId] = useState(defaultClientId)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [startAt, setStartAt] = useState(() => localDateTimeValue(new Date()))
  const [expectedReturnAt, setExpectedReturnAt] = useState(() => {
    const end = new Date()
    end.setDate(end.getDate() + 1)
    return localDateTimeValue(end)
  })
  const [dailyRate, setDailyRate] = useState('')
  const [extras, setExtras] = useState<ExtraChargeRow[]>([])

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])
  useEffect(() => {
    setClientList(clients)
  }, [clients])
  useEffect(() => {
    if (defaultClientId) setClientId(defaultClientId)
  }, [defaultClientId])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending && !registerOpen) close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, pending, registerOpen])

  function close() {
    if (pending || registerOpen) return
    setOpen(false)
    setError(null)
    setMessage(null)
  }

  function openModal() {
    setStartAt(localDateTimeValue(new Date()))
    const end = new Date()
    end.setDate(end.getDate() + 1)
    setExpectedReturnAt(localDateTimeValue(end))
    setDailyRate('')
    setExtras([])
    setError(null)
    setMessage(null)
    setOpen(true)
  }

  const days = tryHireDays(new Date(startAt), new Date(expectedReturnAt))
  const rate = Number(dailyRate)
  const hireTotal = days != null && Number.isFinite(rate) && rate > 0 ? days * rate : null
  const extrasTotal = extraRowsTotal(extras)
  const estimatedTotal = hireTotal != null ? hireTotal + extrasTotal : extrasTotal || null

  const quote = useMemo(
    () => ({ days, hireTotal, extrasTotal, estimatedTotal }),
    [days, hireTotal, extrasTotal, estimatedTotal],
  )

  function submit(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await createCarBooking(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message)
      router.refresh()
      window.setTimeout(close, 700)
    })
  }

  const modal =
    open && mounted
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
              className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-2.5 dark:border-[#1e3a5f]">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                  <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E90809]">
                    Hire
                  </p>
                  <h2
                    id={titleId}
                    className="text-base font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    New booking
                  </h2>
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

              <form action={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid flex-1 gap-3 overflow-y-auto px-5 py-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className={label + ' mb-0'}>Client *</span>
                      <button
                        type="button"
                        onClick={() => setRegisterOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">person_add</span>
                        Register new client
                      </button>
                    </div>
                    <select
                      className={field}
                      name="clientId"
                      required
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    >
                      <option value="">Select client</option>
                      {clientList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {!clientList.length ? (
                      <p className="mt-1 text-[11px] text-on-surface-variant">
                        No clients yet — register one first, then finish this booking.
                      </p>
                    ) : null}
                  </div>
                  <label className="sm:col-span-2">
                    <span className={label}>Available vehicle *</span>
                    <select
                      className={field}
                      name="vehicleId"
                      required
                      defaultValue=""
                      onChange={(e) => {
                        const vehicle = vehicles.find((v) => v.id === e.target.value)
                        if (vehicle?.dailyRate) setDailyRate(String(vehicle.dailyRate))
                      }}
                    >
                      <option value="" disabled>
                        Select vehicle
                      </option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={label}>Start *</span>
                    <input
                      className={field}
                      name="startAt"
                      type="datetime-local"
                      required
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                    />
                  </label>
                  <label>
                    <span className={label}>Expected return *</span>
                    <input
                      className={field}
                      name="expectedReturnAt"
                      type="datetime-local"
                      required
                      value={expectedReturnAt}
                      onChange={(e) => setExpectedReturnAt(e.target.value)}
                    />
                  </label>
                  <label>
                    <span className={label}>Daily rate (KES) *</span>
                    <input
                      className={field}
                      name="dailyRate"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                    />
                  </label>
                  <div className="rounded-lg border border-outline-variant bg-surface-container-low/60 px-3 py-2 text-sm dark:border-[#1e3a5f]">
                    <p className={label}>Hire total</p>
                    {quote.days == null ? (
                      <p className="text-on-surface-variant">Pick start and return to count the days.</p>
                    ) : (
                      <p className="font-semibold text-on-surface">
                        {quote.days} day{quote.days === 1 ? '' : 's'}
                        {quote.hireTotal != null
                          ? ` × KES ${rate.toLocaleString()} = KES ${quote.hireTotal.toLocaleString()}`
                          : ' — enter the daily rate'}
                      </p>
                    )}
                    {quote.extrasTotal > 0 ? (
                      <p className="mt-1 text-[12px] text-on-surface-variant">
                        Extras KES {quote.extrasTotal.toLocaleString()}
                      </p>
                    ) : null}
                    {quote.estimatedTotal ? (
                      <p className="mt-1 text-[12px] font-semibold text-primary">
                        Estimated total KES {quote.estimatedTotal.toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Booking notes</span>
                    <CommentBox
                      name="dispatchNotes"
                      placeholder="Optional — keep it short. Line breaks are fine."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ExtraChargesFields rows={extras} onChange={setExtras} />
                  </div>
                  {error ? (
                    <p className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 text-sm text-on-error-container sm:col-span-2">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="rounded-lg border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-2">
                      {message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-outline-variant px-5 py-3 dark:border-[#1e3a5f]">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending || !clientList.length || !vehicles.length}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">event_available</span>
                    {pending ? 'Creating…' : 'Create booking'}
                  </button>
                </div>
              </form>
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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        New booking
      </button>
      {modal}
      <NewClientButton
        hideTrigger
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        zIndexClass="z-[220]"
        onRegistered={(client) => {
          setClientList((prev) =>
            prev.some((c) => c.id === client.id) ? prev : [client, ...prev],
          )
          setClientId(client.id)
        }}
      />
    </>
  )
}
