'use client'

import { useEffect, useId, useState, useTransition, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { updateCarVehicle } from '@/app/actions/car-hire'
import { StatusPill } from '@/components/admin/ui'
import VehicleCostsPanel from '@/components/admin/VehicleCostsPanel'
import {
  dailyRateInputProps,
  onDailyRateInput,
  onDigitsInput,
  onRegNumberInput,
  onVehicleColorInput,
  onVehicleMakeInput,
  onVehicleModelInput,
  onVehicleYearInput,
  phoneInputProps,
  REG_NUMBER_MAX,
  regNumberInputProps,
  vehicleColorInputProps,
  vehicleMakeInputProps,
  vehicleModelInputProps,
  vehicleYearInputProps,
} from '@/lib/car-hire/input-rules'

export type OwnerOption = { id: string; fullName: string }

export type VehicleDetails = {
  id: string
  ownerId: string
  regNumber: string
  make: string
  model: string
  year: number | null
  color: string | null
  type: string
  dailyRate: number
  status: string
  imageUrl: string | null
  ownerName: string
  ownerPhone?: string | null
  currentClient: string | null
  currentClientId: string | null
  currentBookingRef: string | null
  insuranceExpiry: string | null
  inspectionExpiry: string | null
  createdAt: string
}

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 pr-8 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'

const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

const VEHICLE_TYPES = [
  { value: 'SALOON', label: 'Saloon' },
  { value: 'SUV_4X4', label: 'SUV / 4x4' },
  { value: 'VAN_MINIBUS', label: 'Van / minibus' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'ECONOMY', label: 'Economy' },
] as const

/** Editable field with pen unlock — supports input or select. */
function Editable({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  options,
  min,
  step,
  lockedNote,
  inputProps,
  onInputSanitize,
}: {
  label: string
  name: string
  defaultValue?: string | number | null
  type?: string
  required?: boolean
  options?: ReadonlyArray<{ value: string; label: string }>
  min?: number | string
  step?: number | string
  lockedNote?: string
  inputProps?: Record<string, unknown>
  onInputSanitize?: (e: FormEvent<HTMLInputElement>) => void
}) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState(String(defaultValue ?? ''))
  const canEdit = !lockedNote
  const editing = canEdit && unlocked

  useEffect(() => {
    setValue(String(defaultValue ?? ''))
  }, [defaultValue])

  return (
    <div className="block min-w-0">
      <span className={`${labelCls} flex items-center gap-1`}>
        {label}
        {lockedNote ? (
          <span className="rounded bg-on-surface-variant/10 px-1 py-px text-[8px] font-bold normal-case tracking-wide text-on-surface-variant">
            {lockedNote}
          </span>
        ) : null}
      </span>
      <div className="group relative">
        {options ? (
          <select
            className={`${field} ${editing ? '' : 'pointer-events-none appearance-none'}`}
            name={name}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required={required}
            tabIndex={editing ? 0 : -1}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={`${field} ${editing ? '' : 'pointer-events-none select-none'}`}
            name={name}
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onInput={(e) => {
              onInputSanitize?.(e)
              setValue(e.currentTarget.value)
            }}
            required={required}
            readOnly={!editing}
            tabIndex={editing ? 0 : -1}
            min={min}
            step={step}
            {...inputProps}
          />
        )}
        {canEdit ? (
          <button
            type="button"
            onClick={() => setUnlocked((v) => !v)}
            title={editing ? 'Lock field' : 'Edit field'}
            className={`absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-[0_1px_3px_rgba(4,59,169,0.28)] transition-all duration-150 dark:border-[#0c1c38] ${
              editing
                ? 'scale-105 bg-[#E90809] text-white shadow-[0_2px_8px_rgba(233,8,9,0.45)] ring-2 ring-[#E90809]/25 hover:bg-[#C50000]'
                : 'bg-gradient-to-br from-primary to-[#043BA9] text-white hover:scale-110 hover:from-[#E90809] hover:to-[#C50000] hover:shadow-[0_2px_10px_rgba(233,8,9,0.4)] hover:ring-2 hover:ring-[#E90809]/30'
            }`}
          >
            <span className="material-symbols-outlined leading-none" style={{ fontSize: 13 }}>
              {editing ? 'lock_open' : 'edit'}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function VehicleViewButton({
  vehicle,
  owners,
  canExpense = false,
}: {
  vehicle: VehicleDetails
  owners: OwnerOption[]
  canExpense?: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'details' | 'costs'>('details')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onHire =
    Boolean(vehicle.currentClient) || vehicle.status === 'RESERVED' || vehicle.status === 'HIRED'

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
    setTab('details')
  }

  function save(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await updateCarVehicle(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message)
      router.refresh()
    })
  }

  const title = `${vehicle.make} ${vehicle.model}`
  const statusOptions = onHire
    ? [{ value: vehicle.status, label: vehicle.status.replaceAll('_', ' ') }]
    : [
        { value: 'AVAILABLE', label: 'Available' },
        { value: 'MAINTENANCE', label: 'Maintenance' },
        { value: 'RETIRED', label: 'Retired' },
      ]

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
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
              className="relative z-10 flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-[0_20px_48px_rgba(4,59,169,0.2)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-2.5 dark:border-[#1e3a5f]">
                <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Vehicle details
                  </p>
                  <span
                    className="hidden h-3 w-px shrink-0 bg-outline-variant sm:block dark:bg-[#1e3a5f]"
                    aria-hidden
                  />
                  <h2
                    id={titleId}
                    className="min-w-0 truncate text-base font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    {vehicle.regNumber}
                  </h2>
                  <span
                    className="hidden h-3 w-px shrink-0 bg-outline-variant sm:block dark:bg-[#1e3a5f]"
                    aria-hidden
                  />
                  <p className="shrink-0 text-[11px] text-on-surface-variant dark:text-blue-200/50">
                    {title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 rounded-md p-1 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809]"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex gap-1 border-b border-outline-variant px-3 pt-2 dark:border-[#1e3a5f]">
                {(
                  [
                    ['details', 'Details'],
                    ['costs', 'Costs'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-t-md px-3 py-1.5 text-[12px] font-semibold transition ${
                      tab === key
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'details' ? (
              <form action={save} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="id" value={vehicle.id} />
                <div className="thin-theme-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  {vehicle.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vehicle.imageUrl}
                      alt={`${title} (${vehicle.regNumber})`}
                      className="h-36 w-full rounded-lg object-cover"
                    />
                  ) : null}

                  <p className="text-[11px] text-on-surface-variant dark:text-blue-200/45">
                    Click the pen on a field to edit it, then save.
                  </p>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Editable
                      label="Registration *"
                      name="regNumber"
                      defaultValue={vehicle.regNumber}
                      required
                      inputProps={regNumberInputProps}
                      onInputSanitize={onRegNumberInput(REG_NUMBER_MAX)}
                    />
                    <Editable
                      label="Status"
                      name="status"
                      defaultValue={vehicle.status}
                      options={statusOptions}
                      lockedNote={onHire ? 'From booking' : undefined}
                    />
                    <Editable
                      label="Make *"
                      name="make"
                      defaultValue={vehicle.make}
                      required
                      inputProps={vehicleMakeInputProps}
                      onInputSanitize={onVehicleMakeInput()}
                    />
                    <Editable
                      label="Model *"
                      name="model"
                      defaultValue={vehicle.model}
                      required
                      inputProps={vehicleModelInputProps}
                      onInputSanitize={onVehicleModelInput()}
                    />
                    <Editable
                      label="Vehicle type *"
                      name="type"
                      defaultValue={vehicle.type}
                      options={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                      required
                    />
                    <Editable
                      label="Daily rate (KES) *"
                      name="dailyRate"
                      defaultValue={vehicle.dailyRate}
                      required
                      inputProps={dailyRateInputProps}
                      onInputSanitize={onDailyRateInput()}
                    />
                    <Editable
                      label="Year"
                      name="year"
                      defaultValue={vehicle.year ?? ''}
                      inputProps={vehicleYearInputProps}
                      onInputSanitize={onVehicleYearInput()}
                    />
                    <Editable
                      label="Colour"
                      name="color"
                      defaultValue={vehicle.color ?? ''}
                      inputProps={vehicleColorInputProps}
                      onInputSanitize={onVehicleColorInput()}
                    />
                    <Editable
                      label="Owner *"
                      name="ownerId"
                      defaultValue={vehicle.ownerId}
                      options={owners.map((o) => ({ value: o.id, label: o.fullName }))}
                      required
                    />
                    <Editable
                      label="Owner phone *"
                      name="ownerPhone"
                      defaultValue={vehicle.ownerPhone ?? ''}
                      required
                      inputProps={phoneInputProps}
                      onInputSanitize={onDigitsInput(12)}
                    />
                    <div className="min-w-0 sm:col-span-2">
                      <span className={labelCls}>Current hire</span>
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-outline-variant px-2.5 py-1.5 text-[13px] font-medium text-[#1D2235] dark:border-[#1e3a5f] dark:text-blue-50">
                        {vehicle.currentClient && vehicle.currentClientId ? (
                          <>
                            <a
                              href={`/admin/bookings?clientId=${vehicle.currentClientId}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {vehicle.currentClient}
                            </a>
                            {vehicle.currentBookingRef ? (
                              <span className="text-on-surface-variant dark:text-blue-200/50">
                                · {vehicle.currentBookingRef}
                              </span>
                            ) : null}
                            <StatusPill status={vehicle.status} />
                          </>
                        ) : (
                          <span className="text-on-surface-variant dark:text-blue-200/50">None</span>
                        )}
                      </div>
                    </div>
                    <Editable
                      label="Insurance expiry"
                      name="insuranceExpiry"
                      type="date"
                      defaultValue={vehicle.insuranceExpiry ?? ''}
                    />
                    <Editable
                      label="Inspection expiry"
                      name="inspectionExpiry"
                      type="date"
                      defaultValue={vehicle.inspectionExpiry ?? ''}
                    />
                    <div className="min-w-0 sm:col-span-2">
                      <span className={labelCls}>Added</span>
                      <p className="px-0.5 py-1 text-[13px] text-on-surface-variant dark:text-blue-200/55">
                        {vehicle.createdAt}
                      </p>
                    </div>
                  </div>

                  {error ? (
                    <p className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 text-sm text-on-error-container dark:bg-error/10 dark:text-red-200">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="rounded-lg border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      {message}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-outline-variant px-4 py-2.5 dark:border-[#1e3a5f]">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="rounded-lg px-3 py-2 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container dark:hover:bg-white/10"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    {pending ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
              ) : (
                <div className="thin-theme-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  <VehicleCostsPanel vehicleId={vehicle.id} canExpense={canExpense} />
                </div>
              )}
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
        title="View / edit vehicle"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 dark:text-[#7eb0ff] dark:hover:bg-primary/20"
      >
        <span className="material-symbols-outlined text-[20px]">visibility</span>
      </button>
      {modal}
    </>
  )
}
