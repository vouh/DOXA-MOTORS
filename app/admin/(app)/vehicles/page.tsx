import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { Card, Th, StatusPill, SectionHead, PageShell } from '@/components/admin/ui'
import KpiPanel from '@/components/admin/KpiPanel'
import ServiceAlert from '@/components/admin/ServiceAlert'
import VehiclesToolbar from '@/components/admin/VehiclesToolbar'
import VehicleViewButton from '@/components/admin/VehicleViewButton'
import { getCategoryStartingPrices } from '@/lib/settings/hire-settings'
import {
  ensureDoxaCompanyOwner,
  formatOwnerOptionLabel,
  sortOwnersForPicker,
} from '@/lib/car-hire/company-owner'

export const dynamic = 'force-dynamic'
export default async function VehiclesPage() {
  const profile = await getSessionProfile()
  const canExpense = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.EXPENSE_RECORD))
    : false
  const loaded = await softQuery(async () => {
    await ensureDoxaCompanyOwner()
    return Promise.all([
      prisma.carOwner.findMany({ where: { active: true }, orderBy: { fullName: 'asc' } }),
      prisma.carVehicle.findMany({
        include: {
          owner: true,
          documents: true,
          bookings: {
            where: { status: { in: ['RESERVED', 'DISPATCHED', 'OVERDUE'] } },
            include: { client: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { regNumber: 'asc' },
      }),
      getCategoryStartingPrices(),
    ])
  })
  const [ownersRaw, vehicles, startingPrices] = loaded.data ?? [[], [], undefined]
  const owners = sortOwnersForPicker(ownersRaw).map((o) => ({
    id: o.id,
    fullName: formatOwnerOptionLabel(o),
  }))
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
        title="Fleet Management"
        action={
          <VehiclesToolbar
            owners={owners.map(({ id, fullName }) => ({ id, fullName }))}
            startingPrices={startingPrices}
          />
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <KpiPanel items={kpiItems} hideHeader />
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
                'Action',
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
                    <td className="px-4 py-3">
                      <a
                        href="/admin/owners"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        title="Open owners"
                      >
                        {vehicle.owner.fullName}
                      </a>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      KES {vehicle.dailyRate.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={vehicle.status} />
                    </td>
                    <td className="px-4 py-3">
                      {active?.client ? (
                        <a
                          href={`/admin/bookings?clientId=${active.client.id}`}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                          title="Open bookings for this client"
                        >
                          {active.client.fullName}
                          <small className="block font-normal text-on-surface-variant">
                            {active.reference} · {active.status.replaceAll('_', ' ')}
                          </small>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {vehicle.documents.map((d) => (
                        <small className="block text-on-surface-variant" key={d.id}>
                          {d.type}: {d.expiryDate.toLocaleDateString()}
                        </small>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <VehicleViewButton
                        canExpense={canExpense}
                        owners={owners.map(({ id, fullName }) => ({ id, fullName }))}
                        vehicle={{
                          id: vehicle.id,
                          ownerId: vehicle.ownerId,
                          regNumber: vehicle.regNumber,
                          make: vehicle.make,
                          model: vehicle.model,
                          year: vehicle.year,
                          color: vehicle.color,
                          type: vehicle.type,
                          dailyRate: vehicle.dailyRate,
                          status: vehicle.status,
                          imageUrl: vehicle.imageUrl,
                          ownerName: vehicle.owner.fullName,
                          ownerPhone: vehicle.owner.phone,
                          currentClient: active?.client.fullName ?? null,
                          currentClientId: active?.client.id ?? null,
                          currentBookingRef: active?.reference ?? null,
                          insuranceExpiry:
                            vehicle.documents
                              .find((d) => d.type === 'INSURANCE')
                              ?.expiryDate.toISOString()
                              .slice(0, 10) ?? null,
                          inspectionExpiry:
                            vehicle.documents
                              .find((d) => d.type === 'INSPECTION')
                              ?.expiryDate.toISOString()
                              .slice(0, 10) ?? null,
                          createdAt: vehicle.createdAt.toLocaleDateString(),
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
              {!vehicles.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">
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
