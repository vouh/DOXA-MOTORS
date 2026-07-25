import DashboardShell from '@/components/dashboard/DashboardShell'
import { TREASURER_NAV } from '@/lib/dashboard/nav'
import { actionReviewWelfare } from '@/app/actions/domain'
import { getTreasurerDashboardData } from '@/lib/data/queries'

export default async function TreasurerWelfarePage() {
  const data = await getTreasurerDashboardData()

  return (
    <DashboardShell role="TREASURER" title="Welfare reviews" nav={TREASURER_NAV}>
      <div className="space-y-4 p-4 md:p-6">
        {data.pendingWelfare.length === 0 && (
          <p className="text-sm text-on-surface-variant rounded-xl border p-4 bg-surface">
            No pending welfare requests.
          </p>
        )}
        {data.pendingWelfare.map((w) => (
          <div key={w.id} className="border rounded-lg p-3 bg-surface">
            <p className="font-medium">
              {w.user.fullName} — {w.description}
            </p>
            <p className="text-sm text-on-surface-variant">
              Amount: {w.amount?.toLocaleString() ?? '—'}
            </p>
            <div className="flex gap-2 mt-2">
              {(['APPROVED', 'REJECTED', 'PAID'] as const).map((status) => (
                <form key={status} action={actionReviewWelfare}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="status" value={status} />
                  <button className="px-3 py-1.5 border rounded-lg text-xs">{status}</button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
