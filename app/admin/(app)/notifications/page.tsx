import { redirect } from 'next/navigation'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { listStaffNotifications } from '@/lib/intelligence/notifications'
import { Card, SectionHead, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'
import NotificationsInbox from '@/components/admin/NotificationsInbox'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/admin/login')

  const loaded = await softQuery(() => listStaffNotifications(profile.id))
  const notices = loaded.data ?? []

  const overdue = notices.filter((n) => n.kind === 'overdue').length
  const ending = notices.filter((n) => n.kind === 'ending_soon').length
  const latePay = notices.filter((n) => n.kind === 'late_payment').length
  const docs = notices.filter((n) => n.kind === 'document_expiry').length
  const newCost = notices.filter((n) => n.kind === 'new_cost').length
  const unread = notices.filter((n) => !n.read).length

  const kpiItems = [
    {
      id: 'unread',
      label: 'Unread',
      value: String(unread),
      numericValue: unread,
      icon: 'mark_email_unread',
      kind: 'count' as const,
    },
    {
      id: 'overdue',
      label: 'Overdue hires',
      value: String(overdue),
      numericValue: overdue,
      icon: 'warning',
      kind: 'count' as const,
    },
    {
      id: 'ending',
      label: 'Ending soon',
      value: String(ending),
      numericValue: ending,
      icon: 'schedule',
      kind: 'count' as const,
    },
    {
      id: 'docs',
      label: 'Document expiry',
      value: String(docs),
      numericValue: docs,
      icon: 'contract',
      kind: 'count' as const,
    },
    {
      id: 'late-pay',
      label: 'Late / unpaid',
      value: String(latePay),
      numericValue: latePay,
      icon: 'payments',
      kind: 'count' as const,
    },
    {
      id: 'costs',
      label: 'New costs (7 days)',
      value: String(newCost),
      numericValue: newCost,
      icon: 'receipt_long',
      kind: 'count' as const,
    },
  ]

  return (
    <PageShell>
      <SectionHead title="Notifications" />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <KpiPanel items={kpiItems} hideHeader />

      <Card className="overflow-hidden">
        {loaded.error ? (
          <p className="p-8 text-center text-sm text-on-surface-variant">
            Could not load notifications.
          </p>
        ) : (
          <NotificationsInbox
            notices={notices.map((n) => ({
              dbId: n.dbId,
              kind: n.kind,
              urgency: n.urgency,
              title: n.title,
              message: n.message,
              href: n.href,
              at: n.at,
              read: n.read,
            }))}
          />
        )}
      </Card>
    </PageShell>
  )
}
