import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { createCarOwner, generateOwnerPayout } from '@/app/actions/car-hire'
import { Card, Th, SectionHead, StatusPill, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'
const field =
  'w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-0'
const cta =
  'rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,92,240,0.28)]'

export default async function OwnersPage() {
  const profile = await getSessionProfile()
  const canExport = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.REPORT_EXPORT))
    : false
  const loaded = await softQuery(() =>
    prisma.carOwner.findMany({
      include: {
        _count: { select: { vehicles: true } },
        payouts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { fullName: 'asc' },
    }),
  )
  const owners = loaded.data ?? []
  return (
    <PageShell>
      <SectionHead title="Owner Management" subtitle="Fleet owners, commissions, and monthly payouts" />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <Card className="overflow-hidden">
        <details>
          <summary className="cursor-pointer list-none border-b border-outline-variant px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
            Register fleet owner
          </summary>
          <form
            action={async (data) => {
              'use server'
              await createCarOwner(data)
            }}
            className="grid gap-4 px-5 py-5 md:grid-cols-3"
          >
            <input className={field} name="fullName" placeholder="Full name *" required />
            <input className={field} name="phone" placeholder="Phone *" required />
            <input className={field} name="email" type="email" placeholder="Email" />
            <input className={field} name="nationalId" placeholder="National ID *" required />
            <input className={field} name="kraPin" placeholder="KRA PIN" />
            <input className={field} name="mpesaNumber" placeholder="M-Pesa number" />
            <input className={field} name="bankDetails" placeholder="Bank account details" />
            <input className={field} name="nextOfKin" placeholder="Next of kin" />
            <select className={field} name="commissionType">
              <option value="PERCENTAGE">Percentage commission</option>
              <option value="FIXED">Fixed commission</option>
            </select>
            <input
              className={field}
              name="commissionValue"
              type="number"
              min="0"
              step=".01"
              placeholder="Commission value"
              required
            />
            <input
              className={field}
              name="recurringDeduction"
              type="number"
              min="0"
              step=".01"
              placeholder="Recurring deduction"
              defaultValue="0"
            />
            <button className={`${cta} md:justify-self-start`}>Save owner</button>
          </form>
        </details>
      </Card>
      {canExport ? (
        <a
          href="/api/export/car-hire?report=owners"
          className="inline-flex rounded-full border border-outline-variant bg-white px-5 py-2.5 text-sm font-medium shadow-sm hover:border-primary hover:text-primary"
        >
          Export owner report
        </a>
      ) : null}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th
              cols={[
                'Owner',
                'Phone',
                'Vehicles',
                'Commission',
                'Latest Net Payout',
                'Status',
                'Action',
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {owners.map((owner) => {
                const payout = owner.payouts[0]
                return (
                  <tr key={owner.id} className="hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 font-semibold">
                      {owner.fullName}
                      <small className="block font-normal text-on-surface-variant">
                        {owner.nationalId}
                      </small>
                    </td>
                    <td className="px-4 py-3">{owner.phone}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{owner._count.vehicles}</td>
                    <td className="px-4 py-3">
                      {owner.commissionValue}
                      {owner.commissionType === 'PERCENTAGE' ? '%' : ' KES'}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      KES {(payout?.netPay ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={payout?.status ?? 'No statement'} />
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={async () => {
                          'use server'
                          const now = new Date()
                          await generateOwnerPayout(
                            owner.id,
                            new Date(now.getFullYear(), now.getMonth(), 1),
                            now,
                          )
                        }}
                      >
                        <button className="text-primary underline">Generate month</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {!owners.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    {loaded.error ? 'Could not load owners.' : 'No owners registered.'}
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
