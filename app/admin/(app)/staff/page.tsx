'use client'

import { useState } from 'react'
import { MODULES, INIT_ROLES, INIT_STAFF, type Permission, type Role, type StaffAccount } from '@/lib/admin/data'
import { Btn, Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

// ── Role Modal ────────────────────────────────────────────────────────────────

function RoleModal({ role, onSave, onClose }: { role: Partial<Role>; onSave: (r: Role) => void; onClose: () => void }) {
  const [name,  setName]  = useState(role.name        ?? '')
  const [desc,  setDesc]  = useState(role.description ?? '')
  const [perms, setPerms] = useState<Permission>(role.permissions ? { ...role.permissions } : {})

  const toggle = (mod: string, action: string) => {
    setPerms((p) => {
      const cur = p[mod] ?? []
      return { ...p, [mod]: cur.includes(action) ? cur.filter((a) => a !== action) : [...cur, action] }
    })
  }

  const toggleModule = (mod: string, actions: string[]) => {
    setPerms((p) => {
      const cur = p[mod] ?? []
      return { ...p, [mod]: actions.every((a) => cur.includes(a)) ? [] : [...actions] }
    })
  }

  const save = () => {
    if (!name.trim()) return
    onSave({ id: role.id ?? `role-${Date.now()}`, name: name.trim(), description: desc.trim(), permissions: perms, isSystem: role.isSystem })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0d1729] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-outline-variant dark:border-[#1a2d4f]">
        <div className="px-6 py-4 border-b border-outline-variant dark:border-[#1a2d4f] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-[16px] text-on-surface dark:text-blue-50">
              {role.isSystem ? 'View Role' : role.id ? 'Edit Role' : 'Create New Role'}
            </h2>
            <p className="text-[12px] text-on-surface-variant dark:text-blue-200/50 mt-0.5">
              {role.isSystem ? 'System roles cannot be modified' : 'Set the role name and granular permissions per module'}
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-1.5 uppercase tracking-wider">Role Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={role.isSystem}
                placeholder="e.g. Cashier"
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant dark:border-[#1a2d4f] bg-surface dark:bg-[#111f36] text-on-surface dark:text-blue-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-1.5 uppercase tracking-wider">Description</label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                disabled={role.isSystem}
                placeholder="Brief description of this role"
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant dark:border-[#1a2d4f] bg-surface dark:bg-[#111f36] text-on-surface dark:text-blue-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-3 uppercase tracking-wider">Module Permissions</label>
            <div className="space-y-2">
              {MODULES.map((mod) => {
                const modPerms    = perms[mod.id] ?? []
                const allSelected = mod.actions.every((a) => modPerms.includes(a))
                return (
                  <div key={mod.id} className="rounded-xl border border-outline-variant dark:border-[#1a2d4f] overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-low dark:bg-[#0a1628]">
                      <span className="material-symbols-outlined text-primary dark:text-blue-400 text-[16px] shrink-0">{mod.icon}</span>
                      <span className="font-semibold text-[13px] text-on-surface dark:text-blue-50 flex-1">{mod.label}</span>
                      {role.isSystem
                        ? <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">verified</span>Full access</span>
                        : <button type="button" onClick={() => toggleModule(mod.id, mod.actions)} className="text-[11px] text-primary dark:text-blue-400 font-medium hover:underline">
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </button>
                      }
                    </div>
                    {!role.isSystem && (
                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {mod.actions.map((action) => {
                          const checked = modPerms.includes(action)
                          return (
                            <label
                              key={action}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-[12px] font-medium border transition-all select-none ${
                                checked
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant dark:bg-[#111f36] dark:text-blue-200/60 dark:border-[#1a2d4f] hover:border-primary/50'
                              }`}
                            >
                              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(mod.id, action)} />
                              <span className="material-symbols-outlined text-[13px]">{checked ? 'check_box' : 'check_box_outline_blank'}</span>
                              {action}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant dark:border-[#1a2d4f] flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant dark:border-[#1a2d4f] text-on-surface dark:text-blue-100 text-[13px] font-medium hover:bg-surface-container dark:hover:bg-[#111f36] transition-colors">
            {role.isSystem ? 'Close' : 'Cancel'}
          </button>
          {!role.isSystem && (
            <button onClick={save} disabled={!name.trim()} className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {role.id ? 'Save Changes' : 'Create Role'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Staff Modal ───────────────────────────────────────────────────────────────

function StaffModal({ staff, roles, onSave, onClose }: { staff: Partial<StaffAccount>; roles: Role[]; onSave: (s: StaffAccount) => void; onClose: () => void }) {
  const [name,   setName]   = useState(staff.name   ?? '')
  const [email,  setEmail]  = useState(staff.email  ?? '')
  const [roleId, setRoleId] = useState(staff.roleId ?? '')
  const [status, setStatus] = useState<'Active' | 'Suspended'>(staff.status ?? 'Active')

  const save = () => {
    if (!name.trim() || !email.trim() || !roleId) return
    onSave({ id: staff.id ?? `staff-${Date.now()}`, name: name.trim(), email: email.trim(), roleId, status, lastLogin: staff.lastLogin ?? 'Never' })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0d1729] rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant dark:border-[#1a2d4f]">
        <div className="px-6 py-4 border-b border-outline-variant dark:border-[#1a2d4f] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[16px] text-on-surface dark:text-blue-50">{staff.id ? 'Edit Staff Account' : 'Add Staff Account'}</h2>
            <p className="text-[12px] text-on-surface-variant dark:text-blue-200/50 mt-0.5">Fill in the details and assign a role</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-1.5 uppercase tracking-wider">Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Muthoni"
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant dark:border-[#1a2d4f] bg-surface dark:bg-[#111f36] text-on-surface dark:text-blue-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-1.5 uppercase tracking-wider">Email Address *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane@doxacarhire.com"
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant dark:border-[#1a2d4f] bg-surface dark:bg-[#111f36] text-on-surface dark:text-blue-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-1.5 uppercase tracking-wider">Assigned Role *</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant dark:border-[#1a2d4f] bg-surface dark:bg-[#111f36] text-on-surface dark:text-blue-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select a role…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {roleId && (
              <p className="text-[11px] text-on-surface-variant dark:text-blue-200/40 mt-1 ml-1">
                {roles.find((r) => r.id === roleId)?.description}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 mb-1.5 uppercase tracking-wider">Status</label>
            <div className="flex gap-2">
              {(['Active', 'Suspended'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-all ${
                    status === s
                      ? s === 'Active' ? 'bg-green-600 text-white border-green-600' : 'bg-secondary-container text-white border-secondary-container'
                      : 'border-outline-variant dark:border-[#1a2d4f] text-on-surface-variant dark:text-blue-200/60 hover:bg-surface-container dark:hover:bg-[#111f36]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant dark:border-[#1a2d4f] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant dark:border-[#1a2d4f] text-on-surface dark:text-blue-100 text-[13px] font-medium hover:bg-surface-container dark:hover:bg-[#111f36] transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={!name.trim() || !email.trim() || !roleId}
            className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {staff.id ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Staff & Role Management page ──────────────────────────────────────────────

export default function StaffPage() {
  const [tab,        setTab]        = useState<'roles' | 'accounts'>('roles')
  const [roles,      setRoles]      = useState<Role[]>(INIT_ROLES)
  const [staff,      setStaff]      = useState<StaffAccount[]>(INIT_STAFF)
  const [roleModal,  setRoleModal]  = useState<Partial<Role> | null>(null)
  const [staffModal, setStaffModal] = useState<Partial<StaffAccount> | null>(null)

  const saveRole = (r: Role) => {
    setRoles((rs) => rs.some((x) => x.id === r.id) ? rs.map((x) => x.id === r.id ? r : x) : [...rs, r])
    setRoleModal(null)
  }

  const deleteRole = (id: string) => {
    setRoles((rs) => rs.filter((r) => r.id !== id))
    setStaff((ss) => ss.map((s) => s.roleId === id ? { ...s, roleId: '' } : s))
  }

  const saveStaff = (s: StaffAccount) => {
    setStaff((ss) => ss.some((x) => x.id === s.id) ? ss.map((x) => x.id === s.id ? s : x) : [...ss, s])
    setStaffModal(null)
  }

  const toggleStatus = (id: string) => {
    setStaff((ss) => ss.map((s) => s.id === id ? { ...s, status: s.status === 'Active' ? 'Suspended' : 'Active' } : s))
  }

  return (
    <div className="space-y-5">
      <SectionHead
        title="Staff & Role Management"
        action={
          tab === 'roles'
            ? <Btn label="Create Role" icon="add"        variant="primary" onClick={() => setRoleModal({})} />
            : <Btn label="Add Staff"   icon="person_add" variant="primary" onClick={() => setStaffModal({})} />
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container dark:bg-[#0a1628] rounded-xl w-fit border border-outline-variant dark:border-[#1a2d4f]">
        {(['roles', 'accounts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t
                ? 'bg-white dark:bg-[#0d1729] text-primary dark:text-blue-400 shadow-sm'
                : 'text-on-surface-variant dark:text-blue-200/50 hover:text-on-surface dark:hover:text-blue-200'
            }`}
          >
            {t === 'roles' ? `Roles (${roles.length})` : `Accounts (${staff.length})`}
          </button>
        ))}
      </div>

      {/* Roles tab */}
      {tab === 'roles' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => {
            const staffCount  = staff.filter((s) => s.roleId === r.id).length
            const moduleCount = Object.keys(r.permissions).length
            const actionCount = Object.values(r.permissions).reduce((n, a) => n + a.length, 0)
            return (
              <div key={r.id} className="rounded-xl border border-outline-variant dark:border-[#1a2d4f] bg-white dark:bg-[#0d1729] p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${r.isSystem ? 'bg-secondary-container' : 'bg-primary/10 dark:bg-primary/20'}`}>
                    <span className={`material-symbols-outlined icon-fill text-[18px] ${r.isSystem ? 'text-white' : 'text-primary dark:text-blue-400'}`}>
                      {r.isSystem ? 'shield' : 'badge'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[14px] text-on-surface dark:text-blue-50">{r.name}</p>
                      {r.isSystem && <span className="text-[9px] font-bold bg-secondary-container/10 text-secondary-container dark:text-red-400 border border-secondary-container/20 rounded-full px-1.5 py-0.5 uppercase tracking-wide">System</span>}
                    </div>
                    <p className="text-[11px] text-on-surface-variant dark:text-blue-200/50 mt-0.5 leading-relaxed">{r.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-on-surface-variant dark:text-blue-200/40 border-t border-outline-variant dark:border-[#1a2d4f] pt-3">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">view_module</span>{moduleCount} modules</span>
                  <span>·</span>
                  <span>{actionCount} permissions</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">person</span>{staffCount}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setRoleModal(r)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-outline-variant dark:border-[#1a2d4f] text-[12px] font-medium text-on-surface dark:text-blue-100 hover:bg-surface-container dark:hover:bg-[#111f36] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">{r.isSystem ? 'visibility' : 'edit'}</span>
                    {r.isSystem ? 'View' : 'Edit'}
                  </button>
                  {!r.isSystem && (
                    <button
                      onClick={() => deleteRole(r.id)}
                      className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-800/60 text-secondary-container dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete role"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <button
            onClick={() => setRoleModal({})}
            className="rounded-xl border-2 border-dashed border-outline-variant dark:border-[#1a2d4f] hover:border-primary/50 hover:bg-primary/5 dark:hover:border-blue-500/30 transition-all p-5 flex flex-col items-center justify-center gap-3 text-on-surface-variant dark:text-blue-200/40 hover:text-primary dark:hover:text-blue-400 min-h-[180px]"
          >
            <span className="material-symbols-outlined text-[36px]">add_circle</span>
            <div className="text-center">
              <p className="text-[13px] font-semibold">Create New Role</p>
              <p className="text-[11px] mt-0.5 opacity-70">Define permissions per module</p>
            </div>
          </button>
        </div>
      )}

      {/* Accounts tab */}
      {tab === 'accounts' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <Th cols={['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions']} />
              <tbody className="divide-y divide-outline-variant dark:divide-[#1a2d4f]">
                {staff.map((s) => {
                  const role = roles.find((r) => r.id === s.roleId)
                  return (
                    <tr key={s.id} className="hover:bg-surface-container-low dark:hover:bg-[#0a1628]">
                      <td className="px-4 py-3 font-semibold text-on-surface dark:text-blue-50">{s.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{s.email}</td>
                      <td className="px-4 py-3">
                        {role ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            role.isSystem
                              ? 'bg-secondary-container/10 text-secondary-container dark:text-red-400 border border-secondary-container/20'
                              : 'bg-primary/10 text-primary dark:text-blue-300 border border-primary/20'
                          }`}>
                            <span className="material-symbols-outlined text-[11px]">{role.isSystem ? 'shield' : 'badge'}</span>
                            {role.name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant dark:text-blue-200/40 italic">No role assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                      <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/40">{s.lastLogin}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Btn label="Edit" icon="edit" onClick={() => setStaffModal(s)} />
                          {s.id !== '1' && (
                            <Btn
                              label={s.status === 'Active' ? 'Suspend' : 'Activate'}
                              icon={s.status === 'Active' ? 'block' : 'check_circle'}
                              variant={s.status === 'Active' ? 'danger' : 'primary'}
                              onClick={() => toggleStatus(s.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {roleModal  !== null && <RoleModal  role={roleModal}   onSave={saveRole}  onClose={() => setRoleModal(null)}  />}
      {staffModal !== null && <StaffModal staff={staffModal} roles={roles} onSave={saveStaff} onClose={() => setStaffModal(null)} />}
    </div>
  )
}
