'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { changeOwnPassword } from '@/app/actions/account'
import InviteStaffForm from '@/components/admin/InviteStaffForm'
import type { UserStatus } from '@/lib/auth/types'

type ProfileUser = {
  id: string
  fullName: string
  email: string
  initials: string
  roleLabel: string
  isSuperAdmin: boolean
  status: UserStatus
  phone?: string | null
  memberSince?: string
}

type RoleOption = { id: string; name: string; isSystem: boolean }

export default function ProfileWorkspace({
  user,
  canManage,
  roles = [],
  stats,
}: {
  user: ProfileUser
  canManage: boolean
  roles?: RoleOption[]
  stats: { staff: number; active: number; role: string }
}) {
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    const result = await changeOwnPassword(new FormData(e.currentTarget))
    setLoading(false)
    if (result.ok) {
      setMessage(result.message)
      e.currentTarget.reset()
      setEditing(false)
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-h3 text-xl font-bold text-on-surface">My Profile</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Your account details and security. Directors can invite staff from here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr] items-start">
        {/* Profile card — Doxa tokens, reference layout */}
        <article className="rounded-2xl overflow-hidden bg-white border border-outline-variant shadow-[0_12px_40px_rgba(29,34,53,0.08)]">
          <div className="h-20 bg-gradient-to-br from-primary-container via-primary to-primary relative">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-secondary-container" />
          </div>
          <div className="px-5 pb-5 -mt-10 relative">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary-container text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md">
              {user.initials}
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">settings</span>
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditing((v) => !v)
                  setError('')
                  setMessage('')
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container text-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                {editing ? 'Close' : 'Edit'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-lg font-bold text-on-surface leading-tight">{user.fullName}</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {user.roleLabel} · Doxa Car Hire
              </p>
              <p className="text-xs text-on-surface-variant/80 mt-1 break-all">{user.email}</p>
              {user.phone ? (
                <p className="text-xs text-on-surface-variant mt-0.5">{user.phone}</p>
              ) : null}
            </div>

            <div className="mt-5 pt-4 border-t border-outline-variant grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-on-surface tabular-nums">
                  {canManage ? stats.staff : '—'}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-on-surface-variant mt-0.5">Staff</p>
              </div>
              <div>
                <p className="text-base font-bold text-secondary-container tabular-nums">
                  {canManage ? stats.active : user.status === 'ACTIVE' ? '1' : '0'}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-secondary mt-0.5">Active</p>
              </div>
              <div>
                <p className="text-base font-bold text-on-surface">{stats.role}</p>
                <p className="text-[9px] uppercase tracking-wide text-on-surface-variant mt-0.5">Role</p>
              </div>
            </div>

            {user.memberSince ? (
              <p className="mt-4 text-center text-[11px] text-on-surface-variant">
                Member since {user.memberSince}
              </p>
            ) : null}
          </div>
        </article>

        {/* Account logic panel — split-card feel */}
        <div className="rounded-2xl overflow-hidden border border-outline-variant bg-white shadow-[0_12px_40px_rgba(29,34,53,0.06)] min-w-0">
          <div className="grid md:grid-cols-[140px_1fr]">
            <div className="hidden md:flex flex-col justify-between bg-gradient-to-b from-primary-container to-primary p-5 text-white relative overflow-hidden">
              <div
                className="absolute inset-y-0 right-0 w-6 bg-white"
                style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }}
              />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Account</p>
                <p className="mt-3 font-h3 text-lg font-bold leading-snug">Security &amp; access</p>
                <p className="mt-2 text-xs text-white/70 leading-relaxed">
                  Change your password. Directors invite staff with email and password.
                </p>
              </div>
              <div className="h-1 w-12 rounded-full bg-secondary-container mt-6" />
            </div>

            <div className="p-5 md:p-6 space-y-8">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-on-surface">
                  {editing ? 'Change password' : 'Password'}
                </h3>
                {!editing ? (
                  <p className="text-sm text-on-surface-variant">
                    Use Edit on your profile card to set a new password, or{' '}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline"
                      onClick={() => setEditing(true)}
                    >
                      change password here
                    </button>
                    .
                  </p>
                ) : (
                  <form onSubmit={onPassword} className="space-y-4 max-w-sm">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        New password
                      </span>
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        Confirm
                      </span>
                      <input
                        name="confirm"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                      />
                    </label>
                    {error && (
                      <p className="text-sm text-secondary" role="alert">
                        {error}
                      </p>
                    )}
                    {message && (
                      <p className="text-sm text-green-700" role="status">
                        {message}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-full bg-gradient-to-r from-secondary to-secondary-container text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wide shadow-[0_8px_20px_rgba(233,8,9,0.35)] hover:opacity-95 disabled:opacity-60"
                    >
                      {loading ? 'Saving…' : 'Update password'}
                    </button>
                  </form>
                )}
              </section>

              {canManage && (
                <section className="space-y-3 border-t border-outline-variant pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-on-surface">Invite staff account</h3>
                    <Link href="/admin/settings" className="text-xs text-primary font-medium hover:underline">
                      Manage roles in Settings →
                    </Link>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Creates email + password login with one assigned role. Manage permission matrices on{' '}
                    <Link href="/admin/settings" className="text-primary font-medium hover:underline">
                      Settings
                    </Link>
                    .
                  </p>
                  <InviteStaffForm roles={roles} />
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
