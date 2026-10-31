import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { Card, StatusPill, Th, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'
import BookingViewButton from '@/components/admin/BookingViewButton'

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
        include: {
          client: true,
          vehicle: true,
          payments: { orderBy: { createdAt: 'desc' } },
          checks: { orderBy: { createdAt: 'desc' } },
          penalties: { orderBy: { createdAt: 'desc' } },
          extraCharges: { orderBy: { createdAt: 'asc' } },
          penaltyRule: true,
        },
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
      prisma.vehicleDocument.count({
        where: { expiryDate: { lte: expiryLimit } },
      }),
    ]),
  )
  const [vehicles, bookings, todayMoney, monthMoney, expiringCount] = loaded.data ?? [
    [],
    [],
    { _sum: { amount: null as number | null } },
    { _sum: { amount: null as number | null } },
    0,
  ]

  const bookingRows = bookings

  const owed = bookingRows.reduce((sum, b) => {
    const paid = b.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((p, x) => p + x.amount, 0)
    return sum + Math.max(0, b.totalCharge - (b.loyaltyDiscountKes ?? 0) - paid)
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
      value: String(expiringCount),
      numericValue: expiringCount,
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
      <Card className="overflow-hidden">
        <div className="border-b border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface dark:text-blue-50 dark:border-[#1e3a5f]">
          Live hires & balances
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <Th cols={['Booking', 'Client', 'Vehicle', 'Due', 'Balance', 'Status', '']} />
            <tbody className="divide-y divide-outline-variant">
              {bookingRows.map((b) => {
                const paid = b.payments
                  .filter((p) => p.status === 'COMPLETED')
                  .reduce((s, p) => s + p.amount, 0)
                const balance = Math.max(0, b.totalCharge - (b.loyaltyDiscountKes ?? 0) - paid)
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-surface-container-low/60 dark:hover:bg-white/5 dark:text-blue-100"
                  >
                    <td className="p-3 font-mono">{b.reference}</td>
                    <td className="p-3">{b.client.fullName}</td>
                    <td className="p-3">{b.vehicle.regNumber}</td>
                    <td className="p-3">{b.expectedReturnAt.toLocaleString()}</td>
                    <td className="p-3 font-semibold tabular-nums">
                      {balance.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="p-3 text-right">
                      <BookingViewButton
                        booking={{
                          id: b.id,
                          reference: b.reference,
                          status: b.status,
                          clientName: b.client.fullName,
                          clientPhone: b.client.phone,
                          vehicleLabel: `${b.vehicle.make} ${b.vehicle.model} (${b.vehicle.regNumber})`,
                          startAt: b.startAt.toISOString(),
                          expectedReturnAt: b.expectedReturnAt.toISOString(),
                          dispatchedAt: b.dispatchedAt?.toISOString() ?? null,
                          returnedAt: b.returnedAt?.toISOString() ?? null,
                          days: b.days,
                          dailyRate: b.dailyRate,
                          baseCharge: b.baseCharge,
                          additionalCharge: b.additionalCharge,
                          penaltyAmount: b.penaltyAmount,
                          totalCharge: b.totalCharge,
                          dispatchNotes: b.dispatchNotes,
                          returnNotes: b.returnNotes,
                          paid,
                          balance,
                          payments: b.payments.map((p) => ({
                            id: p.id,
                            amount: p.amount,
                            method: p.method,
                            mpesaRef: p.mpesaRef,
                            paidAt: p.paidAt?.toISOString() ?? null,
                            status: p.status,
                          })),
                          checks: b.checks.map((c) => ({
                            stage: c.stage,
                            dentsNotes: c.dentsNotes,
                            fuelLevel: c.fuelLevel,
                            odometer: c.odometer,
                            checkedBy: c.checkedBy,
                            createdAt: c.createdAt.toISOString(),
                          })),
                          penalties: b.penalties.map((p) => ({
                            minutesLate: p.minutesLate,
                            amount: p.amount,
                            calculationNotes: p.calculationNotes,
                            createdAt: p.createdAt.toISOString(),
                          })),
                          extraCharges: (b.extraCharges ?? []).map((e) => ({
                            stage: e.stage,
                            description: e.description,
                            amount: e.amount,
                          })),
                          penaltyRule: b.penaltyRule
                            ? {
                                graceMinutes: b.penaltyRule.graceMinutes,
                                rate: b.penaltyRule.rate,
                                rateUnit: b.penaltyRule.rateUnit,
                                cap: b.penaltyRule.cap,
                              }
                            : null,
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
              {!bookingRows.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    {loaded.error ? 'Could not load hires.' : 'No active hires.'}
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
