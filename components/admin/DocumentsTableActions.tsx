'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { deleteRepositoryDocument } from '@/app/actions/documents'

export default function DocumentsTableActions({
  id,
  canDelete,
}: {
  id: string
  canDelete: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!confirmOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) {
        setConfirmOpen(false)
        setError(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [confirmOpen, deleting])

  async function confirmDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteRepositoryDocument(id)
      if (!result.ok) {
        setError(result.message || 'Could not delete this document.')
        setDeleting(false)
        return
      }
      setConfirmOpen(false)
      setDeleting(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this document.')
      setDeleting(false)
    }
  }

  const modal =
    mounted && confirmOpen
      ? createPortal(
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Dismiss"
              disabled={deleting}
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-md disabled:cursor-not-allowed dark:bg-black/60"
              onClick={() => {
                if (!deleting) {
                  setConfirmOpen(false)
                  setError(null)
                }
              }}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-[#E90809]/40 bg-white shadow-[0_24px_64px_rgba(7,20,40,0.35)] dark:border-[#E90809]/35 dark:bg-[#0c1c38]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 bg-[rgba(233,8,9,0.12)] px-4 py-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E90809] text-white">
                  <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E90809]">
                    Attention
                  </p>
                  <h2
                    id={titleId}
                    className="mt-0.5 text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    Delete this document?
                  </h2>
                  <p className="mt-1 text-[12px] leading-snug text-on-surface-variant dark:text-blue-200/65">
                    Are you sure? This cannot be undone. The file will be permanently removed from
                    private storage.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmOpen(false)
                    setError(null)
                  }}
                  aria-label="Close"
                  className="rounded-md p-1 text-on-surface-variant transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {error ? (
                <p className="border-t border-[#E90809]/20 bg-[#E90809]/8 px-4 py-2 text-[12px] text-[#E90809]">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-outline-variant/80 px-4 py-2.5 dark:border-[#1e3a5f]">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmOpen(false)
                    setError(null)
                  }}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-50 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                  className="rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#C50000] disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <a
          href={`/api/admin/documents/${id}/open`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
        >
          Open
        </a>
        {canDelete ? (
          <button
            type="button"
            disabled={deleting}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => {
              setError(null)
              setConfirmOpen(true)
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
      {modal}
    </div>
  )
}
