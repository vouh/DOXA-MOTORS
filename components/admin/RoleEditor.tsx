'use client'

import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createRole, deleteRole, updateRole } from '@/app/actions/roles'
import { PERMISSION_CATALOG } from '@/lib/rbac/registry'

type RoleRow = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  active: boolean
  _count: { users: number; permissions: number }
  permissions: { permission: { key: string; label: string; category: string } }[]
}

export default function RoleEditor({ roles }: { roles: RoleRow[] }) {
  const router = useRouter()
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_CATALOG>()
    for (const p of PERMISSION_CATALOG) {
      const list = map.get(p.category) || []
      list.push(p)
      map.set(p.category, list)
    }
    return [...map.entries()]
  }, [])

  function closeModal() {
    if (loading) return
    setMode('closed')
    setEditing(null)
    setError('')
  }

  function startCreate() {
    setMode('create')
    setEditing(null)
    setName('')
    setDescription('')
    setSelected(new Set())
    setMessage('')
    setError('')
  }

  function startEdit(role: RoleRow) {
    if (role.isSystem) {
      setError('The Super Admin role cannot be edited.')
      return
    }
    setMode('edit')
    setEditing(role)
    setName(role.name)
    setDescription(role.description || '')
    setSelected(new Set(role.permissions.map((p) => p.permission.key)))
    setMessage('')
    setError('')
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const fd = new FormData()
    fd.set('name', name)
    if (description) fd.set('description', description)
    for (const key of selected) fd.append('permissionKeys', key)
    if (mode === 'edit' && editing) fd.set('id', editing.id)

    const result = mode === 'edit' ? await updateRole(fd) : await createRole(fd)
    setLoading(false)
    if (result.ok) {
      setMessage(result.message)
      setMode('closed')
      router.refresh()
    } else {
      setError(result.message)
    }
  }

  async function onDelete(role: RoleRow) {
    if (!confirm(`Delete role “${role.name}”?`)) return
    setLoading(true)
    const result = await deleteRole(role.id)
    setLoading(false)
    if (result.ok) {
      setMessage(result.message)
      router.refresh()
    } else setError(result.message)
  }

  useEffect(() => {
    if (mode === 'closed') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [mode, loading])

  const modal =
    mounted && mode !== 'closed'
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm dark:bg-black/60"
              onClick={closeModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                <div>
                  <h2
                    id={titleId}
                    className="text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    {mode === 'create' ? 'Create role' : `Edit role — ${editing?.name}`}
                  </h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Permissions are fixed in code — pick which ones this role gets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809]"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="thin-theme-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  <label className="block text-xs font-semibold text-on-surface-variant">
                    Role name
                    <input
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-[#1e3a5f] dark:bg-[#0a1628]"
                      placeholder="e.g. Night Supervisor"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-on-surface-variant">
                    Description
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-[#1e3a5f] dark:bg-[#0a1628]"
                    />
                  </label>

                  <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-outline-variant p-3 dark:border-[#1e3a5f]">
                    {byCategory.map(([category, perms]) => (
                      <details key={category} open className="group">
                        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                          {category}
                        </summary>
                        <ul className="mt-2 space-y-1.5 pl-1">
                          {perms.map((p) => (
                            <li key={p.key}>
                              <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
                                <input
                                  type="checkbox"
                                  checked={selected.has(p.key)}
                                  onChange={() => toggle(p.key)}
                                  className="mt-1"
                                />
                                <span>
                                  <span className="font-medium">{p.label}</span>
                                  <span className="block font-mono text-[11px] text-on-surface-variant">
                                    {p.key}
                                  </span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>

                  {error ? (
                    <p className="text-sm text-[#E90809]" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-[#E90809] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? 'Saving…' : mode === 'create' ? 'Create role' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-on-surface-variant">
          Named roles built from fixed permissions (Sweet1ne model).
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000]"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create role
        </button>
      </div>
      {error && mode === 'closed' ? (
        <p className="text-sm text-[#E90809]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-white shadow-[0_12px_40px_rgba(29,34,53,0.08)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
        <table className="w-full text-sm">
          <thead className="bg-surface-container text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Permissions</th>
              <th className="px-3 py-2">Users</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {roles.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <p className="font-medium text-on-surface">{r.name}</p>
                  {r.isSystem ? (
                    <span className="text-[10px] font-semibold uppercase text-primary">System</span>
                  ) : null}
                  {r.description ? (
                    <p className="mt-0.5 text-xs text-on-surface-variant">{r.description}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2 tabular-nums">{r._count.permissions}</td>
                <td className="px-3 py-2 tabular-nums">{r._count.users}</td>
                <td className="space-x-2 px-3 py-2">
                  {!r.isSystem ? (
                    <>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => startEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[#E90809] hover:underline"
                        onClick={() => onDelete(r)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-on-surface-variant">Protected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal}
    </div>
  )
}
