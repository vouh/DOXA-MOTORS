'use client'

type StaffRow = {
  id: string
  name: string
  email: string
  roleLabel: string
  status: string
}

export default function StaffTable({ rows }: { rows: StaffRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-on-surface-variant">No staff accounts yet.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full text-sm">
        <thead className="bg-surface-container text-left text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2">{r.email}</td>
              <td className="px-3 py-2">{r.roleLabel}</td>
              <td className="px-3 py-2">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
