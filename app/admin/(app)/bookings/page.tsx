import { prisma } from '@/lib/prisma'
import { checkInCarBooking, createCarBooking, createPenaltyRule, dispatchCarBooking, recordCarPayment } from '@/app/actions/car-hire'
import { Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
const field = 'rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm'

export default async function BookingsPage() {
  const [clients, vehicles, bookings, rule] = await Promise.all([
    prisma.carClient.findMany({ where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
    prisma.carVehicle.findMany({ where: { status: 'AVAILABLE' }, orderBy: { regNumber: 'asc' } }),
    prisma.carBooking.findMany({
      include: { client: true, vehicle: true, payments: { where: { status: 'COMPLETED' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.penaltyRule.findFirst({ where: { active: true }, orderBy: { effectiveFrom: 'desc' } }),
  ])
  return <div className="space-y-4">
    <SectionHead title="Bookings, Dispatch & Check-in" />
    <div className="grid gap-4 lg:grid-cols-2">
      <details className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <summary className="cursor-pointer font-semibold text-primary">New booking</summary>
        <form action={async data => { 'use server'; await createCarBooking(data) }} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select className={field} name="clientId" required><option value="">Select client *</option>{clients.map(c => <option value={c.id} key={c.id}>{c.fullName} · {c.phone}</option>)}</select>
          <select className={field} name="vehicleId" required><option value="">Available vehicle *</option>{vehicles.map(v => <option value={v.id} key={v.id}>{v.regNumber} · {v.make} {v.model}</option>)}</select>
          <label className="text-xs">Start<input className={`${field} block w-full`} name="startAt" type="datetime-local" required /></label>
          <label className="text-xs">Expected return<input className={`${field} block w-full`} name="expectedReturnAt" type="datetime-local" required /></label>
          <input className={field} name="dailyRate" type="number" min="1" placeholder="Daily rate *" required />
          <input className={field} name="dispatchNotes" placeholder="Booking notes" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Create booking</button>
        </form>
      </details>
      <details className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <summary className="cursor-pointer font-semibold text-primary">Penalty settings</summary>
        <p className="mt-2 text-xs opacity-70">Current: {rule ? `${rule.graceMinutes} min grace; KES ${rule.rate}/${rule.rateUnit.toLowerCase()}` : 'No active rule'}</p>
        <form action={async data => { 'use server'; await createPenaltyRule(data) }} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className={field} name="name" placeholder="Rule name *" required />
          <input className={field} name="graceMinutes" type="number" min="0" placeholder="Grace minutes *" required />
          <input className={field} name="rate" type="number" min="0" placeholder="Penalty rate *" required />
          <select className={field} name="rateUnit"><option value="HOUR">Per hour</option><option value="DAY">Per day</option></select>
          <input className={field} name="cap" type="number" min="1" placeholder="Optional cap" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Activate rule</button>
        </form>
      </details>
    </div>
    <a href="/api/export/car-hire?report=bookings" className="inline-block rounded-lg border border-outline-variant px-4 py-2 text-sm">Export booking report</a>
    <Card><div className="overflow-x-auto"><table className="w-full text-[13px]">
      <Th cols={['Booking', 'Client / Vehicle', 'Period', 'Charge', 'Paid / Balance', 'Status', 'Workflow']} />
      <tbody className="divide-y divide-outline-variant">{bookings.map(booking => {
        const paid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0)
        return <tr key={booking.id}>
          <td className="px-4 py-3 font-mono font-semibold">{booking.reference}</td>
          <td className="px-4 py-3 font-semibold">{booking.client.fullName}<small className="block font-normal opacity-60">{booking.vehicle.regNumber}</small></td>
          <td className="px-4 py-3 whitespace-nowrap">{booking.startAt.toLocaleDateString()} → {booking.expectedReturnAt.toLocaleDateString()}</td>
          <td className="px-4 py-3">KES {booking.totalCharge.toLocaleString()}<small className="block opacity-60">{booking.days} day(s); penalty {booking.penaltyAmount.toLocaleString()}</small></td>
          <td className="px-4 py-3">KES {paid.toLocaleString()}<small className="block text-amber-700">Balance {Math.max(0, booking.totalCharge-paid).toLocaleString()}</small></td>
          <td className="px-4 py-3"><StatusPill status={booking.status} /></td>
          <td className="px-4 py-3 min-w-52">
            {booking.status === 'RESERVED' && <details><summary className="cursor-pointer text-primary">Dispatch</summary><form action={async data => { 'use server'; await dispatchCarBooking(booking.id, data) }} className="grid gap-2 pt-2"><input className={field} name="dentsNotes" placeholder="Existing dents" /><input className={field} name="fuelLevel" type="number" min="0" max="100" placeholder="Fuel %" /><input className={field} name="odometer" type="number" placeholder="Odometer" /><input type="hidden" name="componentsOk" value="true" /><button className="rounded bg-primary p-2 text-white">Confirm dispatch</button></form></details>}
            {['DISPATCHED','OVERDUE'].includes(booking.status) && <details><summary className="cursor-pointer text-primary">Check in</summary><form action={async data => { 'use server'; await checkInCarBooking(booking.id, data) }} className="grid gap-2 pt-2"><input className={field} name="actualReturnAt" type="datetime-local" required /><input className={field} name="dentsNotes" placeholder="Return condition / dents" /><input className={field} name="fuelLevel" type="number" min="0" max="100" placeholder="Fuel %" /><input className={field} name="odometer" type="number" placeholder="Odometer" /><input type="hidden" name="componentsOk" value="true" /><button className="rounded bg-primary p-2 text-white">Calculate & check in</button></form></details>}
            <details><summary className="cursor-pointer text-primary">Record payment</summary><form action={async data => { 'use server'; await recordCarPayment(data) }} className="grid gap-2 pt-2"><input type="hidden" name="bookingId" value={booking.id}/><input className={field} name="amount" type="number" min=".01" step=".01" placeholder="Amount" required/><select className={field} name="method"><option>MPESA</option><option>CASH</option><option>BANK</option><option>OTHER</option></select><input className={field} name="mpesaRef" placeholder="M-Pesa reference"/><button className="rounded bg-primary p-2 text-white">Save payment</button></form></details>
          </td>
        </tr>
      })}{!bookings.length && <tr><td colSpan={7} className="p-8 text-center opacity-60">No bookings yet.</td></tr>}</tbody>
    </table></div></Card>
  </div>
}
