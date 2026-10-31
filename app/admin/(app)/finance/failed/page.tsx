import { softQuery } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { Card, SectionHead, Th, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'

export default async function FailedPaymentsPage() {
  const loaded = await softQuery(() =>
    prisma.carPayment.findMany({
      where: { status: 'FAILED' },
      include: { booking: { include: { client: true, vehicle: true } } },
      orderBy: { createdAt: 'desc' },
      take: 150,
    }),
  )
  const failed = loaded.data ?? []

  return (
    <PageShell>
      <SectionHead
        title="Failed payments"
        subtitle="STK and other payment failures (wrong PIN, cancelled, timeout)"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin/insta-pay#failed"
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              Insta Pay →
            </a>
            <a
              href="/admin/finance"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Finance
            </a>
          </div>
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['When', 'Phone', 'Amount', 'Reason', 'Client / booking']} />
            <tbody className="divide-y divide-outline-variant">
              {failed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    No failed payments recorded.
                  </td>
                </tr>
              ) : (
                failed.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container/40">
                    <td className="whitespace-nowrap p-3 text-on-surface-variant">
                      {p.createdAt.toLocaleString()}
                    </td>
                    <td className="p-3">{p.phone ?? '—'}</td>
                    <td className="p-3 font-semibold tabular-nums">
                      {p.amount.toLocaleString()}
                    </td>
                    <td className="max-w-sm p-3 font-medium text-on-surface-variant">
                      {p.failureReason || 'Failed (no reason returned)'}
                    </td>
                    <td className="p-3">
                      {p.booking ? (
                        <span>
                          {p.booking.client.fullName}
                          <span className="mt-0.5 block text-[10px] text-on-surface-variant">
                            {p.booking.reference}
                            {p.booking.vehicle
                              ? ` · ${p.booking.vehicle.regNumber}`
                              : ''}
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
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
