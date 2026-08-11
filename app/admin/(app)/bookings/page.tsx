import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import {
  checkInCarBooking,
  createCarBooking,
  createPenaltyRule,
  dispatchCarBooking,
  recordCarPayment,
} from '@/app/actions/car-hire'
import { Card, Th, StatusPill, SectionHead, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'
const field =
  'w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-0'
const cta =
  'rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,92,240,0.28)]'

export default async function BookingsPage() {
  const profile = await getSessionProfile()
  const canExport = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.REPORT_EXPORT))
    : false
  const loaded = await softQuery(() =>
    Promise.all([
      prisma.carClient.findMany({ where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
      prisma.carVehicle.findMany({ where: { status: 'AVAILABLE' }, orderBy: { regNumber: 'asc' } }),
      prisma.carBooking.findMany({
        include: { client: true, vehicle: true, payments: { where: { status: 'COMPLETED' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.penaltyRule.findFirst({ where: { active: true }, orderBy: { effectiveFrom: 'desc' } }),
    ]),
  )
  const [clients, vehicles, bookings, rule] = loaded.data ?? [[], [], [], null]
  return (
    <PageShell>
      <SectionHead
        title="Bookings, Dispatch & Check-in"
        subtitle="Create hires, dispatch, check in, and record payments"
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <details>
            <summary className="cursor-pointer list-none border-b border-outline-variant px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
              New booking
            </summary>
            <form
              action={async (data) => {
                'use server'
                await createCarBooking(data)
              }}
              className="mt-1 grid gap-4 px-5 py-5 sm:grid-cols-2"
            >
              <select className={field} name="clientId" required>
                <option value="">Select client *</option>
                {clients.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.fullName} · {c.phone}
                  </option>
                ))}
              </select>
              <select className={field} name="vehicleId" required>
                <option value="">Available vehicle *</option>
                {vehicles.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.regNumber} · {v.make} {v.model}
                  </option>
                ))}
              </select>
              <label className="text-xs text-on-surface-variant">
                Start
                <input className={`${field} mt-1 block`} name="startAt" type="datetime-local" required />
              </label>
              <label className="text-xs text-on-surface-variant">
                Expected return
                <input
                  className={`${field} mt-1 block`}
                  name="expectedReturnAt"
                  type="datetime-local"
                  required
                />
              </label>
              <input className={field} name="dailyRate" type="number" min="1" placeholder="Daily rate *" required />
              <input className={field} name="dispatchNotes" placeholder="Booking notes" />
              <button className={`${cta} sm:col-span-2 sm:justify-self-start`}>Create booking</button>
            </form>
          </details>
        </Card>
        <Card className="overflow-hidden">
          <details>
            <summary className="cursor-pointer list-none border-b border-outline-variant px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
              Penalty settings
            </summary>
            <div className="px-5 py-5">
              <p className="text-xs text-on-surface-variant">
                Current:{' '}
                {rule
                  ? `${rule.graceMinutes} min grace; KES ${rule.rate}/${rule.rateUnit.toLowerCase()}`
                  : 'No active rule'}
              </p>
              <form
                action={async (data) => {
                  'use server'
                  await createPenaltyRule(data)
                }}
                className="mt-4 grid gap-4 sm:grid-cols-2"
              >
                <input className={field} name="name" placeholder="Rule name *" required />
                <input
                  className={field}
                  name="graceMinutes"
                  type="number"
                  min="0"
                  placeholder="Grace minutes *"
                  required
                />
                <input
                  className={field}
                  name="rate"
                  type="number"
                  min="0"
                  placeholder="Penalty rate *"
                  required
                />
                <select className={field} name="rateUnit">
                  <option value="HOUR">Per hour</option>
                  <option value="DAY">Per day</option>
                </select>
                <input className={field} name="cap" type="number" min="1" placeholder="Optional cap" />
                <button className={`${cta} sm:justify-self-start`}>Activate rule</button>
              </form>
            </div>
          </details>
        </Card>
      </div>
      {canExport ? (
        <a
          href="/api/export/car-hire?report=bookings"
          className="inline-flex rounded-full border border-outline-variant bg-white px-5 py-2.5 text-sm font-medium text-on-surface shadow-sm hover:border-primary hover:text-primary"
        >
          Export booking report
        </a>
      ) : null}      <Card className="overflow-hidden">
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
                'Workflow',
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {bookings.map((booking) => {
                const paid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0)
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
                        Balance {Math.max(0, booking.totalCharge - paid).toLocaleString()}
                      </small>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={booking.status} />
                    </td>
                    <td className="min-w-52 px-4 py-3">
                      {booking.status === 'RESERVED' && (
                        <details>
                          <summary className="cursor-pointer text-primary">Dispatch</summary>
                          <form
                            action={async (data) => {
                              'use server'
                              await dispatchCarBooking(booking.id, data)
                            }}
                            className="grid gap-2 pt-2"
                          >
                            <input className={field} name="dentsNotes" placeholder="Existing dents" />
                            <input
                              className={field}
                              name="fuelLevel"
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Fuel %"
                            />
                            <input className={field} name="odometer" type="number" placeholder="Odometer" />
                            <input type="hidden" name="componentsOk" value="true" />
                            <button className="rounded-full bg-primary px-3 py-2 text-white text-xs font-semibold">
                              Confirm dispatch
                            </button>
                          </form>
                        </details>
                      )}
                      {['DISPATCHED', 'OVERDUE'].includes(booking.status) && (
                        <details>
                          <summary className="cursor-pointer text-primary">Check in</summary>
                          <form
                            action={async (data) => {
                              'use server'
                              await checkInCarBooking(booking.id, data)
                            }}
                            className="grid gap-2 pt-2"
                          >
                            <input
                              className={field}
                              name="actualReturnAt"
                              type="datetime-local"
                              required
                            />
                            <input
                              className={field}
                              name="dentsNotes"
                              placeholder="Return condition / dents"
                            />
                            <input
                              className={field}
                              name="fuelLevel"
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Fuel %"
                            />
                            <input className={field} name="odometer" type="number" placeholder="Odometer" />
                            <input type="hidden" name="componentsOk" value="true" />
                            <button className="rounded-full bg-primary px-3 py-2 text-white text-xs font-semibold">
                              Calculate & check in
                            </button>
                          </form>
                        </details>
                      )}
                      <details>
                        <summary className="cursor-pointer text-primary">Record payment</summary>
                        <form
                          action={async (data) => {
                            'use server'
                            await recordCarPayment(data)
                          }}
                          className="grid gap-2 pt-2"
                        >
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <input
                            className={field}
                            name="amount"
                            type="number"
                            min=".01"
                            step=".01"
                            placeholder="Amount"
                            required
                          />
                          <select className={field} name="method">
                            <option>MPESA</option>
                            <option>CASH</option>
                            <option>BANK</option>
                            <option>OTHER</option>
                          </select>
                          <input className={field} name="mpesaRef" placeholder="M-Pesa reference" />
                          <button className="rounded-full bg-primary px-3 py-2 text-white text-xs font-semibold">
                            Save payment
                          </button>
                        </form>
                      </details>
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
