import { prisma } from '@/lib/prisma'
import { createCarVehicle } from '@/app/actions/car-hire'
import { Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
const field = 'rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm'

export default async function VehiclesPage() {
  const [owners, vehicles] = await Promise.all([
    prisma.carOwner.findMany({ where: { active: true }, orderBy: { fullName: 'asc' } }),
    prisma.carVehicle.findMany({
      include: {
        owner: true, documents: true,
        bookings: { where: { status: { in: ['DISPATCHED', 'OVERDUE'] } }, include: { client: true }, take: 1 },
      },
      orderBy: { regNumber: 'asc' },
    }),
  ])
  const counts = Object.fromEntries(['AVAILABLE', 'RESERVED', 'HIRED', 'MAINTENANCE'].map(status => [status, vehicles.filter(v => v.status === status).length]))
  return <div className="space-y-4">
    <SectionHead title="Fleet & Documents" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(counts).map(([status, count]) =>
      <Card key={status} className="p-4 text-center"><p className="font-number text-2xl font-bold">{count}</p><p className="text-xs opacity-60">{status}</p></Card>
    )}</div>
    <details className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <summary className="cursor-pointer font-semibold text-primary">Add vehicle</summary>
      {!owners.length ? <p className="mt-3 text-sm text-amber-700">Register an owner first.</p> :
      <form action={async data => { 'use server'; await createCarVehicle(data) }} className="mt-4 grid gap-3 md:grid-cols-3">
        <select className={field} name="ownerId" required><option value="">Select owner *</option>{owners.map(o => <option key={o.id} value={o.id}>{o.fullName}</option>)}</select>
        <input className={field} name="regNumber" placeholder="Registration *" required />
        <input className={field} name="make" placeholder="Make *" required />
        <input className={field} name="model" placeholder="Model *" required />
        <input className={field} name="year" type="number" placeholder="Year" />
        <input className={field} name="color" placeholder="Colour" />
        <select className={field} name="type" required><option value="SALOON">Saloon</option><option value="SUV_4X4">SUV / 4x4</option><option value="VAN_MINIBUS">Van / minibus</option><option value="PICKUP">Pickup</option><option value="ECONOMY">Economy</option></select>
        <input className={field} name="dailyRate" type="number" min="1" placeholder="Daily rate (KES) *" required />
        <label className="text-xs">Insurance expiry<input className={`${field} block w-full`} name="insuranceExpiry" type="date" /></label>
        <label className="text-xs">Inspection expiry<input className={`${field} block w-full`} name="inspectionExpiry" type="date" /></label>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Save vehicle</button>
      </form>}
    </details>
    <Card><div className="overflow-x-auto"><table className="w-full text-[13px]">
      <Th cols={['Reg No', 'Vehicle', 'Owner', 'Rate / Day', 'Status', 'Current Client', 'Document Expiry']} />
      <tbody className="divide-y divide-outline-variant">{vehicles.map(vehicle => {
        const active = vehicle.bookings[0]
        return <tr key={vehicle.id}>
          <td className="px-4 py-3 font-mono font-bold">{vehicle.regNumber}</td>
          <td className="px-4 py-3">{vehicle.make} {vehicle.model}<small className="block opacity-60">{vehicle.type.replaceAll('_', ' ')}</small></td>
          <td className="px-4 py-3">{vehicle.owner.fullName}</td><td className="px-4 py-3">KES {vehicle.dailyRate.toLocaleString()}</td>
          <td className="px-4 py-3"><StatusPill status={vehicle.status} /></td>
          <td className="px-4 py-3">{active?.client.fullName ?? '—'}</td>
          <td className="px-4 py-3">{vehicle.documents.map(d => <small className="block" key={d.id}>{d.type}: {d.expiryDate.toLocaleDateString()}</small>)}</td>
        </tr>
      })}{!vehicles.length && <tr><td colSpan={7} className="p-8 text-center opacity-60">No vehicles registered.</td></tr>}</tbody>
    </table></div></Card>
  </div>
}
