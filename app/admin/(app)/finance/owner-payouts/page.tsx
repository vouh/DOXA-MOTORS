import { softQuery } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { Card, SectionHead, StatusPill, Th, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'

export default async function OwnerPayoutsPage() {
  const loaded = await softQuery(() =>
    prisma.ownerPayout.findMany({
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  )
  const payouts = loaded.data ?? []

  return (
    <PageShell>
      <SectionHead
        title="Owner payouts"
        subtitle="Settlement statements for car owners"
        action={
          <a
            href="/admin/finance"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Finance
          </a>
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['Owner', 'Period', 'Gross', 'Commission', 'Expenses', 'Net pay', 'Status']} />
            <tbody className="divide-y divide-outline-variant">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    No owner statements yet. Generate payouts from an owner’s profile.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container/40">
                    <td className="p-3 font-medium">{p.owner.fullName}</td>
                    <td className="p-3 whitespace-nowrap text-on-surface-variant">
                      {p.periodStart.toLocaleDateString()}–{p.periodEnd.toLocaleDateString()}
                    </td>
                    <td className="p-3 tabular-nums">{p.grossEarnings.toLocaleString()}</td>
                    <td className="p-3 tabular-nums">{p.commission.toLocaleString()}</td>
                    <td className="p-3 tabular-nums">{p.totalExpenses.toLocaleString()}</td>
                    <td className="p-3 font-semibold tabular-nums">{p.netPay.toLocaleString()}</td>
                    <td className="p-3">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
