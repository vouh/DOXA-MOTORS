'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import DocumentsUploadForm from '@/components/admin/DocumentsUploadForm'

type Option = { id: string; label: string }

export default function DocumentsAddButton({
  clients,
  vehicles,
  owners,
}: {
  clients: Option[]
  vehicles: Option[]
  owners: Option[]
}) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, busy])

  const closeAndRefresh = () => {
    setOpen(false)
    setBusy(false)
    // Refresh after unmount so the dialog is not killed mid-progress.
    window.setTimeout(() => router.refresh(), 50)
  }

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
            <button
              type="button"
              aria-label="Close dialog"
              disabled={busy}
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm disabled:cursor-not-allowed dark:bg-black/60"
              onClick={() => {
                if (!busy) setOpen(false)
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex max-h-[min(90vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-[0_20px_48px_rgba(4,59,169,0.2)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-2.5 dark:border-[#1e3a5f]">
                <h2
                  id={titleId}
                  className="text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                >
                  Add new document
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (!busy) setOpen(false)
                  }}
                  disabled={busy}
                  aria-label="Close"
                  className="rounded-md p-1 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809] disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="thin-theme-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <DocumentsUploadForm
                  clients={clients}
                  vehicles={vehicles}
                  owners={owners}
                  onBusyChange={setBusy}
                  onSuccess={closeAndRefresh}
                />
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
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] active:scale-95"
      >
        <span className="material-symbols-outlined text-[16px]">upload_file</span>
        Add new document
      </button>
      {modal}
    </>
  )
}
