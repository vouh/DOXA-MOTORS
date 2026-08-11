import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { PageShell, SectionHead } from '@/components/admin/ui'
import InstaPayWorkspace from '@/components/admin/InstaPayWorkspace'
import ServiceAlert from '@/components/admin/ServiceAlert'

export const dynamic = 'force-dynamic'

export default async function InstaPayPage() {
  const loaded = await softQuery(() =>
    Promise.all([
      prisma.carPayment.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: { include: { client: { select: { fullName: true } } } },
        },
      }),
      prisma.carPayment.findMany({
        where: { status: 'FAILED' },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: { include: { client: { select: { fullName: true } } } },
        },
      }),
      prisma.carBooking.findMany({
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: {
          client: { select: { fullName: true } },
          vehicle: { select: { regNumber: true } },
        },
      }),
    ]),
  )
  const [payments, failed, bookings] = loaded.data ?? [[], [], []]

  const mapRow = (p: (typeof payments)[number]) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    status: p.status,
    phone: p.phone,
    mpesaRef: p.mpesaRef,
    failureReason: p.failureReason,
    notes: p.notes,
    createdAt: p.createdAt.toLocaleString(),
    paidAt: p.paidAt?.toLocaleString() ?? null,
    bookingId: p.bookingId,
    bookingRef: p.booking?.reference ?? null,
    clientName: p.booking?.client.fullName ?? null,
  })

  return (
    <PageShell>
      <SectionHead
        title="Insta Pay"
        subtitle="Prompt M-Pesa STK, record cash/bank, and reconcile payments to car-hire bookings"
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}
      <InstaPayWorkspace
        payments={payments.map(mapRow)}
        failed={failed.map(mapRow)}
        bookings={bookings.map((b) => ({
          id: b.id,
          label: `${b.reference} · ${b.client.fullName} · ${b.vehicle.regNumber}`,
        }))}
      />
    </PageShell>
  )
}
