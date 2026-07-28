import { prisma } from '@/lib/prisma'
import { createCarClient, setCarClientStatus } from '@/app/actions/car-hire'
import { Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'

const input = 'rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const clients = await prisma.carClient.findMany({
    where: q ? { OR: [
      { fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } },
      { idOrPassportNo: { contains: q, mode: 'insensitive' } },
    ] } : undefined,
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return (
    <div className="space-y-4">
      <SectionHead title="Client Management" />
      <details className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <summary className="cursor-pointer font-semibold text-primary">Register client</summary>
        <form action={async (data) => { 'use server'; await createCarClient(data) }} className="mt-4 grid gap-3 md:grid-cols-3">
          <input className={input} name="fullName" placeholder="Full name *" required />
          <input className={input} name="phone" placeholder="Phone *" required />
          <input className={input} name="email" type="email" placeholder="Email" />
          <input className={input} name="idOrPassportNo" placeholder="National ID / passport *" required />
          <input className={input} name="licenceNo" placeholder="Driving licence *" required />
          <input className={input} name="licenceExpiry" type="date" aria-label="Licence expiry" />
          <input className={input} name="physicalAddress" placeholder="Physical address" />
          <input className={input} name="nextOfKin" placeholder="Next of kin / emergency contact" />
          <input className={input} name="employer" placeholder="Employer" />
          <input className={input} name="secondContact" placeholder="Second contact" />
          <textarea className={`${input} md:col-span-2`} name="notes" placeholder="Vetting notes" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Save client</button>
        </form>
      </details>
      <form className="flex gap-2">
        <input className={`${input} min-w-0 flex-1`} name="q" defaultValue={q} placeholder="Find by name, National ID or phone" />
        <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-white">Search</button>
        <a href="/api/export/car-hire?report=clients" className="rounded-lg border border-outline-variant px-4 py-2 text-sm">Export CSV</a>
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Name', 'Phone', 'ID / Passport', 'Licence', 'Trips', 'Status', 'Action']} />
            <tbody className="divide-y divide-outline-variant">
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3 font-semibold">{client.fullName}<small className="block opacity-60">{client.email}</small></td>
                  <td className="px-4 py-3">{client.phone}</td>
                  <td className="px-4 py-3">{client.idOrPassportNo}</td>
                  <td className="px-4 py-3">{client.licenceNo}</td>
                  <td className="px-4 py-3 text-center">{client._count.bookings}</td>
                  <td className="px-4 py-3"><StatusPill status={client.status === 'ACTIVE' ? 'Active' : 'Suspended'} /></td>
                  <td className="px-4 py-3">
                    <form action={async () => { 'use server'; await setCarClientStatus(client.id, client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE') }}>
                      <button className="text-primary underline">{client.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!clients.length && <tr><td colSpan={7} className="p-8 text-center opacity-60">No clients found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
