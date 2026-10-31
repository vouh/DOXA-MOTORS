'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createCarClient } from '@/app/actions/car-hire'
import { uploadClientIdentityDocument } from '@/app/actions/documents'
import { CLIENT_ID_COPY, CLIENT_LICENCE_COPY } from '@/lib/documents/client-required'
import {
  addressInputProps,
  emailInputProps,
  ID_NUMBER_MAX,
  idInputProps,
  LICENCE_NUMBER_MAX,
  licenceInputProps,
  nameInputProps,
  nextOfKinInputProps,
  notesInputProps,
  onAddressInput,
  onCappedDigitsInput,
  onDigitsInput,
  onNameInput,
  onNotesInput,
  onOrgInput,
  orgInputProps,
  phoneInputProps,
} from '@/lib/car-hire/input-rules'

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50 dark:focus:border-primary'
const labelCls =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Contacts' },
  { id: 3, label: 'ID copies' },
] as const

const STEP1_FIELDS = ['fullName', 'phone', 'idOrPassportNo', 'licenceNo'] as const
const STEP2_FIELDS = ['physicalAddress', 'nextOfKin', 'secondContact', 'employer'] as const

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_UPLOAD_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png'])
const CHECK_TIMEOUT_MS = 8_000
const SAVE_TIMEOUT_MS = 45_000

export type RegisteredClient = { id: string; label: string }

function fileExt(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, ms: number) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

function FilePickSlot({
  title,
  file,
  onPick,
  onClear,
}: {
  title: string
  file: File | null
  onPick: (file: File | null, error?: string) => void
  onClear: () => void
}) {
  return (
    <div className="rounded-lg border border-outline-variant p-3 dark:border-[#1e3a5f]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-on-surface">{title}</p>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            file
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-[#E90809]/10 text-[#E90809]'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">
            {file ? 'check_circle' : 'upload_file'}
          </span>
          {file ? 'Ready' : 'Optional'}
        </span>
      </div>
      <label className="mt-2 block">
        <span className={labelCls}>{file ? 'Replace file' : 'Choose PDF, JPG, or PNG'}</span>
        <input
          className={field}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null
            e.target.value = ''
            if (!next) {
              onPick(null)
              return
            }
            if (!ALLOWED_UPLOAD_EXT.has(fileExt(next.name))) {
              onPick(null, 'Use PDF, JPG, or PNG only.')
              return
            }
            if (next.size > MAX_UPLOAD_BYTES) {
              onPick(null, 'File must be 5 MB or smaller.')
              return
            }
            onPick(next)
          }}
        />
      </label>
      {file ? (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 font-semibold text-[#E90809] hover:underline"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function NewClientButton({
  hideTrigger = false,
  open: openProp,
  onOpenChange,
  onRegistered,
  zIndexClass = 'z-[200]',
}: {
  hideTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onRegistered?: (client: RegisteredClient) => void
  zIndexClass?: string
} = {}) {
  const router = useRouter()
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (openProp === undefined) setUncontrolledOpen(next)
  }
  const [step, setStep] = useState(1)
  const [idCopy, setIdCopy] = useState<File | null>(null)
  const [licenceCopy, setLicenceCopy] = useState<File | null>(null)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const checkSeq = useRef(0)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetAndClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function resetWizard() {
    checkSeq.current += 1
    setStep(1)
    setIdCopy(null)
    setLicenceCopy(null)
    setMessage(null)
    setError(null)
    setDuplicateError(null)
    formRef.current?.reset()
  }

  function resetAndClose() {
    setPending(false)
    setOpen(false)
    resetWizard()
  }

  function formValue(name: string) {
    const form = formRef.current
    if (!form) return ''
    const el = form.elements.namedItem(name)
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return el.value.trim()
    }
    return ''
  }

  function validateFields(names: readonly string[]) {
    const form = formRef.current
    if (!form) return false
    for (const name of names) {
      const el = form.elements.namedItem(name)
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (!el.checkValidity()) {
          el.reportValidity()
          return false
        }
      }
    }
    return true
  }

  /** Runs after Continue — never blocks the step change; no “Checking…” UI. */
  function verifyIdentityInBackground() {
    const phone = formValue('phone')
    const idOrPassportNo = formValue('idOrPassportNo')
    const email = formValue('email')
    if (!phone && !idOrPassportNo) return

    const seq = ++checkSeq.current
    void (async () => {
      try {
        const res = await fetchWithTimeout(
          '/api/admin/clients/check-duplicate',
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, idOrPassportNo, email }),
          },
          CHECK_TIMEOUT_MS,
        )
        if (seq !== checkSeq.current) return
        const data = (await res.json()) as { ok?: boolean; message?: string }
        if (!res.ok || !data.ok) {
          setDuplicateError(
            data.message || 'These details already belong to another client.',
          )
          setError(null)
        } else {
          setDuplicateError(null)
        }
      } catch {
        // Timeout / network — stay silent; createCarClient still enforces uniqueness on save.
        if (seq !== checkSeq.current) return
      }
    })()
  }

  function goBackToIdentity() {
    setError(null)
    setStep(1)
  }

  function goToStep2() {
    setError(null)
    setDuplicateError(null)
    if (!validateFields(STEP1_FIELDS)) return
    setStep(2)
    verifyIdentityInBackground()
  }

  function goToStep3() {
    setError(null)
    if (duplicateError) return
    if (!validateFields([...STEP1_FIELDS, ...STEP2_FIELDS])) {
      if (!validateFields(STEP1_FIELDS)) setStep(1)
      return
    }
    setStep(3)
    // Re-check in case identity was edited earlier and result arrived late.
    verifyIdentityInBackground()
  }

  async function finish(skipUploads: boolean) {
    const form = formRef.current
    if (!form) return
    setError(null)
    setMessage(null)
    if (duplicateError) {
      setStep(1)
      return
    }
    if (!validateFields([...STEP1_FIELDS, ...STEP2_FIELDS])) {
      setStep(1)
      return
    }

    setPending(true)
    try {
      const formData = new FormData(form)
      const result = await withTimeout(
        createCarClient(formData),
        SAVE_TIMEOUT_MS,
        'Saving timed out. Check your connection, then try again.',
      )
      if (!result.ok) {
        setError(result.message)
        if (/already exists|duplicate/i.test(result.message)) {
          setDuplicateError(result.message)
          setStep(1)
        }
        return
      }
      if (!result.clientId) {
        setError('Client was saved but no id was returned. Search for them on Clients.')
        return
      }

      if (result.fullName && result.phone) {
        onRegistered?.({
          id: result.clientId,
          label: `${result.fullName} · ${result.phone}`,
        })
      }

      if (!skipUploads) {
        const uploads: { file: File; kind: string }[] = []
        if (idCopy) uploads.push({ file: idCopy, kind: CLIENT_ID_COPY })
        if (licenceCopy) uploads.push({ file: licenceCopy, kind: CLIENT_LICENCE_COPY })

        if (uploads.length) {
          const outcomes = await Promise.all(
            uploads.map(async (item) => {
              const data = new FormData()
              data.set('file', item.file)
              data.set('entityId', result.clientId!)
              data.set('kind', item.kind)
              return withTimeout(
                uploadClientIdentityDocument(data),
                SAVE_TIMEOUT_MS,
                'Upload timed out. Client was created — add copies from their profile.',
              )
            }),
          )
          const failed = outcomes.find((up) => !up.ok)
          if (failed && !failed.ok) {
            setError(`${failed.message} Client was still created — finish copies from their profile.`)
            setOpen(false)
            resetWizard()
            void router.refresh()
            return
          }
        }
      }

      setOpen(false)
      resetWizard()
      void router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save client.'
      setError(msg)
      if (/already exists|duplicate/i.test(msg)) {
        setDuplicateError(msg)
        setStep(1)
      }
    } finally {
      setPending(false)
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4`}>
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm dark:bg-black/60"
              onClick={resetAndClose}
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
                    Step {step} of 3 — {STEPS[step - 1]?.label}
                    {step === 3 ? ' (optional)' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetAndClose}
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
                      {s.id === 3 ? ' · optional' : ''}
                    </p>
                  </div>
                ))}
              </div>

              <form
                ref={formRef}
                onSubmit={(e) => e.preventDefault()}
                noValidate
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  <div className={step === 1 ? 'grid gap-3 sm:grid-cols-2' : 'hidden'}>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Full name *</span>
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
                      <span className={labelCls}>Phone *</span>
                      <input
                        className={field}
                        name="phone"
                        required={step === 1}
                        {...phoneInputProps}
                        onInput={(e) => {
                          onDigitsInput()(e)
                          setDuplicateError(null)
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Email</span>
                      <input
                        className={field}
                        name="email"
                        {...emailInputProps}
                        onInput={() => setDuplicateError(null)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>National ID *</span>
                      <input
                        className={field}
                        name="idOrPassportNo"
                        required={step === 1}
                        {...idInputProps}
                        onInput={(e) => {
                          onCappedDigitsInput(ID_NUMBER_MAX)(e)
                          setDuplicateError(null)
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Driving licence *</span>
                      <input
                        className={field}
                        name="licenceNo"
                        required={step === 1}
                        {...licenceInputProps}
                        onInput={onCappedDigitsInput(LICENCE_NUMBER_MAX)}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Licence expiry</span>
                      <input className={field} name="licenceExpiry" type="date" />
                    </label>
                  </div>

                  <div className={step === 2 ? 'grid gap-3 sm:grid-cols-2' : 'hidden'}>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Physical address *</span>
                      <input
                        className={field}
                        name="physicalAddress"
                        required={step === 2}
                        autoFocus={step === 2}
                        {...addressInputProps}
                        onInput={onAddressInput()}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Next of kin *</span>
                      <input
                        className={field}
                        name="nextOfKin"
                        required={step === 2}
                        {...nextOfKinInputProps}
                        onInput={onNameInput()}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Kin contact *</span>
                      <input
                        className={field}
                        name="secondContact"
                        required={step === 2}
                        {...phoneInputProps}
                        onInput={onDigitsInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Employer *</span>
                      <input
                        className={field}
                        name="employer"
                        required={step === 2}
                        {...orgInputProps}
                        onInput={onOrgInput()}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={labelCls}>Vetting notes</span>
                      <textarea
                        className={field}
                        name="notes"
                        rows={3}
                        {...notesInputProps}
                        onInput={onNotesInput()}
                      />
                    </label>
                  </div>

                  <div className={step === 3 ? 'space-y-3' : 'hidden'}>
                    <FilePickSlot
                      title="National ID / passport copy"
                      file={idCopy}
                      onPick={(file, err) => {
                        setError(err ?? null)
                        setIdCopy(file)
                      }}
                      onClear={() => setIdCopy(null)}
                    />
                    <FilePickSlot
                      title="Driving licence copy"
                      file={licenceCopy}
                      onPick={(file, err) => {
                        setError(err ?? null)
                        setLicenceCopy(file)
                      }}
                      onClear={() => setLicenceCopy(null)}
                    />
                  </div>

                  {duplicateError ? (
                    <div className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2.5 text-sm text-on-error-container dark:bg-error/10 dark:text-red-200">
                      <p>{duplicateError}</p>
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={goBackToIdentity}
                          className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#E90809] underline-offset-2 hover:underline"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                          Go back and change identity details
                        </button>
                      ) : (
                        <p className="mt-1.5 text-[12px] opacity-80">
                          Change phone, National ID, or email above, then continue.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {error && !duplicateError ? (
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
                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={resetAndClose}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container dark:text-blue-200/60 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (pending) return
                        setError(null)
                        if (duplicateError) {
                          goBackToIdentity()
                          return
                        }
                        setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)
                      }}
                      disabled={pending}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container dark:text-blue-200/60 dark:hover:bg-white/10"
                    >
                      Back
                    </button>
                  )}

                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={goToStep2}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000]"
                    >
                      Continue
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  ) : null}

                  {step === 2 ? (
                    <button
                      type="button"
                      disabled={Boolean(duplicateError)}
                      onClick={goToStep3}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-60"
                    >
                      Continue
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  ) : null}

                  {step === 3 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={pending || Boolean(duplicateError)}
                        onClick={() => void finish(true)}
                        className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-60 dark:border-[#1e3a5f] dark:text-blue-200/60 dark:hover:bg-white/10"
                      >
                        Skip uploads
                      </button>
                      <button
                        type="button"
                        disabled={pending || Boolean(duplicateError)}
                        onClick={() => void finish(false)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-60"
                      >
                        {pending ? 'Saving…' : 'Save client'}
                        {!pending ? (
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        ) : null}
                      </button>
                    </div>
                  ) : null}
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          New Client
        </button>
      )}
      {modal}
    </>
  )
}
