'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createCarVehicle } from '@/app/actions/car-hire'
import {
  DEFAULT_CATEGORY_STARTING_PRICES,
  type CategoryStartingPrices,
} from '@/lib/loyalty/defaults'
import {
  dailyRateInputProps,
  onDailyRateInput,
  onRegNumberInput,
  onVehicleColorInput,
  onVehicleMakeInput,
  onVehicleModelInput,
  onVehicleYearInput,
  REG_NUMBER_MAX,
  regNumberInputProps,
  vehicleColorInputProps,
  vehicleMakeInputProps,
  vehicleModelInputProps,
  vehicleYearInputProps,
} from '@/lib/car-hire/input-rules'

type OwnerOption = { id: string; fullName: string }

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50 dark:focus:border-primary'
const label =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

export default function NewVehicleButton({
  owners,
  startingPrices = DEFAULT_CATEGORY_STARTING_PRICES,
}: {
  owners: OwnerOption[]
  startingPrices?: CategoryStartingPrices
}) {
  const router = useRouter()
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const regCheckSeq = useRef(0)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [regError, setRegError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [vehicleType, setVehicleType] = useState<keyof CategoryStartingPrices>('SALOON')
  const [dailyRate, setDailyRate] = useState(String(startingPrices.SALOON))

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, pending])

  function close() {
    if (pending) return
    setOpen(false)
    setError(null)
    setFieldError(null)
    setRegError(null)
    setMessage(null)
  }

  async function checkRegDuplicate(raw: string) {
    const regNumber = raw.trim()
    if (regNumber.replace(/[^A-Za-z0-9]/g, '').length < 5) {
      setRegError(null)
      return
    }
    const seq = ++regCheckSeq.current
    try {
      const res = await fetch('/api/admin/vehicles/check-reg', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNumber }),
      })
      if (seq !== regCheckSeq.current) return
      const data = (await res.json()) as { ok?: boolean; message?: string }
      if (!res.ok || !data.ok) {
        setRegError(data.message || 'This registration plate already exists.')
      } else {
        setRegError(null)
      }
    } catch {
      if (seq !== regCheckSeq.current) return
    }
  }

  function submit(formData: FormData) {
    setError(null)
    setFieldError(null)
    setMessage(null)

    const form = formRef.current
    if (form && !form.checkValidity()) {
      form.reportValidity()
      return
    }
    if (regError) return

    startTransition(async () => {
      const result = await createCarVehicle(formData)
      if (!result.ok) {
        setError(result.message)
        if (/already exists|registration/i.test(result.message)) {
          setRegError(result.message)
        }
        return
      }
      setMessage(result.message)
      setRegError(null)
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
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E90809]">
                    Fleet registration
                  </p>
                  <h2
                    id={titleId}
                    className="mt-0.5 text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    Add a new vehicle
                  </h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant dark:text-blue-200/50">
                    Enter vehicle, rate, ownership, and document details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809] dark:hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form ref={formRef} action={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
                <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
                  <label className="block">
                    <span className={label}>Registration number *</span>
                    <input
                      className={`${field} ${regError || fieldError ? 'border-error focus:border-error focus:ring-error/20' : ''}`}
                      name="regNumber"
                      required
                      autoFocus
                      {...regNumberInputProps}
                      onInput={(e) => {
                        onRegNumberInput(REG_NUMBER_MAX)(e)
                        const el = e.currentTarget
                        if (el.classList.contains('doxa-input-over-limit')) {
                          setFieldError(`Maximum ${REG_NUMBER_MAX} characters`)
                        } else {
                          setFieldError(null)
                        }
                        if (regError) setRegError(null)
                      }}
                      onBlur={(e) => {
                        void checkRegDuplicate(e.target.value)
                      }}
                    />
                    {fieldError ? (
                      <p className="mt-1 text-[12px] font-medium text-[#E90809]">{fieldError}</p>
                    ) : null}
                    {regError && !fieldError ? (
                      <p className="mt-1 text-[12px] font-medium text-[#E90809]">{regError}</p>
                    ) : null}
                  </label>
                  <label>
                    <span className={label}>Owner *</span>
                    <select className={field} name="ownerId" required defaultValue="">
                      <option value="" disabled>
                        Select owner
                      </option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={label}>Make *</span>
                    <input
                      className={field}
                      name="make"
                      required
                      {...vehicleMakeInputProps}
                      onInput={onVehicleMakeInput()}
                    />
                  </label>
                  <label>
                    <span className={label}>Model *</span>
                    <input
                      className={field}
                      name="model"
                      required
                      {...vehicleModelInputProps}
                      onInput={onVehicleModelInput()}
                    />
                  </label>
                  <label>
                    <span className={label}>Vehicle type *</span>
                    <select
                      className={field}
                      name="type"
                      value={vehicleType}
                      required
                      onChange={(e) => {
                        const t = e.target.value as keyof CategoryStartingPrices
                        setVehicleType(t)
                        setDailyRate(String(startingPrices[t] ?? startingPrices.SALOON))
                      }}
                    >
                      <option value="SALOON">Saloon</option>
                      <option value="SUV_4X4">SUV / 4x4</option>
                      <option value="VAN_MINIBUS">Van / minibus</option>
                      <option value="PICKUP">Pickup</option>
                      <option value="ECONOMY">Economy</option>
                    </select>
                  </label>
                  <label>
                    <span className={label}>Daily rate (KES) *</span>
                    <input
                      className={field}
                      name="dailyRate"
                      required
                      value={dailyRate}
                      {...dailyRateInputProps}
                      onInput={(e) => {
                        onDailyRateInput()(e)
                        setDailyRate(e.currentTarget.value)
                      }}
                    />
                  </label>
                  <label>
                    <span className={label}>Year</span>
                    <input
                      className={field}
                      name="year"
                      {...vehicleYearInputProps}
                      onInput={onVehicleYearInput()}
                    />
                  </label>
                  <label>
                    <span className={label}>Colour</span>
                    <input
                      className={field}
                      name="color"
                      {...vehicleColorInputProps}
                      onInput={onVehicleColorInput()}
                    />
                  </label>
                  <label>
                    <span className={label}>Insurance expiry</span>
                    <input className={field} name="insuranceExpiry" type="date" />
                  </label>
                  <label>
                    <span className={label}>Inspection expiry</span>
                    <input className={field} name="inspectionExpiry" type="date" />
                  </label>
                  {error && error !== regError ? (
                    <p className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 text-sm text-on-error-container sm:col-span-2 dark:bg-error/10 dark:text-red-200">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="rounded-lg border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-2 dark:bg-green-900/20 dark:text-green-300">
                      {message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container dark:text-blue-200/60 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending || Boolean(regError)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">directions_car</span>
                    {pending ? 'Saving…' : 'Save vehicle'}
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
        onClick={() => setOpen(true)}
        disabled={!owners.length}
        title={!owners.length ? 'Register a fleet owner first' : undefined}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>Add Vehicle
      </button>
      {modal}
    </>
  )
}
