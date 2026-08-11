import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { Card, StatusPill, Th, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const dayEnd = new Date(dayStart.getTime() + 86_400_000)
  const expiryLimit = new Date(now.getTime() + 7 * 86_400_000)

  const loaded = await softQuery(() =>
    Promise.all([
      prisma.carVehicle.findMany(),
      prisma.carBooking.findMany({
        where: { status: { in: ['RESERVED', 'DISPATCHED', 'OVERDUE'] } },
        include: { client: true, vehicle: true, payments: { where: { status: 'COMPLETED' } } },
        orderBy: { expectedReturnAt: 'asc' },
      }),
      prisma.carPayment.aggregate({
        where: { status: 'COMPLETED', paidAt: { gte: dayStart } },
        _sum: { amount: true },
      }),
      prisma.carPayment.aggregate({
        where: { status: 'COMPLETED', paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.vehicleDocument.findMany({
        where: { expiryDate: { lte: expiryLimit } },
        include: { vehicle: true },
        orderBy: { expiryDate: 'asc' },
      }),
    ]),
  )
  const [vehicles, bookings, todayMoney, monthMoney, expiring] = loaded.data ?? [
    [],
    [],
    { _sum: { amount: null as number | null } },
    { _sum: { amount: null as number | null } },
    [],
  ]

  type BookingRow = (typeof bookings)[number] & {
    client?: { fullName: string }
    vehicle?: { regNumber: string }
    payments?: { amount: number }[]
  }
  type DocRow = (typeof expiring)[number] & {
    vehicle?: { regNumber: string }
  }

  const bookingRows = bookings as BookingRow[]
  const docRows = expiring as DocRow[]

  const owed = bookingRows.reduce((sum, b) => {
    const paid = (b.payments ?? []).reduce((p, x) => p + x.amount, 0)
    return sum + Math.max(0, b.totalCharge - paid)
  }, 0)
  const carsOut = vehicles.filter((v) => v.status === 'HIRED').length
  const parked = vehicles.filter((v) => v.status === 'AVAILABLE').length
  const dueToday = bookingRows.filter(
    (b) => b.expectedReturnAt >= dayStart && b.expectedReturnAt < dayEnd,
  ).length
  const overdue = bookingRows.filter(
    (b) => b.status === 'OVERDUE' || (b.status === 'DISPATCHED' && b.expectedReturnAt < now),
  ).length
  const collectedToday = todayMoney._sum.amount ?? 0
  const collectedMonth = monthMoney._sum.amount ?? 0

  const kpiItems = [
    {
      id: 'cars-out',
      label: 'Cars out',
      value: String(carsOut),
      numericValue: carsOut,
      icon: 'directions_car',
      kind: 'count' as const,
    },
    {
      id: 'parked',
      label: 'Parked / idle',
      value: String(parked),
      numericValue: parked,
      icon: 'garage',
      kind: 'count' as const,
    },
    {
      id: 'due-today',
      label: 'Due back today',
      value: String(dueToday),
      numericValue: dueToday,
      icon: 'event',
      kind: 'count' as const,
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: String(overdue),
      numericValue: overdue,
      icon: 'warning',
      kind: 'count' as const,
    },
    {
      id: 'expiring',
      label: 'Expiring documents',
      value: String(docRows.length),
      numericValue: docRows.length,
      icon: 'contract',
      kind: 'count' as const,
    },
    {
      id: 'today',
      label: 'Collected today',
      value: `KES ${collectedToday.toLocaleString()}`,
      numericValue: collectedToday,
      icon: 'payments',
      kind: 'money' as const,
    },
    {
      id: 'month',
      label: 'Collected month',
      value: `KES ${collectedMonth.toLocaleString()}`,
      numericValue: collectedMonth,
      icon: 'account_balance',
      kind: 'money' as const,
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: `KES ${owed.toLocaleString()}`,
      numericValue: owed,
      icon: 'receipt_long',
      kind: 'money' as const,
    },
  ]

  return (
    <PageShell className="!space-y-3">
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <KpiPanel
        items={kpiItems}
        title="Live status"
        subtitle="Live fleet, cash, and hire status"
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="border-b border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface dark:text-blue-50 dark:border-[#1e3a5f]">
            Live hires & balances
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <Th cols={['Booking', 'Client', 'Vehicle', 'Due', 'Balance', 'Status']} />
              <tbody className="divide-y divide-outline-variant">
                {bookingRows.map((b) => {
                  const paid = (b.payments ?? []).reduce((s, p) => s + p.amount, 0)
                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low/60 dark:hover:bg-white/5 dark:text-blue-100">
                      <td className="p-3 font-mono">{b.reference}</td>
                      <td className="p-3">{b.client?.fullName ?? '—'}</td>
                      <td className="p-3">{b.vehicle?.regNumber ?? '—'}</td>
                      <td className="p-3">{b.expectedReturnAt.toLocaleString()}</td>
                      <td className="p-3 font-semibold tabular-nums">
                        {Math.max(0, b.totalCharge - paid).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <StatusPill status={b.status} />
                      </td>
                    </tr>
                  )
                })}
                {!bookingRows.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      {loaded.error ? 'Could not load hires.' : 'No active hires.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface dark:text-blue-50 dark:border-[#1e3a5f]">
            Document alerts
          </div>
          <div className="divide-y divide-outline-variant dark:divide-[#1e3a5f]">
            {docRows.map((d) => (
              <div className="p-3 text-sm dark:text-blue-100" key={d.id}>
                <strong>{d.vehicle?.regNumber ?? '—'}</strong>
                <p className="text-xs text-on-surface-variant dark:text-blue-200/50">
                  {d.type} · {d.expiryDate.toLocaleDateString()}
                </p>
              </div>
            ))}
            {!docRows.length && (
              <p className="p-4 text-sm text-on-surface-variant dark:text-blue-200/45">
                {loaded.error ? 'Could not load documents.' : 'No documents expiring within 7 days.'}
              </p>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
