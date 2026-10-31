import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { Card, Th, SectionHead, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'
import OwnersAddButton from '@/components/admin/OwnersAddButton'
import OwnerViewButton from '@/components/admin/OwnerViewButton'
import { ensureDoxaCompanyOwner } from '@/lib/car-hire/company-owner'
import { loadOwnersEarningsMap } from '@/lib/intelligence/finance'

export const dynamic = 'force-dynamic'

function kes(n: number) {
  return `KES ${n.toLocaleString()}`
}

export default async function OwnersPage() {
  const profile = await getSessionProfile()
  const canCreate = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.OWNER_CREATE))
    : false
  const canEdit = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.OWNER_EDIT))
    : false
  const canAssign = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.VEHICLE_ASSIGN_OWNER))
    : false
  const canPayout = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.OWNER_PAYOUT))
    : false
  const canExport = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.REPORT_EXPORT))
    : false

  const loaded = await softQuery(async () => {
    await ensureDoxaCompanyOwner()
    const [owners, fleetVehicles, earningsMap] = await Promise.all([
      prisma.carOwner.findMany({
        include: {
          vehicles: {
            select: {
              id: true,
              regNumber: true,
              make: true,
              model: true,
              type: true,
              status: true,
              dailyRate: true,
            },
            orderBy: { regNumber: 'asc' },
          },
          payouts: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.carVehicle.findMany({
        select: {
          id: true,
          regNumber: true,
          make: true,
          model: true,
          ownerId: true,
          owner: { select: { fullName: true } },
        },
        orderBy: { regNumber: 'asc' },
      }),
      loadOwnersEarningsMap(),
    ])
    return { owners, fleetVehicles, earningsMap }
  })

  const owners = loaded.data?.owners ?? []
  const fleetVehicles = loaded.data?.fleetVehicles ?? []
  const earningsMap = loaded.data?.earningsMap ?? new Map()
  const fleetOpts = fleetVehicles.map((v) => ({
    id: v.id,
    regNumber: v.regNumber,
    make: v.make,
    model: v.model,
    ownerId: v.ownerId,
    ownerName: v.owner.fullName,
  }))

  return (
    <PageShell>
      <SectionHead
        title="Owner Management"
        action={
          canExport || canCreate ? (
            <div className="flex items-center gap-2">
              {canExport ? (
                <a
                  href="/api/export/car-hire?report=owners"
                  className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-3 text-[12px] font-semibold text-on-surface shadow-sm transition hover:border-primary hover:text-primary dark:border-[#1e3a5f] dark:bg-[#0a1628]"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Export owner report
                </a>
              ) : null}
              {canCreate ? <OwnersAddButton /> : null}
            </div>
          ) : null
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-[13px]">
            <Th
              cols={[
                'Owner',
                'Phone',
                'Vehicles',
                'Total earned',
                'Doxa share',
                'Owner share',
                'Split',
                'Action',
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {owners.map((owner) => {
                const earnings = earningsMap.get(owner.id)
                const total = earnings?.totalEarned ?? 0
                const doxa = earnings?.doxaShare ?? 0
                const ownerShare = earnings?.ownerShare ?? 0
                return (
                  <tr key={owner.id} className="hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 font-semibold">
                      {owner.fullName}
                      <small className="block font-normal text-on-surface-variant">
                        {owner.nationalId}
                      </small>
                    </td>
                    <td className="px-4 py-3">{owner.phone}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{owner.vehicles.length}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{kes(total)}</td>
                    <td className="px-4 py-3 tabular-nums text-on-surface-variant">{kes(doxa)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-primary">
                      {kes(ownerShare)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {owner.commissionType === 'PERCENTAGE'
                        ? `${owner.commissionValue}% Doxa`
                        : `${kes(owner.commissionValue)} Doxa`}
                    </td>
                    <td className="px-4 py-3">
                      <OwnerViewButton
                        canEdit={canEdit}
                        canAssign={canAssign}
                        canPayout={canPayout}
                        fleetVehicles={fleetOpts}
                        owner={{
                          id: owner.id,
                          fullName: owner.fullName,
                          phone: owner.phone,
                          email: owner.email,
                          nationalId: owner.nationalId,
                          kraPin: owner.kraPin,
                          bankDetails: owner.bankDetails,
                          mpesaNumber: owner.mpesaNumber,
                          nextOfKin: owner.nextOfKin,
                          commissionType: owner.commissionType,
                          commissionValue: owner.commissionValue,
                          recurringDeduction: owner.recurringDeduction,
                          active: owner.active,
                          vehicles: owner.vehicles,
                          latestPayoutNet: owner.payouts[0]?.netPay ?? 0,
                          latestPayoutStatus: owner.payouts[0]?.status ?? null,
                          totalEarned: total,
                          doxaShare: doxa,
                          ownerShare,
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
              {!owners.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                    {loaded.error
                      ? 'Could not load owners.'
                      : canCreate
                        ? 'No owners yet. Use Add new owner to register one.'
                        : 'No owners registered.'}
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
