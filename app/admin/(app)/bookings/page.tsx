import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { Card, Th, StatusPill, SectionHead, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'
import NewBookingButton from '@/components/admin/NewBookingButton'
import PenaltySettingsButton from '@/components/admin/PenaltySettingsButton'
import BookingViewButton from '@/components/admin/BookingViewButton'

export const dynamic = 'force-dynamic'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const { clientId: preselectClientId = '' } = await searchParams
  const profile = await getSessionProfile()
  const canExport = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.REPORT_EXPORT))
    : false
  const isSuperAdmin = Boolean(profile?.isSuperAdmin)
  const loaded = await softQuery(() =>
    Promise.all([
      prisma.carClient.findMany({ where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
      prisma.carVehicle.findMany({ where: { status: 'AVAILABLE' }, orderBy: { regNumber: 'asc' } }),
      prisma.carBooking.findMany({
        include: {
          client: true,
          vehicle: true,
          payments: { orderBy: { createdAt: 'desc' } },
          checks: { orderBy: { createdAt: 'desc' } },
          penalties: { orderBy: { createdAt: 'desc' } },
          extraCharges: { orderBy: { createdAt: 'asc' } },
          penaltyRule: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.penaltyRule.findMany({
        where: { active: true },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]),
  )
  const [clients, vehicles, bookings, rules] = loaded.data ?? [[], [], [], []]
  const openNewBooking = Boolean(preselectClientId)
  const defaultRule = rules[0] ?? null
  const penaltyLabel = defaultRule
    ? `${defaultRule.graceMinutes} min grace; KES ${defaultRule.rate}/${defaultRule.rateUnit.toLowerCase()}${
        rules.length > 1 ? ` (+${rules.length - 1} more)` : ''
      }`
    : 'No active rule'

  return (
    <PageShell>
      <SectionHead
        title="Bookings"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <a
                href="/api/export/car-hire?report=bookings"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-[12px] font-semibold text-on-surface shadow-sm transition hover:border-primary hover:text-primary dark:border-[#1e3a5f] dark:bg-[#0a1628]"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export
              </a>
            ) : null}
            {isSuperAdmin ? <PenaltySettingsButton currentLabel={penaltyLabel} /> : null}
            <NewBookingButton
              clients={clients.map((c) => ({
                id: c.id,
                label: `${c.fullName} · ${c.phone}`,
              }))}
              vehicles={vehicles.map((v) => ({
                id: v.id,
                label: `${v.regNumber} · ${v.make} ${v.model} · KES ${v.dailyRate.toLocaleString()}`,
                dailyRate: v.dailyRate,
              }))}
              defaultClientId={preselectClientId}
              autoOpen={openNewBooking}
            />
          </div>
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th
              cols={[
                'Booking',
                'Client / Vehicle',
                'Period',
                'Charge',
                'Paid / Balance',
                'Status',
                '',
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {bookings.map((booking) => {
                const paid = booking.payments
                  .filter((p) => p.status === 'COMPLETED')
                  .reduce((sum, payment) => sum + payment.amount, 0)
                const balance = Math.max(0, booking.totalCharge - (booking.loyaltyDiscountKes ?? 0) - paid)
                return (
                  <tr key={booking.id} className="hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 font-mono font-semibold">{booking.reference}</td>
                    <td className="px-4 py-3 font-semibold">
                      {booking.client.fullName}
                      <small className="block font-normal text-on-surface-variant">
                        {booking.vehicle.regNumber}
                      </small>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {booking.startAt.toLocaleDateString()} →{' '}
                      {booking.expectedReturnAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      KES {booking.totalCharge.toLocaleString()}
                      <small className="block text-on-surface-variant">
                        {booking.days} day(s); penalty {booking.penaltyAmount.toLocaleString()}
                      </small>
                    </td>
                    <td className="px-4 py-3">
                      KES {paid.toLocaleString()}
                      <small className="block text-amber-700">
                        Balance {balance.toLocaleString()}
                      </small>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BookingViewButton
                        booking={{
                          id: booking.id,
                          reference: booking.reference,
                          status: booking.status,
                          clientName: booking.client.fullName,
                          clientPhone: booking.client.phone,
                          vehicleLabel: `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.regNumber})`,
                          startAt: booking.startAt.toISOString(),
                          expectedReturnAt: booking.expectedReturnAt.toISOString(),
                          dispatchedAt: booking.dispatchedAt?.toISOString() ?? null,
                          returnedAt: booking.returnedAt?.toISOString() ?? null,
                          days: booking.days,
                          dailyRate: booking.dailyRate,
                          baseCharge: booking.baseCharge,
                          additionalCharge: booking.additionalCharge,
                          penaltyAmount: booking.penaltyAmount,
                          totalCharge: booking.totalCharge,
                          dispatchNotes: booking.dispatchNotes,
                          returnNotes: booking.returnNotes,
                          paid,
                          balance,
                          payments: booking.payments.map((p) => ({
                            id: p.id,
                            amount: p.amount,
                            method: p.method,
                            mpesaRef: p.mpesaRef,
                            paidAt: p.paidAt?.toISOString() ?? null,
                            status: p.status,
                          })),
                          checks: booking.checks.map((c) => ({
                            stage: c.stage,
                            dentsNotes: c.dentsNotes,
                            fuelLevel: c.fuelLevel,
                            odometer: c.odometer,
                            checkedBy: c.checkedBy,
                            createdAt: c.createdAt.toISOString(),
                          })),
                          penalties: booking.penalties.map((p) => ({
                            minutesLate: p.minutesLate,
                            amount: p.amount,
                            calculationNotes: p.calculationNotes,
                            createdAt: p.createdAt.toISOString(),
                          })),
                          extraCharges: (booking.extraCharges ?? []).map((e) => ({
                            stage: e.stage,
                            description: e.description,
                            amount: e.amount,
                          })),
                          penaltyRule: booking.penaltyRule
                            ? {
                                graceMinutes: booking.penaltyRule.graceMinutes,
                                rate: booking.penaltyRule.rate,
                                rateUnit: booking.penaltyRule.rateUnit,
                                cap: booking.penaltyRule.cap,
                              }
                            : null,
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
              {!bookings.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    {loaded.error ? 'Could not load bookings.' : 'No bookings yet.'}
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
