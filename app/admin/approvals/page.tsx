import DashboardShell from '@/components/dashboard/DashboardShell'
import { ADMIN_NAV } from '@/lib/dashboard/nav'
import { setMemberApproval } from '@/app/actions/members'
import { prisma } from '@/lib/prisma'

export default async function AdminApprovalsPage() {
  const pending = await prisma.user.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <DashboardShell role="ADMIN" title="Approvals" nav={ADMIN_NAV}>
      <div className="space-y-4 p-4 md:p-6">
        <p className="text-sm text-on-surface-variant">
          Approve new public registrations to grant ACTIVE access, or reject them.
        </p>
        {pending.length === 0 && (
          <p className="text-sm text-on-surface-variant rounded-xl border p-4 bg-surface">
            No pending members.
          </p>
        )}
        <div className="space-y-2">
          {pending.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-outline-variant/30 rounded-lg p-3 bg-surface"
            >
              <div>
                <p className="font-medium">{u.fullName}</p>
                <p className="text-sm text-on-surface-variant">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ''}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Registered {u.createdAt.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <form
                  action={async () => {
                    'use server'
                    await setMemberApproval({ userId: u.id, approve: true })
                  }}
                >
                  <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-sm">
                    Approve
                  </button>
                </form>
                <form
                  action={async () => {
                    'use server'
                    await setMemberApproval({ userId: u.id, approve: false })
                  }}
                >
                  <button className="px-3 py-1.5 rounded-lg border text-sm">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
