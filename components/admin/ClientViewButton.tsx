'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { deleteCarClient, setCarClientStatus, updateCarClient } from '@/app/actions/car-hire'
import {
  alnumOnly,
  digitsOnly,
  emailInputProps,
  idInputProps,
  licenceChars,
  licenceInputProps,
  nameInputProps,
  onAddressInput,
  onDigitsInput,
  onNameInput,
  onNotesInput,
  onOrgInput,
  phoneInputProps,
} from '@/lib/car-hire/input-rules'

export type ClientDetails = {
  id: string
  fullName: string
  phone: string
  email: string | null
  idOrPassportNo: string
  licenceNo: string
  licenceExpiry: string | null
  physicalAddress: string | null
  nextOfKin: string | null
  employer: string | null
  secondContact: string | null
  notes: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  trips: number
}

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'

const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

function SensitiveField({
  label,
  name,
  initial,
  hint,
  mode,
}: {
  label: string
  name: string
  initial: string
  hint?: string
  mode: 'id' | 'licence'
}) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState(initial)
  const props = mode === 'id' ? idInputProps : licenceInputProps

  return (
    <label className="block">
      <span className={`${labelCls} flex items-center gap-1`}>
        {label}
        {hint ? (
          <span className="rounded bg-primary/10 px-1 py-px text-[8px] font-bold normal-case tracking-wide text-primary">
            {hint}
          </span>
        ) : null}
      </span>
      <div className="group relative">
        <input
          className={`${field} pr-9 transition-[filter] ${unlocked ? '' : 'pointer-events-none select-none blur-[6px]'}`}
          name={name}
          value={value}
          onChange={(e) =>
            setValue(mode === 'id' ? alnumOnly(e.target.value) : licenceChars(e.target.value))
          }
          readOnly={!unlocked}
          tabIndex={unlocked ? 0 : -1}
          required
          {...props}
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => setUnlocked((v) => !v)}
          title={unlocked ? 'Lock field' : 'Unlock to view / edit'}
          className={`absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded transition ${
            unlocked
              ? 'bg-[#E90809]/15 text-[#E90809] hover:bg-[#E90809]/25'
              : 'bg-[#E90809] text-white opacity-70 shadow-sm group-hover:opacity-100 hover:bg-[#C50000] hover:opacity-100'
          }`}
        >
          <span className="material-symbols-outlined text-[14px] leading-none">
            {unlocked ? 'lock_open' : 'lock'}
          </span>
        </button>
      </div>
    </label>
  )
}

export default function ClientViewButton({ client }: { client: ClientDetails }) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'suspend' | 'activate' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState(client.status)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const confirming = confirm !== null

  useEffect(() => setMounted(true), [])
  useEffect(() => setStatus(client.status), [client.status])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        if (confirm) setConfirm(null)
        else setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, pending, confirm])

  function close() {
    if (pending) return
    setOpen(false)
    setConfirm(null)
    setMessage(null)
    setError(null)
  }

  function save(formData: FormData) {
    setError(null)
    setMessage(null)
    formData.set('id', client.id)
    startTransition(async () => {
      const result = await updateCarClient(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message)
      router.refresh()
    })
  }

  function applyStatus(next: 'ACTIVE' | 'SUSPENDED') {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await setCarClientStatus(client.id, next)
      if (!result.ok) {
        setError(result.message)
        setConfirm(null)
        return
      }
      setStatus(next)
      setConfirm(null)
      setMessage(result.message)
      router.refresh()
    })
  }

  function confirmAndDelete() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await deleteCarClient(client.id)
      if (!result.ok) {
        setError(result.message)
        setConfirm(null)
        return
      }
      router.refresh()
      setOpen(false)
      setConfirm(null)
    })
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
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
              className="relative z-10 flex max-h-[min(88vh,580px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-[0_20px_48px_rgba(4,59,169,0.2)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-2.5 dark:border-[#1e3a5f]">
                <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Client profile
                  </p>
                  <span className="hidden h-3 w-px shrink-0 bg-outline-variant sm:block dark:bg-[#1e3a5f]" aria-hidden />
                  <h2
                    id={titleId}
                    className="min-w-0 truncate text-base font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    {client.fullName}
                  </h2>
                  <span className="hidden h-3 w-px shrink-0 bg-outline-variant sm:block dark:bg-[#1e3a5f]" aria-hidden />
                  <p className="shrink-0 text-[11px] text-on-surface-variant dark:text-blue-200/50">
                    {client.trips} trip{client.trips === 1 ? '' : 's'} ·{' '}
                    <span
                      className={
                        status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 'text-[#E90809]'
                      }
                    >
                      {status === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </span>
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

              <form action={save} className="flex min-h-0 flex-1 flex-col">
                <div className="thin-theme-scroll flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Full name *</span>
                      <input
                        className={field}
                        name="fullName"
                        defaultValue={client.fullName}
                        required
                        {...nameInputProps}
                        onInput={onNameInput()}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Phone *</span>
                      <input
                        className={field}
                        name="phone"
                        defaultValue={digitsOnly(client.phone)}
                        required
                        {...phoneInputProps}
                        onInput={onDigitsInput()}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Email</span>
                      <input
                        className={field}
                        name="email"
                        defaultValue={client.email ?? ''}
                        {...emailInputProps}
                      />
                    </label>

                    <SensitiveField
                      label="National ID / passport *"
                      name="idOrPassportNo"
                      initial={client.idOrPassportNo}
                      hint="ID"
                      mode="id"
                    />
                    <SensitiveField
                      label="Driving licence *"
                      name="licenceNo"
                      initial={client.licenceNo}
                      hint="Licence"
                      mode="licence"
                    />

                    <label className="block">
                      <span className={labelCls}>Licence expiry</span>
                      <input
                        className={field}
                        name="licenceExpiry"
                        type="date"
                        defaultValue={client.licenceExpiry ?? ''}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Employer *</span>
                      <input
                        className={field}
                        name="employer"
                        required
                        defaultValue={client.employer ?? ''}
                        maxLength={120}
                        minLength={2}
                        title="Letters, numbers, and basic punctuation only"
                        onInput={onOrgInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Physical address *</span>
                      <input
                        className={field}
                        name="physicalAddress"
                        required
                        defaultValue={client.physicalAddress ?? ''}
                        maxLength={200}
                        minLength={3}
                        title="Letters, numbers, and common address punctuation only"
                        onInput={onAddressInput()}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Next of kin *</span>
                      <input
                        className={field}
                        name="nextOfKin"
                        required
                        defaultValue={client.nextOfKin ?? ''}
                        maxLength={100}
                        minLength={2}
                        title="Letters and spaces only"
                        onInput={onNameInput()}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Kin contact *</span>
                      <input
                        className={field}
                        name="secondContact"
                        required
                        defaultValue={client.secondContact ? digitsOnly(client.secondContact) : ''}
                        inputMode="numeric"
                        autoComplete="tel"
                        pattern="\d{9,12}"
                        maxLength={12}
                        minLength={9}
                        title="9–12 digits only"
                        placeholder="07XXXXXXXX"
                        onInput={onDigitsInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Vetting notes</span>
                      <textarea
                        className={field}
                        name="notes"
                        rows={2}
                        defaultValue={client.notes ?? ''}
                        maxLength={2000}
                        onInput={onNotesInput()}
                      />
                    </label>
                  </div>

                  {error ? (
                    <p className="rounded-md border border-error/30 bg-error-container/50 px-2.5 py-1.5 text-xs text-on-error-container dark:bg-error/10 dark:text-red-200">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="rounded-md border border-green-500/30 bg-green-50 px-2.5 py-1.5 text-xs text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      {message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-4 py-2.5 dark:border-[#1e3a5f]">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setMessage(null)
                        setConfirm(status === 'ACTIVE' ? 'suspend' : 'activate')
                      }}
                      disabled={pending || confirming}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60 ${
                        status === 'ACTIVE'
                          ? 'bg-[#E90809]/10 text-[#E90809] hover:bg-[#E90809]/18'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {status === 'ACTIVE' ? 'block' : 'check_circle'}
                      </span>
                      {status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setMessage(null)
                        setConfirm('delete')
                      }}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md bg-[#E90809]/10 px-2.5 py-1 text-[11px] font-semibold text-[#E90809] transition hover:bg-[#E90809]/18 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      Delete
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={close}
                      disabled={pending}
                      className="rounded-md px-3 py-1 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container dark:hover:bg-white/10"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={pending || confirming}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-[12px] font-semibold text-white shadow-sm transition hover:bg-primary-container disabled:opacity-60"
                    >
                      {pending && !confirming ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {confirm === 'delete' ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Dismiss delete confirmation"
                  className="absolute inset-0 bg-[#2a0505]/55 backdrop-blur-md"
                  disabled={pending}
                  onClick={() => !pending && setConfirm(null)}
                />
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby={`${titleId}-delete`}
                  className="relative z-10 w-full max-w-sm rounded-2xl border border-[#E90809]/50 bg-gradient-to-b from-[#E90809] to-[#9f0000] p-5 text-white shadow-[0_24px_64px_rgba(233,8,9,0.45)]"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                    <span className="material-symbols-outlined text-[28px]">warning</span>
                  </div>
                  <h3
                    id={`${titleId}-delete`}
                    className="mt-3 text-center text-base font-bold tracking-tight"
                  >
                    This cannot be undone
                  </h3>
                  <p className="mt-2 text-center text-[13px] leading-snug text-white/90">
                    All records for <span className="font-semibold">{client.fullName}</span> will be
                    permanently deleted
                    {client.trips > 0
                      ? ` — including ${client.trips} booking${client.trips === 1 ? '' : 's'}, payments, and hire history.`
                      : '.'}{' '}
                    Do you want to proceed?
                  </p>
                  {client.trips > 0 ? (
                    <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-center text-[11px] leading-snug text-amber-100">
                      Recommendation: Suspend instead if you only need to stop new hires.
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={confirmAndDelete}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-[#E90809] transition hover:bg-red-50 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                      {pending ? 'Deleting…' : 'Proceed — delete all'}
                    </button>
                    {status === 'ACTIVE' ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirm('suspend')}
                        className="rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                      >
                        Suspend instead
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirm(null)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {confirm === 'suspend' ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Dismiss suspend confirmation"
                  className="absolute inset-0 bg-[#2a0505]/55 backdrop-blur-md"
                  disabled={pending}
                  onClick={() => !pending && setConfirm(null)}
                />
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby={`${titleId}-suspend`}
                  className="relative z-10 w-full max-w-sm rounded-2xl border border-[#E90809]/50 bg-gradient-to-b from-[#E90809] to-[#9f0000] p-5 text-white shadow-[0_24px_64px_rgba(233,8,9,0.45)]"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                    <span className="material-symbols-outlined text-[28px]">block</span>
                  </div>
                  <h3
                    id={`${titleId}-suspend`}
                    className="mt-3 text-center text-base font-bold tracking-tight"
                  >
                    Suspend this client?
                  </h3>
                  <p className="mt-2 text-center text-[13px] leading-snug text-white/90">
                    <span className="font-semibold">{client.fullName}</span> will be blocked from new
                    hires. They will not appear in the booking client list until reactivated.
                  </p>
                  <ul className="mt-2 space-y-1 rounded-lg bg-black/20 px-3 py-2 text-left text-[11px] leading-snug text-amber-100">
                    <li>• Cannot start new bookings / dispatches</li>
                    <li>• Existing trips and payment history stay intact</li>
                    <li>• You can activate them again at any time</li>
                  </ul>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => applyStatus('SUSPENDED')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-[#E90809] transition hover:bg-red-50 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                      {pending ? 'Suspending…' : 'Proceed — suspend'}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirm(null)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {confirm === 'activate' ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Dismiss activate confirmation"
                  className="absolute inset-0 bg-[#071428]/50 backdrop-blur-md"
                  disabled={pending}
                  onClick={() => !pending && setConfirm(null)}
                />
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby={`${titleId}-activate`}
                  className="relative z-10 w-full max-w-sm rounded-2xl border border-primary/40 bg-gradient-to-b from-primary to-primary-container p-5 text-white shadow-[0_24px_64px_rgba(12,92,240,0.4)]"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                    <span className="material-symbols-outlined text-[28px]">check_circle</span>
                  </div>
                  <h3
                    id={`${titleId}-activate`}
                    className="mt-3 text-center text-base font-bold tracking-tight"
                  >
                    Activate this client?
                  </h3>
                  <p className="mt-2 text-center text-[13px] leading-snug text-white/90">
                    <span className="font-semibold">{client.fullName}</span> will be available again for
                    new bookings and will show in the client picker.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => applyStatus('ACTIVE')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      {pending ? 'Activating…' : 'Proceed — activate'}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirm(null)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View client details"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 dark:text-[#7eb0ff] dark:hover:bg-primary/20"
      >
        <span className="material-symbols-outlined text-[20px]">visibility</span>
      </button>
      {modal}
    </>
  )
}
