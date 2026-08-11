'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createCarClient } from '@/app/actions/car-hire'
import {
  emailInputProps,
  idInputProps,
  licenceInputProps,
  nameInputProps,
  onAddressInput,
  onAlnumInput,
  onDigitsInput,
  onLicenceInput,
  onNameInput,
  onNotesInput,
  onOrgInput,
  phoneInputProps,
} from '@/lib/car-hire/input-rules'

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50 dark:focus:border-primary'

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Contacts' },
] as const

export default function NewClientButton() {
  const router = useRouter()
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, pending])

  function close() {
    if (pending) return
    setOpen(false)
    setStep(1)
    setMessage(null)
    setError(null)
  }

  function onSubmit(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await createCarClient(formData)
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
              className="relative z-10 flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E90809]">
                    New client
                  </p>
                  <h2
                    id={titleId}
                    className="mt-0.5 text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    Register client
                  </h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant dark:text-blue-200/50">
                    Step {step} of 2 — {STEPS[step - 1].label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809] dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex gap-2 px-5 pt-4">
                {STEPS.map((s) => (
                  <div key={s.id} className="flex-1">
                    <div
                      className={`h-1 rounded-full transition-colors ${
                        s.id <= step ? 'bg-[#E90809]' : 'bg-outline-variant dark:bg-[#1e3a5f]'
                      }`}
                    />
                    <p
                      className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                        s.id <= step
                          ? 'text-[#E90809]'
                          : 'text-on-surface-variant dark:text-blue-200/40'
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <form ref={formRef} action={onSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  <div className={step === 1 ? 'grid gap-3 sm:grid-cols-2' : 'hidden'}>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Full name *
                      </span>
                      <input
                        className={field}
                        name="fullName"
                        required={step === 1}
                        autoFocus
                        {...nameInputProps}
                        onInput={onNameInput()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Phone *
                      </span>
                      <input
                        className={field}
                        name="phone"
                        required={step === 1}
                        {...phoneInputProps}
                        onInput={onDigitsInput()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Email
                      </span>
                      <input className={field} name="email" {...emailInputProps} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        National ID / passport *
                      </span>
                      <input
                        className={field}
                        name="idOrPassportNo"
                        required={step === 1}
                        {...idInputProps}
                        onInput={onAlnumInput()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Driving licence *
                      </span>
                      <input
                        className={field}
                        name="licenceNo"
                        required={step === 1}
                        {...licenceInputProps}
                        onInput={onLicenceInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Licence expiry
                      </span>
                      <input className={field} name="licenceExpiry" type="date" />
                    </label>
                  </div>

                  <div className={step === 2 ? 'grid gap-3 sm:grid-cols-2' : 'hidden'}>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Physical address
                      </span>
                      <input
                        className={field}
                        name="physicalAddress"
                        autoFocus={step === 2}
                        maxLength={200}
                        title="Letters, numbers, and common address punctuation only"
                        onInput={onAddressInput()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Next of kin
                      </span>
                      <input
                        className={field}
                        name="nextOfKin"
                        maxLength={100}
                        pattern="[A-Za-z\\s.']*"
                        title="Letters and spaces only"
                        onInput={onNameInput()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Kin contact
                      </span>
                      <input
                        className={field}
                        name="secondContact"
                        inputMode="numeric"
                        autoComplete="tel"
                        pattern="\d{9,12}"
                        maxLength={12}
                        title="Optional — 9–12 digits only"
                        placeholder="07XXXXXXXX"
                        onInput={onDigitsInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Employer
                      </span>
                      <input
                        className={field}
                        name="employer"
                        maxLength={120}
                        title="Letters, numbers, and basic punctuation only"
                        onInput={onOrgInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45">
                        Vetting notes
                      </span>
                      <textarea
                        className={field}
                        name="notes"
                        rows={3}
                        maxLength={2000}
                        onInput={onNotesInput()}
                      />
                    </label>
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

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={pending}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container dark:text-blue-200/60 dark:hover:bg-white/10"
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={close}
                      disabled={pending}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container dark:text-blue-200/60 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  )}

                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const form = formRef.current
                        if (!form) return
                        for (const name of ['fullName', 'phone', 'idOrPassportNo', 'licenceNo'] as const) {
                          const el = form.elements.namedItem(name)
                          if (el instanceof HTMLInputElement && !el.checkValidity()) {
                            el.reportValidity()
                            return
                          }
                        }
                        setStep(2)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000]"
                    >
                      Continue
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-60"
                    >
                      {pending ? 'Saving…' : 'Save client'}
                    </button>
                  )}
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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95"
      >
        <span className="material-symbols-outlined text-[16px]">person_add</span>
        New Client
      </button>
      {modal}
    </>
  )
}
