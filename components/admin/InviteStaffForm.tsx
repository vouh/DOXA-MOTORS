'use client'

import { useState, type FormEvent } from 'react'
import { inviteStaff } from '@/app/actions/staff'

type RoleOption = { id: string; name: string; isSystem: boolean }

export default function InviteStaffForm({ roles }: { roles: RoleOption[] }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultRole = roles.find((r) => !r.isSystem)?.id || roles[0]?.id || ''

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

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-3 rounded-2xl border border-outline-variant bg-white p-5 shadow-[0_12px_40px_rgba(29,34,53,0.08)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
    >
      <p className="text-sm text-on-surface-variant">
        Creates a Supabase Auth login + staff profile with <strong>one role</strong>. No public signup.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-on-surface-variant">
          Full name
          <input
            name="fullName"
            required
            minLength={2}
            className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block text-xs font-semibold text-on-surface-variant">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block text-xs font-semibold text-on-surface-variant">
          Phone (optional)
          <input
            name="phone"
            className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block text-xs font-semibold text-on-surface-variant">
          Role
          <select
            name="roleId"
            required
            defaultValue={defaultRole}
            className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm outline-none focus:border-primary"
          >
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
            className="mt-1 w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
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
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create staff account'}
      </button>
    </form>
  )
}
