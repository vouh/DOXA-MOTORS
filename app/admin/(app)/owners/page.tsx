import { prisma } from '@/lib/prisma'
import { createCarOwner, generateOwnerPayout } from '@/app/actions/car-hire'
import { Card, Th, SectionHead, StatusPill } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
const field = 'rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm'

export default async function OwnersPage() {
  const owners = await prisma.carOwner.findMany({
    include: { _count: { select: { vehicles: true } }, payouts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { fullName: 'asc' },
  })
  return <div className="space-y-4">
    <SectionHead title="Owner Management" />
    <details className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <summary className="cursor-pointer font-semibold text-primary">Register fleet owner</summary>
      <form action={async (data) => { 'use server'; await createCarOwner(data) }} className="mt-4 grid gap-3 md:grid-cols-3">
        <input className={field} name="fullName" placeholder="Full name *" required />
        <input className={field} name="phone" placeholder="Phone *" required />
        <input className={field} name="email" type="email" placeholder="Email" />
        <input className={field} name="nationalId" placeholder="National ID *" required />
        <input className={field} name="kraPin" placeholder="KRA PIN" />
        <input className={field} name="mpesaNumber" placeholder="M-Pesa number" />
        <input className={field} name="bankDetails" placeholder="Bank account details" />
        <input className={field} name="nextOfKin" placeholder="Next of kin" />
        <select className={field} name="commissionType"><option value="PERCENTAGE">Percentage commission</option><option value="FIXED">Fixed commission</option></select>
        <input className={field} name="commissionValue" type="number" min="0" step=".01" placeholder="Commission value" required />
        <input className={field} name="recurringDeduction" type="number" min="0" step=".01" placeholder="Recurring deduction" defaultValue="0" />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Save owner</button>
      </form>
    </details>
    <a href="/api/export/car-hire?report=owners" className="inline-block rounded-lg border border-outline-variant px-4 py-2 text-sm">Export owner report</a>
    <Card><div className="overflow-x-auto"><table className="w-full text-[13px]">
      <Th cols={['Owner', 'Phone', 'Vehicles', 'Commission', 'Latest Net Payout', 'Status', 'Action']} />
      <tbody className="divide-y divide-outline-variant">{owners.map(owner => {
        const payout = owner.payouts[0]
        return <tr key={owner.id}>
          <td className="px-4 py-3 font-semibold">{owner.fullName}<small className="block opacity-60">{owner.nationalId}</small></td>
          <td className="px-4 py-3">{owner.phone}</td><td className="px-4 py-3 text-center">{owner._count.vehicles}</td>
          <td className="px-4 py-3">{owner.commissionValue}{owner.commissionType === 'PERCENTAGE' ? '%' : ' KES'}</td>
          <td className="px-4 py-3 font-semibold">KES {(payout?.netPay ?? 0).toLocaleString()}</td>
          <td className="px-4 py-3"><StatusPill status={payout?.status ?? 'No statement'} /></td>
          <td className="px-4 py-3"><form action={async () => { 'use server'; const now = new Date(); await generateOwnerPayout(owner.id, new Date(now.getFullYear(), now.getMonth(), 1), now) }}><button className="text-primary underline">Generate month</button></form></td>
        </tr>
      })}{!owners.length && <tr><td colSpan={7} className="p-8 text-center opacity-60">No owners registered.</td></tr>}</tbody>
    </table></div></Card>
  </div>
}
