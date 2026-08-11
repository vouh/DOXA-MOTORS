'use client'

import { useMemo, useState, type FormEvent } from 'react'
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
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_CATALOG>()
    for (const p of PERMISSION_CATALOG) {
      const list = map.get(p.category) || []
      list.push(p)
      map.set(p.category, list)
    }
    return [...map.entries()]
  }, [])

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
      setMode('list')
    } else {
      setError(result.message)
    }
  }

  async function onDelete(role: RoleRow) {
    if (!confirm(`Delete role “${role.name}”?`)) return
    setLoading(true)
    const result = await deleteRole(role.id)
    setLoading(false)
    if (result.ok) setMessage(result.message)
    else setError(result.message)
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-outline-variant bg-white p-5 shadow-[0_12px_40px_rgba(29,34,53,0.08)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-on-surface">
            {mode === 'create' ? 'Create role' : `Edit role — ${editing?.name}`}
          </h3>
          <button type="button" className="text-xs text-on-surface-variant hover:underline" onClick={() => setMode('list')}>
            Back
          </button>
        </div>
        <label className="block text-xs font-semibold text-on-surface-variant">
          Role name
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            placeholder="e.g. Night Supervisor"
          />
        </label>
        <label className="block text-xs font-semibold text-on-surface-variant">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-3 max-h-80 overflow-y-auto border border-outline-variant rounded-lg p-3">
          {byCategory.map(([category, perms]) => (
            <details key={category} open className="group">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                {category}
              </summary>
              <ul className="mt-2 space-y-1.5 pl-1">
                {perms.map((p) => (
                  <li key={p.key}>
                    <label className="flex items-start gap-2 text-sm text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(p.key)}
                        onChange={() => toggle(p.key)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{p.label}</span>
                        <span className="block text-[11px] text-on-surface-variant font-mono">{p.key}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        {error && <p className="text-sm text-secondary" role="alert">{error}</p>}
        {message && <p className="text-sm text-green-700" role="status">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create role' : 'Save changes'}
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-on-surface-variant">
          Permissions are fixed in code. You combine them into named roles (Sweet1ne model).
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Create role
        </button>
      </div>
      {error && <p className="text-sm text-secondary" role="alert">{error}</p>}
      {message && <p className="text-sm text-green-700" role="status">{message}</p>}
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
                  {r.isSystem && (
                    <span className="text-[10px] uppercase text-primary font-semibold">System</span>
                  )}
                  {r.description && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{r.description}</p>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">{r._count.permissions}</td>
                <td className="px-3 py-2 tabular-nums">{r._count.users}</td>
                <td className="px-3 py-2 space-x-2">
                  {!r.isSystem && (
                    <>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => startEdit(r)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => onDelete(r)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {r.isSystem && <span className="text-xs text-on-surface-variant">Protected</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
