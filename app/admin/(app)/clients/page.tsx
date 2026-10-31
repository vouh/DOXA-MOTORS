import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import Link from 'next/link'
import { Card, Th, StatusPill, SectionHead, PageShell } from '@/components/admin/ui'
import NewClientButton from '@/components/admin/NewClientButton'
import ClientLiveSearch from '@/components/admin/ClientLiveSearch'
import ClientViewButton from '@/components/admin/ClientViewButton'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'

function maskSecret(value: string) {
  if (!value) return '••••••••'
  if (value.length <= 4) return '••••'
  return `${'•'.repeat(Math.min(6, value.length - 2))}${value.slice(-2)}`
}

function toDateInput(value: Date | null) {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

export default async function ClientsPage() {
  const profile = await getSessionProfile()
  const canExport = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.REPORT_EXPORT))
    : false
  const loaded = await softQuery(() =>
    prisma.carClient.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  )
  const clients = loaded.data ?? []

  return (
    <PageShell>
      <SectionHead
        title="Client Management"
        subtitle="Register, search, and manage hire clients"
        action={<NewClientButton />}
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <ClientLiveSearch canExport={canExport} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Name', 'Phone', 'ID / Passport', 'Licence', 'Trips', 'Status', 'Action']} />
            <tbody className="divide-y divide-outline-variant dark:divide-[#1e3a5f]">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-surface-container-low/60 dark:hover:bg-white/5 dark:text-blue-100"
                >
                  <td className="px-4 py-3 font-semibold">
                    {client.fullName}
                    <small className="block font-normal text-on-surface-variant dark:text-blue-200/45">
                      {client.email}
                    </small>
                  </td>
                  <td className="px-4 py-3">{client.phone}</td>
                  <td className="px-4 py-3 font-mono tracking-wider text-on-surface-variant dark:text-blue-200/55">
                    {maskSecret(client.idOrPassportNo)}
                  </td>
                  <td className="px-4 py-3 font-mono tracking-wider text-on-surface-variant dark:text-blue-200/55">
                    {maskSecret(client.licenceNo)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{client._count.bookings}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={client.status === 'ACTIVE' ? 'Active' : 'Suspended'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {client.status === 'ACTIVE' ? (
                        <Link
                          href={`/admin/bookings?clientId=${client.id}`}
                          title="Booking — create a hire for this client"
                          aria-label="Booking — create a hire for this client"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#E90809] transition hover:bg-[#E90809]/10"
                        >
                          <span className="material-symbols-outlined text-[20px]">event_available</span>
                        </Link>
                      ) : (
                        <span
                          title="Booking unavailable — client is suspended"
                          aria-label="Booking unavailable — client is suspended"
                          className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-on-surface-variant/35"
                        >
                          <span className="material-symbols-outlined text-[20px]">event_busy</span>
                        </span>
                      )}
                      <ClientViewButton
                        client={{
                          id: client.id,
                          fullName: client.fullName,
                          phone: client.phone,
                          email: client.email,
                          idOrPassportNo: client.idOrPassportNo,
                          licenceNo: client.licenceNo,
                          licenceExpiry: toDateInput(client.licenceExpiry),
                          physicalAddress: client.physicalAddress,
                          nextOfKin: client.nextOfKin,
                          employer: client.employer,
                          secondContact: client.secondContact,
                          notes: client.notes,
                          status: client.status,
                          trips: client._count.bookings,
                          loyaltyPoints: client.loyaltyPoints ?? 0,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!clients.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-on-surface-variant dark:text-blue-200/45"
                  >
                    {loaded.error ? 'Could not load clients.' : 'No clients found.'}
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
