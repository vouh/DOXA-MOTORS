'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createCarVehicle } from '@/app/actions/car-hire'

type OwnerOption = { id: string; fullName: string }

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50 dark:focus:border-primary'
const label =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

export default function NewVehicleButton({ owners }: { owners: OwnerOption[] }) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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
    setMessage(null)
  }

  function submit(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await createCarVehicle(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message)
      router.refresh()
      window.setTimeout(close, 700)
    })
  }

  const modal = open && mounted ? createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm dark:bg-black/60" onClick={close} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E90809]">Fleet registration</p>
            <h2 id={titleId} className="mt-0.5 text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50">Add a new vehicle</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant dark:text-blue-200/50">Enter vehicle, rate, ownership, and document details.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809] dark:hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
            <label><span className={label}>Registration number *</span><input className={field} name="regNumber" placeholder="KDA 123A" required autoFocus /></label>
            <label><span className={label}>Owner *</span><select className={field} name="ownerId" required defaultValue=""><option value="" disabled>Select owner</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}</option>)}</select></label>
            <label><span className={label}>Make *</span><input className={field} name="make" placeholder="Toyota" required /></label>
            <label><span className={label}>Model *</span><input className={field} name="model" placeholder="Axio" required /></label>
            <label><span className={label}>Vehicle type *</span><select className={field} name="type" defaultValue="SALOON" required><option value="SALOON">Saloon</option><option value="SUV_4X4">SUV / 4x4</option><option value="VAN_MINIBUS">Van / minibus</option><option value="PICKUP">Pickup</option><option value="ECONOMY">Economy</option></select></label>
            <label><span className={label}>Daily rate (KES) *</span><input className={field} name="dailyRate" type="number" min="1" step="1" placeholder="4500" required /></label>
            <label><span className={label}>Year</span><input className={field} name="year" type="number" min="1980" max="2100" placeholder="2022" /></label>
            <label><span className={label}>Colour</span><input className={field} name="color" placeholder="Silver" /></label>
            <label><span className={label}>Insurance expiry</span><input className={field} name="insuranceExpiry" type="date" /></label>
            <label><span className={label}>Inspection expiry</span><input className={field} name="inspectionExpiry" type="date" /></label>
            {error ? <p className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 text-sm text-on-error-container sm:col-span-2 dark:bg-error/10 dark:text-red-200">{error}</p> : null}
            {message ? <p className="rounded-lg border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-2 dark:bg-green-900/20 dark:text-green-300">{message}</p> : null}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
            <button type="button" onClick={close} disabled={pending} className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container dark:text-blue-200/60 dark:hover:bg-white/10">Cancel</button>
            <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">directions_car</span>{pending ? 'Saving…' : 'Save vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  ) : null

  return <>
    <button type="button" onClick={() => setOpen(true)} disabled={!owners.length} title={!owners.length ? 'Register a fleet owner first' : undefined} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
      <span className="material-symbols-outlined text-[16px]">add</span>Add Vehicle
    </button>
    {modal}
  </>
}
