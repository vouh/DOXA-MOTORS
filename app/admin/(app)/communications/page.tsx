import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { Card, Th, SectionHead, StatusPill, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'
import CommunicationsComposeButton from '@/components/admin/CommunicationsComposeButton'

export const dynamic = 'force-dynamic'

export default async function CommunicationsPage() {
  const profile = await getSessionProfile()
  const canSend = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.MESSAGE_SEND))
    : false
  const canBroadcast = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.MESSAGE_BROADCAST))
    : false

  const loaded = await softQuery(() =>
    Promise.all([
      prisma.messageLog.findMany({
        where: { recipientType: { in: ['CLIENT', 'OWNER'] } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.messageLog.groupBy({
        by: ['status'],
        where: { recipientType: { in: ['CLIENT', 'OWNER'] } },
        _count: true,
      }),
      prisma.carClient.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true, phone: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.carOwner.findMany({
        where: { active: true },
        select: { id: true, fullName: true, phone: true },
        orderBy: { fullName: 'asc' },
      }),
    ]),
  )
  const [messages, counts, clients, owners] = loaded.data ?? [[], [], [], []]

  const statusIcons: Record<string, string> = {
    QUEUED: 'schedule',
    SENT: 'check_circle',
    FAILED: 'error',
    DELIVERED: 'mark_email_read',
    SKIPPED: 'block',
  }

  const kpiItems = counts.map((item) => ({
    id: item.status,
    label: item.status,
    value: String(item._count),
    numericValue: item._count,
    icon: statusIcons[item.status] ?? 'mail',
    kind: 'count' as const,
  }))

  return (
    <PageShell>
      <SectionHead
        title="Communications"
        action={
          canSend ? (
            <CommunicationsComposeButton
              canBroadcast={canBroadcast}
              clients={clients.map((c) => ({
                id: c.id,
                label: `${c.fullName} · ${c.phone}`,
              }))}
              owners={owners.map((o) => ({
                id: o.id,
                label: `${o.fullName} · ${o.phone}`,
              }))}
            />
          ) : null
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      {kpiItems.length > 0 ? (
        <KpiPanel items={kpiItems} title="Email & SMS" />
      ) : (
        <Card className="p-6 text-sm text-on-surface-variant">
          No emails or SMS have been sent yet. Use Send message to reach a client or owner.
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="border-b border-outline-variant px-5 py-4">
          <p className="font-semibold text-on-surface">Delivery log</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Outbound email and SMS to clients and owners — including booking confirmations and staff
            broadcasts.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['Created', 'Recipient', 'Channel', 'Type', 'Destination', 'Status']} />
            <tbody className="divide-y divide-outline-variant">
              {messages.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low/60">
                  <td className="whitespace-nowrap p-3">{row.createdAt.toLocaleString()}</td>
                  <td className="p-3">{row.recipientName ?? row.recipientType}</td>
                  <td className="p-3">{row.channel}</td>
                  <td className="p-3">{row.template.replaceAll('_', ' ')}</td>
                  <td className="p-3">{row.destination}</td>
                  <td className="p-3">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
              {!messages.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    {loaded.error ? 'Could not load messages.' : 'No outbound messages yet.'}
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
