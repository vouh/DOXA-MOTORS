import { prisma } from '@/lib/prisma'
import { recordCarExpense } from '@/app/actions/car-hire'
import { Card, SectionHead, StatusPill, Th } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
const field = 'rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm'

export default async function FinancePage() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const [payments, expenses, vehicles, payouts, outstanding] = await Promise.all([
    prisma.carPayment.findMany({ where: { status: 'COMPLETED', paidAt: { gte: start } }, include: { booking: { include: { client: true } } }, orderBy: { paidAt: 'desc' } }),
    prisma.carExpense.findMany({ where: { incurredAt: { gte: start } }, include: { vehicle: true, owner: true }, orderBy: { incurredAt: 'desc' } }),
    prisma.carVehicle.findMany({ include: { owner: true }, orderBy: { regNumber: 'asc' } }),
    prisma.ownerPayout.findMany({ include: { owner: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.carBooking.findMany({ where: { status: { not: 'CANCELLED' } }, include: { client: true, payments: { where: { status: 'COMPLETED' } } } }),
  ])
  const income = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const debt = outstanding.reduce((sum, booking) => sum + Math.max(0, booking.totalCharge - booking.payments.reduce((p, payment) => p + payment.amount, 0)), 0)
  return <div className="space-y-5">
    <SectionHead title="Finance, Expenses & Owner Settlement" />
    <div className="grid gap-4 md:grid-cols-4">
      {[['Collected this month', income], ['Fleet expenses', expenseTotal], ['Net cash position', income-expenseTotal], ['Outstanding balances', debt]].map(([label, value]) =>
        <Card className="p-4" key={String(label)}><p className="text-xs opacity-60">{label}</p><p className="mt-2 text-2xl font-bold">KES {Number(value).toLocaleString()}</p></Card>
      )}
    </div>
    <details className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <summary className="cursor-pointer font-semibold text-primary">Record vehicle expense</summary>
      <form action={async data => { 'use server'; await recordCarExpense(data) }} className="mt-4 grid gap-3 md:grid-cols-3">
        <select className={field} name="vehicleId" required><option value="">Vehicle *</option>{vehicles.map(v => <option value={v.id} key={v.id}>{v.regNumber} · {v.owner.fullName}</option>)}</select>
        <input className={field} name="category" placeholder="Category *" required />
        <input className={field} name="description" placeholder="Description *" required />
        <input className={field} name="amount" type="number" min=".01" step=".01" placeholder="Amount *" required />
        <input className={field} name="incurredAt" type="date" required />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Save expense</button>
      </form>
    </details>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><div className="border-b p-4 font-semibold">Recent payments</div><div className="overflow-x-auto"><table className="w-full text-xs"><Th cols={['Client','Method','Reference','Amount']} /><tbody>{payments.slice(0,10).map(p => <tr key={p.id}><td className="p-3">{p.booking.client.fullName}</td><td className="p-3">{p.method}</td><td className="p-3">{p.mpesaRef ?? '—'}</td><td className="p-3 font-semibold">{p.amount.toLocaleString()}</td></tr>)}</tbody></table></div></Card>
      <Card><div className="border-b p-4 font-semibold">Owner statements</div><div className="overflow-x-auto"><table className="w-full text-xs"><Th cols={['Owner','Period','Net Pay','Status']} /><tbody>{payouts.map(p => <tr key={p.id}><td className="p-3">{p.owner.fullName}</td><td className="p-3">{p.periodStart.toLocaleDateString()}–{p.periodEnd.toLocaleDateString()}</td><td className="p-3 font-semibold">{p.netPay.toLocaleString()}</td><td className="p-3"><StatusPill status={p.status}/></td></tr>)}</tbody></table></div></Card>
    </div>
    <a href="/api/export/car-hire?report=bookings" className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Export financial booking ledger</a>
  </div>
}
