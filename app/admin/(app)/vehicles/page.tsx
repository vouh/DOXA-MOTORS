import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { Card, Th, StatusPill, SectionHead, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'
import NewVehicleButton from '@/components/admin/NewVehicleButton'

export const dynamic = 'force-dynamic'
export default async function VehiclesPage() {
  const loaded = await softQuery(() =>
    Promise.all([
      prisma.carOwner.findMany({ where: { active: true }, orderBy: { fullName: 'asc' } }),
      prisma.carVehicle.findMany({
        include: {
          owner: true,
          documents: true,
          bookings: {
            where: { status: { in: ['DISPATCHED', 'OVERDUE'] } },
            include: { client: true },
            take: 1,
          },
        },
        orderBy: { regNumber: 'asc' },
      }),
    ]),
  )
  const [owners, vehicles] = loaded.data ?? [[], []]
  const statuses = ['AVAILABLE', 'RESERVED', 'HIRED', 'MAINTENANCE'] as const
  const icons: Record<(typeof statuses)[number], string> = {
    AVAILABLE: 'garage',
    RESERVED: 'event_available',
    HIRED: 'directions_car',
    MAINTENANCE: 'build',
  }
  const kpiItems = statuses.map((status) => {
    const count = vehicles.filter((v) => v.status === status).length
    return {
      id: status,
      label: status.replaceAll('_', ' '),
      value: String(count),
      numericValue: count,
      icon: icons[status],
      kind: 'count' as const,
    }
  })

  return (
    <PageShell>
      <SectionHead
        title="Fleet & Documents"
        subtitle="Vehicle status, rates, and expiry tracking"
        action={<NewVehicleButton owners={owners.map(({ id, fullName }) => ({ id, fullName }))} />}
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <KpiPanel items={kpiItems} title="Fleet status" />
      {!owners.length ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Register a fleet owner before adding a vehicle.
        </p>
      ) : null}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th
              cols={[
                'Reg No',
                'Vehicle',
                'Owner',
                'Rate / Day',
                'Status',
                'Current Client',
                'Document Expiry',
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {vehicles.map((vehicle) => {
                const active = vehicle.bookings[0]
                return (
                  <tr key={vehicle.id} className="hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 font-mono font-bold">{vehicle.regNumber}</td>
                    <td className="px-4 py-3">
                      {vehicle.make} {vehicle.model}
                      <small className="block text-on-surface-variant">
                        {vehicle.type.replaceAll('_', ' ')}
                      </small>
                    </td>
                    <td className="px-4 py-3">{vehicle.owner.fullName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      KES {vehicle.dailyRate.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={vehicle.status} />
                    </td>
                    <td className="px-4 py-3">{active?.client.fullName ?? '—'}</td>
                    <td className="px-4 py-3">
                      {vehicle.documents.map((d) => (
                        <small className="block text-on-surface-variant" key={d.id}>
                          {d.type}: {d.expiryDate.toLocaleDateString()}
                        </small>
                      ))}
                    </td>
                  </tr>
                )
              })}
              {!vehicles.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    {loaded.error ? 'Could not load vehicles.' : 'No vehicles registered.'}
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
