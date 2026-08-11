import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { recordCarExpense } from '@/app/actions/car-hire'
import { Card, SectionHead, StatusPill, Th, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'
const field =
  'w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-0'

export default async function FinancePage() {
  const profile = await getSessionProfile()
  const canExport = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.REPORT_EXPORT))
    : false
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const loaded = await softQuery(() =>
    Promise.all([
      prisma.carPayment.findMany({
        where: { status: 'COMPLETED', paidAt: { gte: start } },
        include: { booking: { include: { client: true } } },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.carExpense.findMany({
        where: { incurredAt: { gte: start } },
        include: { vehicle: true, owner: true },
        orderBy: { incurredAt: 'desc' },
      }),
      prisma.carVehicle.findMany({ include: { owner: true }, orderBy: { regNumber: 'asc' } }),
      prisma.ownerPayout.findMany({
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.carBooking.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { client: true, payments: { where: { status: 'COMPLETED' } } },
      }),
      prisma.carPayment.findMany({
        where: { status: 'FAILED' },
        include: { booking: { include: { client: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]),
  )
  const [payments, expenses, vehicles, payouts, outstanding, failedPayments] = loaded.data ?? [
    [],
    [],
    [],
    [],
    [],
    [],
  ]
  const income = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const debt = outstanding.reduce(
    (sum, booking) =>
      sum +
      Math.max(0, booking.totalCharge - booking.payments.reduce((p, payment) => p + payment.amount, 0)),
    0,
  )
  const net = income - expenseTotal

  const kpiItems = [
    {
      id: 'collected',
      label: 'Collected this month',
      value: `KES ${income.toLocaleString()}`,
      numericValue: income,
      icon: 'payments',
      kind: 'money' as const,
    },
    {
      id: 'expenses',
      label: 'Fleet expenses',
      value: `KES ${expenseTotal.toLocaleString()}`,
      numericValue: expenseTotal,
      icon: 'receipt_long',
      kind: 'money' as const,
    },
    {
      id: 'net',
      label: 'Net cash position',
      value: `KES ${net.toLocaleString()}`,
      numericValue: net,
      icon: 'account_balance',
      kind: 'money' as const,
    },
    {
      id: 'outstanding',
      label: 'Outstanding balances',
      value: `KES ${debt.toLocaleString()}`,
      numericValue: debt,
      icon: 'money_off',
      kind: 'money' as const,
    },
  ]

  return (
    <PageShell>
      <SectionHead
        title="Finance, Expenses & Owner Settlement"
        subtitle="Cash collected, fleet costs, and owner payouts"
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <KpiPanel items={kpiItems} title="This month" />
      <Card className="overflow-hidden">
        <details>
          <summary className="cursor-pointer list-none border-b border-outline-variant px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
            Record vehicle expense
          </summary>
          <form
            action={async (data) => {
              'use server'
              await recordCarExpense(data)
            }}
            className="grid gap-4 px-5 py-5 md:grid-cols-3"
          >
            <select className={field} name="vehicleId" required>
              <option value="">Vehicle *</option>
              {vehicles.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.regNumber} · {v.owner.fullName}
                </option>
              ))}
            </select>
            <input className={field} name="category" placeholder="Category *" required />
            <input className={field} name="description" placeholder="Description *" required />
            <input
              className={field}
              name="amount"
              type="number"
              min=".01"
              step=".01"
              placeholder="Amount *"
              required
            />
            <input className={field} name="incurredAt" type="date" required />
            <button className="rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,92,240,0.28)] md:justify-self-start">
              Save expense
            </button>
          </form>
        </details>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-outline-variant px-5 py-4 font-semibold">
            Recent payments
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <Th cols={['Client', 'Method', 'Reference', 'Amount']} />
              <tbody className="divide-y divide-outline-variant">
                {payments.slice(0, 10).map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      {p.booking?.client.fullName ?? (
                        <span className="text-on-surface-variant font-medium">Unlinked</span>
                      )}
                    </td>
                    <td className="p-3">{p.method}</td>
                    <td className="p-3">{p.mpesaRef ?? '—'}</td>
                    <td className="p-3 font-semibold tabular-nums">
                      {p.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-outline-variant px-5 py-4 font-semibold">
            Owner statements
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <Th cols={['Owner', 'Period', 'Net Pay', 'Status']} />
              <tbody className="divide-y divide-outline-variant">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">{p.owner.fullName}</td>
                    <td className="p-3">
                      {p.periodStart.toLocaleDateString()}–{p.periodEnd.toLocaleDateString()}
                    </td>
                    <td className="p-3 font-semibold tabular-nums">
                      {p.netPay.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden" id="failed-payments">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-5 py-4">
          <div>
            <h2 className="font-semibold text-on-surface">Failed payments</h2>
            <p className="text-xs text-on-surface-variant">
              STK failures with M-Pesa reason (wrong PIN, cancelled, timeout)
            </p>
          </div>
          <a
            href="/admin/insta-pay#failed"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Open Insta Pay →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['When', 'Phone', 'Amount', 'Reason', 'Booking']} />
            <tbody className="divide-y divide-outline-variant">
              {failedPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-5 text-on-surface-variant">
                    No failed payments this period.
                  </td>
                </tr>
              )}
              {failedPayments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 whitespace-nowrap">
                    {p.createdAt.toLocaleString()}
                  </td>
                  <td className="p-3">{p.phone ?? '—'}</td>
                  <td className="p-3 font-semibold tabular-nums">
                    {p.amount.toLocaleString()}
                  </td>
                  <td className="p-3 text-on-surface-variant font-medium max-w-sm">
                    {p.failureReason || 'Failed (no reason returned)'}
                  </td>
                  <td className="p-3">
                    {p.booking
                      ? `${p.booking.reference} · ${p.booking.client.fullName}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {canExport ? (
        <a
          href="/api/export/car-hire?report=bookings"
          className="inline-flex rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,92,240,0.28)]"
        >
          Export financial booking ledger
        </a>
      ) : null}
    </PageShell>
  )
}
