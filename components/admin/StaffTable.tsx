'use client'

import { useState } from 'react'
import { resetStaffPassword, setStaffStatus } from '@/app/actions/staff'
import { assignUserRole } from '@/app/actions/roles'
import type { UserStatus } from '@/lib/auth/types'

type RoleOption = { id: string; name: string; isSystem: boolean }

type StaffRow = {
  id: string
  name: string
  email: string
  roleId: string | null
  roleLabel: string
  status: UserStatus
  isSuperAdmin: boolean
  suspiciousScore: number
}

export default function StaffTable({
  rows,
  roles,
  canManage,
}: {
  rows: StaffRow[]
  roles: RoleOption[]
  canManage: boolean
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  if (!rows.length) {
    return <p className="text-sm text-on-surface-variant">No staff accounts yet.</p>
  }

  async function run(id: string, fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusyId(id)
    setNotice('')
    const result = await fn()
    setBusyId(null)
    setNotice(result.message)
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2" role="status">
          {notice}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-white shadow-[0_12px_40px_rgba(29,34,53,0.08)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
        <table className="w-full text-sm">
          <thead className="bg-surface-container text-left text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Status</th>
              {canManage && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-medium">
                  {r.name}
                  {r.isSuperAdmin ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">Super Admin</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">
                  {canManage && !r.isSuperAdmin ? (
                    <select
                      className="rounded border border-outline-variant px-2 py-1 text-sm"
                      value={r.roleId || ''}
                      disabled={busyId === r.id}
                      onChange={(e) =>
                        run(r.id, () => assignUserRole(r.id, e.target.value))
                      }
                    >
                      <option value="" disabled>
                        Select role
                      </option>
                      {roles.filter((role) => !role.isSystem).map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    r.roleLabel
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {r.suspiciousScore > 0 ? (
                    <span
                      className={
                        r.suspiciousScore >= 25
                          ? 'font-semibold text-[#E90809]'
                          : 'font-semibold text-amber-700 dark:text-amber-400'
                      }
                      title="Suspicious activity score from delete patterns"
                    >
                      {r.suspiciousScore}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant">0</span>
                  )}
                </td>
                <td className="px-3 py-2">{r.status}</td>
                {canManage && (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {r.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          onClick={() => run(r.id, () => setStaffStatus(r.id, 'SUSPENDED'))}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="text-xs text-green-700 hover:underline disabled:opacity-50"
                          onClick={() => run(r.id, () => setStaffStatus(r.id, 'ACTIVE'))}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => {
                          setResetFor(r.id)
                          setNewPassword('')
                          setNotice('')
                        }}
                      >
                        Reset password
                      </button>
                    </div>
                    {resetFor === r.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          minLength={8}
                          placeholder="New password (min 8)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="rounded border border-outline-variant px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={busyId === r.id || newPassword.length < 8}
                          className="rounded bg-primary text-white px-2 py-1 text-xs disabled:opacity-50"
                          onClick={async () => {
                            const fd = new FormData()
                            fd.set('userId', r.id)
                            fd.set('password', newPassword)
                            await run(r.id, () => resetStaffPassword(fd))
                            setResetFor(null)
                            setNewPassword('')
                          }}
                        >
                          Save
                        </button>
                        <button type="button" className="text-xs text-on-surface-variant" onClick={() => setResetFor(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
