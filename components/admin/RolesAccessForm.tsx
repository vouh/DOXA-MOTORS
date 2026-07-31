'use client'

import { useState } from 'react'
import { INIT_ROLES, MODULES, type RoleDef } from '@/lib/admin/data'

/** Demo UI until Stage 2 wires Role / RolePermission tables. */
export default function RolesAccessForm() {
  const [roles, setRoles] = useState<RoleDef[]>(INIT_ROLES)
  const [selectedId, setSelectedId] = useState(roles[0]?.id)

  const selected = roles.find((r) => r.id === selectedId) ?? roles[0]

  const toggle = (moduleId: string, action: string) => {
    if (!selected || selected.isSystem) return
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== selected.id) return role
        const current = role.permissions[moduleId] ?? []
        const next = current.includes(action)
          ? current.filter((a) => a !== action)
          : [...current, action]
        return { ...role, permissions: { ...role.permissions, [moduleId]: next } }
      }),
    )
  }

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-4">
      <ul className="space-y-1">
        {roles.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                r.id === selected?.id ? 'bg-primary text-white' : 'hover:bg-surface-container'
              }`}
            >
              {r.name}
              {r.isSystem && <span className="block text-[10px] opacity-80">System</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-outline-variant p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-on-surface">{selected?.name}</h3>
          <p className="text-sm text-on-surface-variant">{selected?.description}</p>
          <p className="text-xs text-amber-700 mt-2">
            Preview only — Stage 2 persists roles to the database.
          </p>
        </div>
        {MODULES.map((mod) => (
          <div key={mod.id}>
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">
              {mod.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {mod.actions.map((action) => {
                const on = selected?.permissions[mod.id]?.includes(action)
                return (
                  <label
                    key={action}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${
                      on ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={Boolean(on)}
                      disabled={selected?.isSystem}
                      onChange={() => toggle(mod.id, action)}
                    />
                    {action}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
