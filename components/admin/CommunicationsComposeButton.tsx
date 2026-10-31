'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { sendStaffMessage } from '@/app/actions/communications'

export type CommPerson = { id: string; label: string }

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const label =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

export default function CommunicationsComposeButton({
  clients,
  owners,
  canBroadcast,
}: {
  clients: CommPerson[]
  owners: CommPerson[]
  canBroadcast: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [audience, setAudience] = useState<'CLIENT' | 'OWNER' | 'ALL_CLIENTS' | 'ALL_OWNERS'>('CLIENT')
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'BOTH'>('SMS')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onePerson = audience === 'CLIENT' || audience === 'OWNER'
  const people = audience === 'OWNER' ? owners : clients
  const needsSubject = channel === 'EMAIL' || channel === 'BOTH'

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
                  Send message
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
                    const result = await sendStaffMessage(data)
                    if (!result.ok) {
                      setError(result.message)
                      return
                    }
                    setMessage(result.message)
                    form.reset()
                    setAudience('CLIENT')
                    setChannel('SMS')
                    window.setTimeout(() => {
                      setOpen(false)
                      router.refresh()
                    }, 600)
                  })
                }}
              >
                <label>
                  <span className={label}>Send to *</span>
                  <select
                    className={field}
                    name="audience"
                    value={audience}
                    onChange={(e) =>
                      setAudience(e.target.value as typeof audience)
                    }
                  >
                    <option value="CLIENT">One client</option>
                    <option value="OWNER">One owner</option>
                    {canBroadcast ? (
                      <>
                        <option value="ALL_CLIENTS">All active clients</option>
                        <option value="ALL_OWNERS">All active owners</option>
                      </>
                    ) : null}
                  </select>
                </label>

                {onePerson ? (
                  <label>
                    <span className={label}>Recipient *</span>
                    <select className={field} name="recipientId" required>
                      <option value="">Select…</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="recipientId" value="" />
                )}

                <label>
                  <span className={label}>Channel *</span>
                  <select
                    className={field}
                    name="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as typeof channel)}
                  >
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                    <option value="BOTH">Email and SMS</option>
                  </select>
                </label>

                {needsSubject ? (
                  <label>
                    <span className={label}>Subject *</span>
                    <input className={field} name="subject" required maxLength={120} />
                  </label>
                ) : (
                  <input type="hidden" name="subject" value="" />
                )}

                <label>
                  <span className={label}>Message *</span>
                  <textarea
                    className={`${field} min-h-[120px] resize-y`}
                    name="body"
                    required
                    maxLength={4000}
                    placeholder="Write the SMS or email body…"
                  />
                </label>

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
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  {pending ? 'Sending…' : 'Send'}
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
        <span className="material-symbols-outlined text-[16px]">send</span>
        Send message
      </button>
      {modal}
    </>
  )
}
