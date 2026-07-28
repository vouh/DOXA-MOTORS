import { prisma } from '@/lib/prisma'
import { Card, SectionHead, StatusPill, Th } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const [messages, counts] = await Promise.all([
    prisma.messageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.messageLog.groupBy({ by: ['status'], _count: true }),
  ])
  return <div className="space-y-5">
    <SectionHead title="Communication Queue" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">{counts.map(item =>
      <Card className="p-4" key={item.status}><p className="text-2xl font-bold">{item._count}</p><p className="text-xs opacity-60">{item.status}</p></Card>
    )}</div>
    <Card><div className="border-b p-4">
      <p className="font-semibold">SMS & email audit log</p>
      <p className="text-xs opacity-60">The scheduler queues reminders, overdue notices and expiry alerts. A configured provider worker delivers queued messages.</p>
    </div><div className="overflow-x-auto"><table className="w-full text-xs">
      <Th cols={['Created','Recipient','Channel','Template','Destination','Status']} />
      <tbody className="divide-y divide-outline-variant">{messages.map(message => <tr key={message.id}>
        <td className="p-3 whitespace-nowrap">{message.createdAt.toLocaleString()}</td>
        <td className="p-3">{message.recipientName ?? message.recipientType}</td>
        <td className="p-3">{message.channel}</td><td className="p-3">{message.template.replaceAll('_',' ')}</td>
        <td className="p-3">{message.destination}</td><td className="p-3"><StatusPill status={message.status}/></td>
      </tr>)}{!messages.length&&<tr><td colSpan={6} className="p-8 text-center opacity-60">No messages have been queued.</td></tr>}</tbody>
    </table></div></Card>
  </div>
}
