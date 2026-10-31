'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createCarOwner } from '@/app/actions/owners'

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const label =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

export default function OwnersAddButton() {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, pending])

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
            <button
              type="button"
              aria-label="Close dialog"
              disabled={pending}
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm disabled:cursor-not-allowed dark:bg-black/60"
              onClick={() => {
                if (!pending) setOpen(false)
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-[0_20px_48px_rgba(4,59,169,0.2)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-2.5 dark:border-[#1e3a5f]">
                <h2
                  id={titleId}
                  className="text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                >
                  Add new owner
                </h2>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809] disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form
                className="thin-theme-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (pending) return
                  const form = e.currentTarget
                  const data = new FormData(form)
                  setMessage(null)
                  setError(null)
                  startTransition(async () => {
                    const result = await createCarOwner(data)
                    if (!result.ok) {
                      setError(result.message)
                      return
                    }
                    setMessage(result.message)
                    form.reset()
                    window.setTimeout(() => {
                      setOpen(false)
                      router.refresh()
                    }, 500)
                  })
                }}
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className={label}>Full name *</span>
                    <input className={field} name="fullName" required maxLength={120} />
                  </label>
                  <label>
                    <span className={label}>Phone *</span>
                    <input className={field} name="phone" required inputMode="tel" />
                  </label>
                  <label>
                    <span className={label}>Email</span>
                    <input className={field} name="email" type="email" />
                  </label>
                  <label>
                    <span className={label}>National ID *</span>
                    <input className={field} name="nationalId" required />
                  </label>
                  <label>
                    <span className={label}>KRA PIN</span>
                    <input className={field} name="kraPin" />
                  </label>
                  <label>
                    <span className={label}>M-Pesa number</span>
                    <input className={field} name="mpesaNumber" inputMode="tel" />
                  </label>
                  <label>
                    <span className={label}>Next of kin</span>
                    <input className={field} name="nextOfKin" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={label}>Bank details</span>
                    <input className={field} name="bankDetails" />
                  </label>
                  <label>
                    <span className={label}>Doxa share type</span>
                    <select className={field} name="commissionType" defaultValue="PERCENTAGE">
                      <option value="PERCENTAGE">Percentage of hire</option>
                      <option value="FIXED">Fixed (KES)</option>
                    </select>
                  </label>
                  <label>
                    <span className={label}>Doxa share *</span>
                    <input
                      className={field}
                      name="commissionValue"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue="30"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={label}>Recurring deduction</span>
                    <input
                      className={field}
                      name="recurringDeduction"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                    />
                  </label>
                </div>

                {message ? (
                  <p className="rounded-md border border-green-500/30 bg-green-50 px-2.5 py-1.5 text-xs text-green-800">
                    {message}
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-md border border-error/30 bg-error-container/50 px-2.5 py-1.5 text-xs text-on-error-container">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#C50000] disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  {pending ? 'Saving…' : 'Save owner'}
                </button>
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
        onClick={() => {
          setMessage(null)
          setError(null)
          setOpen(true)
        }}
        className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95"
      >
        <span className="material-symbols-outlined text-[16px]">person_add</span>
        Add new owner
      </button>
      {modal}
    </>
  )
}
