import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { Card, SectionHead, StatusPill, Th, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const loaded = await softQuery(() =>
    Promise.all([
      prisma.messageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.messageLog.groupBy({ by: ['status'], _count: true }),
    ]),
  )
  const [messages, counts] = loaded.data ?? [[], []]

  const statusIcons: Record<string, string> = {
    QUEUED: 'schedule',
    SENT: 'check_circle',
    FAILED: 'error',
    DELIVERED: 'mark_email_read',
  }

  const kpiItems = counts.map((item) => ({
    id: item.status,
    label: item.status,
    value: String(item._count),
    numericValue: item._count,
    icon: statusIcons[item.status] ?? 'notifications',
    kind: 'count' as const,
  }))

  return (
    <PageShell>
      <SectionHead
        title="Communication Queue"
        subtitle="SMS and email delivery audit"
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      {kpiItems.length > 0 ? (
        <KpiPanel items={kpiItems} title="Message status" />
      ) : (
        <Card className="p-6 text-sm text-on-surface-variant">No messages have been queued yet.</Card>
      )}
      <Card className="overflow-hidden">
        <div className="border-b border-outline-variant px-5 py-4">
          <p className="font-semibold text-on-surface">SMS & email audit log</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            The scheduler queues reminders, overdue notices and expiry alerts. A configured
            provider worker delivers queued messages.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['Created', 'Recipient', 'Channel', 'Template', 'Destination', 'Status']} />
            <tbody className="divide-y divide-outline-variant">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-surface-container-low/60">
                  <td className="whitespace-nowrap p-3">{message.createdAt.toLocaleString()}</td>
                  <td className="p-3">{message.recipientName ?? message.recipientType}</td>
                  <td className="p-3">{message.channel}</td>
                  <td className="p-3">{message.template.replaceAll('_', ' ')}</td>
                  <td className="p-3">{message.destination}</td>
                  <td className="p-3">
                    <StatusPill status={message.status} />
                  </td>
                </tr>
              ))}
              {!messages.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    {loaded.error ? 'Could not load messages.' : 'No messages have been queued.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
