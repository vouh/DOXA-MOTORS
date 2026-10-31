'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { inviteStaff } from '@/app/actions/staff'

type RoleOption = { id: string; name: string; isSystem: boolean }

const field =
  'mt-1 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628]'

export default function InviteStaffForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultRole = roles.find((r) => !r.isSystem)?.id || roles[0]?.id || ''

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, loading])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const result = await inviteStaff(new FormData(form))
    setLoading(false)
    if (result.ok) {
      setMessage(result.message)
      form.reset()
      setOpen(false)
      router.refresh()
    } else {
      setError(result.message)
    }
  }

  if (!roles.length) {
    return (
      <p className="text-sm text-on-surface-variant">
        Create a role first, then invite staff and assign that role.
      </p>
    )
  }

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm dark:bg-black/60"
              onClick={() => {
                if (!loading) setOpen(false)
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                <div>
                  <h2
                    id={titleId}
                    className="text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    Invite staff
                  </h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Creates a Supabase Auth login + staff profile with one role.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) setOpen(false)
                  }}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809]"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-on-surface-variant">
                    Full name
                    <input name="fullName" required minLength={2} className={field} />
                  </label>
                  <label className="block text-xs font-semibold text-on-surface-variant">
                    Email
                    <input name="email" type="email" required className={field} />
                  </label>
                  <label className="block text-xs font-semibold text-on-surface-variant">
                    Phone (optional)
                    <input name="phone" className={field} />
                  </label>
                  <label className="block text-xs font-semibold text-on-surface-variant">
                    Role
                    <select name="roleId" required defaultValue={defaultRole} className={field}>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.isSystem ? ' (system)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-on-surface-variant sm:col-span-2">
                    Initial password (min 8 characters)
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={field}
                    />
                  </label>
                  {error ? (
                    <p className="text-sm text-[#E90809] sm:col-span-2" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? 'Creating…' : 'Create staff account'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-on-surface-variant">
        Add a staff login with a role. No public signup.
      </p>
      <button
        type="button"
        onClick={() => {
          setError('')
          setMessage('')
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000]"
      >
        <span className="material-symbols-outlined text-[16px]">person_add</span>
        Invite staff
      </button>
      {message ? (
        <p className="w-full text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}
      {modal}
    </div>
  )
}
