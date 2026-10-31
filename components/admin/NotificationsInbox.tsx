'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { dismissStaffNotification, markStaffNoticeRead } from '@/app/actions/notifications'
import { StatusPill } from '@/components/admin/ui'
import { useOptionalFeedback } from '@/components/ui/FeedbackProvider'

const KIND_META: Record<string, { label: string; icon: string }> = {
  overdue: { label: 'Overdue hire', icon: 'warning' },
  ending_soon: { label: 'Ending soon', icon: 'schedule' },
  late_payment: { label: 'Late payment', icon: 'payments' },
  new_cost: { label: 'New cost', icon: 'receipt_long' },
  document_expiry: { label: 'Document', icon: 'contract' },
  security: { label: 'Security', icon: 'shield' },
}

export type NoticeRow = {
  dbId: string
  kind: string
  urgency: 'info' | 'urgent'
  title: string
  message: string
  href: string
  at: string
  read: boolean
}

function emitBadge(count: number) {
  window.dispatchEvent(new CustomEvent('doxa:notifications-badge', { detail: { count } }))
}

export default function NotificationsInbox({ notices }: { notices: NoticeRow[] }) {
  const router = useRouter()
  const feedback = useOptionalFeedback()
  const detailTitleId = useId()
  const deleteTitleId = useId()
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState(notices)
  const [detail, setDetail] = useState<NoticeRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NoticeRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => setRows(notices), [notices])

  useEffect(() => {
    if (!detail && !deleteTarget) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || deleting) return
      setDetail(null)
      setDeleteTarget(null)
      setDeleteError(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [detail, deleteTarget, deleting])

  function markRead(notice: NoticeRow) {
    const data = new FormData()
    data.set('id', notice.dbId)
    setRows((prev) =>
      prev.map((row) => (row.dbId === notice.dbId ? { ...row, read: true } : row)),
    )
    setDetail((d) => (d?.dbId === notice.dbId ? { ...d, read: true } : d))
    startTransition(async () => {
      const result = await markStaffNoticeRead(data)
      if (!result.ok) {
        setRows((prev) =>
          prev.map((row) => (row.dbId === notice.dbId ? { ...row, read: false } : row)),
        )
        setDetail((d) => (d?.dbId === notice.dbId ? { ...d, read: false } : d))
        feedback?.showFeedback({
          title: 'Could not mark as read',
          message: result.message || 'Something went wrong. Please try again.',
          tone: 'urgent',
          primaryLabel: 'OK',
        })
        return
      }
      if (typeof result.unread === 'number') emitBadge(result.unread)
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleteTarget || deleting) return
    const target = deleteTarget
    setDeleting(true)
    setDeleteError(null)
    const data = new FormData()
    data.set('id', target.dbId)
    startTransition(async () => {
      try {
        const result = await dismissStaffNotification(data)
        if (!result.ok) {
          setDeleteError(result.message || 'Could not delete this notice.')
          setDeleting(false)
          return
        }
        if (typeof result.unread === 'number') emitBadge(result.unread)
        setRows((prev) => prev.filter((row) => row.dbId !== target.dbId))
        setDetail((d) => (d?.dbId === target.dbId ? null : d))
        setDeleteTarget(null)
        setDeleting(false)
        router.refresh()
      } catch (error) {
        setDeleteError(error instanceof Error ? error.message : 'Could not delete this notice.')
        setDeleting(false)
      }
    })
  }

  const detailModal =
    detail && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm"
              onClick={() => setDetail(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={detailTitleId}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-2xl dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-2 border-b border-outline-variant px-4 py-3 dark:border-[#1e3a5f]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E90809]">
                    {(KIND_META[detail.kind] ?? KIND_META.new_cost).label}
                  </p>
                  <h2 id={detailTitleId} className="text-base font-bold text-on-surface">
                    {detail.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-error/10 hover:text-[#E90809]"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="space-y-3 px-4 py-4 text-[13px]">
                <div className="flex items-center gap-2">
                  <StatusPill status={detail.urgency === 'urgent' ? 'URGENT' : 'NOTICE'} />
                  {!detail.read ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Unread
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase text-on-surface-variant">
                      Read
                    </span>
                  )}
                </div>
                <p className="text-on-surface">{detail.message}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {new Date(detail.at).toLocaleString()}
                </p>
                {detail.href ? (
                  <a
                    href={detail.href}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Open related page
                  </a>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  const deleteModal =
    deleteTarget && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Dismiss"
              disabled={deleting}
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-md disabled:cursor-not-allowed dark:bg-black/60"
              onClick={() => {
                if (!deleting) {
                  setDeleteTarget(null)
                  setDeleteError(null)
                }
              }}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={deleteTitleId}
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
                    id={deleteTitleId}
                    className="mt-0.5 text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    Delete this notice?
                  </h2>
                  <p className="mt-1 text-[12px] leading-snug text-on-surface-variant dark:text-blue-200/65">
                    “{deleteTarget.title}” will be removed from your inbox. This cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteTarget(null)
                    setDeleteError(null)
                  }}
                  aria-label="Close"
                  className="rounded-md p-1 text-on-surface-variant transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {deleteError ? (
                <p className="border-t border-[#E90809]/20 bg-[#E90809]/8 px-4 py-2 text-[12px] text-[#E90809]">
                  {deleteError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-outline-variant/80 px-4 py-2.5 dark:border-[#1e3a5f]">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteTarget(null)
                    setDeleteError(null)
                  }}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-50 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => confirmDelete()}
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
    <>
      <ul className="divide-y divide-outline-variant">
        {rows.map((notice) => {
          const meta = KIND_META[notice.kind] ?? KIND_META.new_cost
          return (
            <li
              key={notice.dbId}
              className={`flex flex-wrap items-start justify-between gap-3 px-5 py-3 ${
                notice.read ? '' : 'bg-primary/[0.04] dark:bg-primary/10'
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                    notice.urgency === 'urgent' ? 'bg-[#E90809]' : 'bg-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-on-surface">{notice.title}</p>
                    <StatusPill status={notice.urgency === 'urgent' ? 'URGENT' : 'NOTICE'} />
                    {!notice.read ? (
                      <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[13px] text-on-surface-variant">{notice.message}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    {new Date(notice.at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  title="View details"
                  onClick={() => setDetail(notice)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary dark:border-[#1e3a5f]"
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                </button>
                {notice.read ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[12px] font-semibold text-primary">
                    <span className="material-symbols-outlined icon-fill text-[16px]">
                      check_circle
                    </span>
                    Read
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    title="Mark as read"
                    onClick={() => markRead(notice)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2.5 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">mark_email_read</span>
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteError(null)
                    setDeleteTarget(notice)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E90809]/30 px-2.5 py-1.5 text-[12px] font-semibold text-[#E90809] transition hover:bg-[#E90809]/10 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            </li>
          )
        })}
        {!rows.length ? (
          <li className="p-8 text-center text-sm text-on-surface-variant">
            Nothing needs attention right now.
          </li>
        ) : null}
      </ul>
      {detailModal}
      {deleteModal}
    </>
  )
}
