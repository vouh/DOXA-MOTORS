'use client'

type AuditRow = {
  id: string
  action: string
  entity?: string | null
  createdAt: string
  userName?: string | null
}

export default function AuditLogsTable({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-on-surface-variant">No audit entries yet.</p>
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-white shadow-[0_12px_40px_rgba(29,34,53,0.08)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
      <table className="w-full text-sm">
        <thead className="bg-surface-container text-left text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Entity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 whitespace-nowrap">{r.createdAt}</td>
              <td className="px-3 py-2">{r.userName || '—'}</td>
              <td className="px-3 py-2">{r.action}</td>
              <td className="px-3 py-2">{r.entity || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
