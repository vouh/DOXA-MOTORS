import { prisma } from '@/lib/prisma'
import { Card, StatusPill, Th } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const dayEnd = new Date(dayStart.getTime() + 86_400_000)
  const expiryLimit = new Date(now.getTime() + 7 * 86_400_000)
  const [vehicles, bookings, todayMoney, monthMoney, expiring] = await Promise.all([
    prisma.carVehicle.findMany(),
    prisma.carBooking.findMany({
      where: { status: { in: ['RESERVED','DISPATCHED','OVERDUE'] } },
      include: { client: true, vehicle: true, payments: { where: { status: 'COMPLETED' } } },
      orderBy: { expectedReturnAt: 'asc' },
    }),
    prisma.carPayment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: dayStart } }, _sum: { amount: true } }),
    prisma.carPayment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.vehicleDocument.findMany({ where: { expiryDate: { lte: expiryLimit } }, include: { vehicle: true }, orderBy: { expiryDate: 'asc' } }),
  ])
  const owed = bookings.reduce((sum, b) => sum + Math.max(0, b.totalCharge - b.payments.reduce((p,x)=>p+x.amount,0)),0)
  const stats = [
    ['Cars out', vehicles.filter(v=>v.status==='HIRED').length, 'directions_car'],
    ['Parked / idle', vehicles.filter(v=>v.status==='AVAILABLE').length, 'garage'],
    ['Due back today', bookings.filter(b=>b.expectedReturnAt>=dayStart&&b.expectedReturnAt<dayEnd).length, 'event'],
    ['Overdue', bookings.filter(b=>b.status==='OVERDUE'||(b.status==='DISPATCHED'&&b.expectedReturnAt<now)).length, 'warning'],
    ['Collected today', `KES ${(todayMoney._sum.amount??0).toLocaleString()}`, 'payments'],
    ['Collected month', `KES ${(monthMoney._sum.amount??0).toLocaleString()}`, 'account_balance'],
    ['Outstanding', `KES ${owed.toLocaleString()}`, 'receipt_long'],
    ['Expiring documents', expiring.length, 'contract'],
  ]
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map(([label,value,icon]) => <Card className="p-4" key={String(label)}><span className="material-symbols-outlined text-primary">{icon}</span><p className="mt-2 text-2xl font-bold">{value}</p><p className="text-xs opacity-60">{label}</p></Card>)}</div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2"><div className="border-b p-4 font-semibold">Live hires & balances</div><div className="overflow-x-auto"><table className="w-full text-xs"><Th cols={['Booking','Client','Vehicle','Due','Balance','Status']} /><tbody>{bookings.map(b=>{const paid=b.payments.reduce((s,p)=>s+p.amount,0);return <tr key={b.id}><td className="p-3 font-mono">{b.reference}</td><td className="p-3">{b.client.fullName}</td><td className="p-3">{b.vehicle.regNumber}</td><td className="p-3">{b.expectedReturnAt.toLocaleString()}</td><td className="p-3 font-semibold">{Math.max(0,b.totalCharge-paid).toLocaleString()}</td><td className="p-3"><StatusPill status={b.status}/></td></tr>})}</tbody></table></div></Card>
      <Card><div className="border-b p-4 font-semibold">Document alerts</div><div className="divide-y">{expiring.map(d=><div className="p-4 text-sm" key={d.id}><strong>{d.vehicle.regNumber}</strong><p className="text-xs opacity-60">{d.type} · {d.expiryDate.toLocaleDateString()}</p></div>)}{!expiring.length&&<p className="p-6 text-sm opacity-60">No documents expiring within 7 days.</p>}</div></Card>
    </div>
  </div>
}
