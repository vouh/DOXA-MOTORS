import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: NextRequest) {
  const report = request.nextUrl.searchParams.get('report') || 'bookings'
  let rows: unknown[][] = []
  if (report === 'clients') {
    const clients = await prisma.carClient.findMany({ orderBy: { fullName: 'asc' }, include: { _count: { select: { bookings: true } } } })
    rows = [['Name', 'Phone', 'Email', 'ID/Passport', 'Licence', 'Status', 'Bookings'], ...clients.map((client) => [
      client.fullName, client.phone, client.email, client.idOrPassportNo, client.licenceNo, client.status, client._count.bookings,
    ])]
  } else if (report === 'owners') {
    const owners = await prisma.carOwner.findMany({ include: { _count: { select: { vehicles: true } }, payouts: true } })
    rows = [['Owner', 'Phone', 'National ID', 'Vehicles', 'Total payouts'], ...owners.map((owner) => [
      owner.fullName, owner.phone, owner.nationalId, owner._count.vehicles,
      owner.payouts.reduce((sum, payout) => sum + payout.netPay, 0),
    ])]
  } else {
    const bookings = await prisma.carBooking.findMany({
      include: { client: true, vehicle: true, payments: { where: { status: 'COMPLETED' } } },
      orderBy: { createdAt: 'desc' },
    })
    rows = [['Reference', 'Client', 'Vehicle', 'Start', 'Expected return', 'Status', 'Charge', 'Paid', 'Balance'], ...bookings.map((booking) => {
      const paid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0)
      return [booking.reference, booking.client.fullName, booking.vehicle.regNumber, booking.startAt.toISOString(),
        booking.expectedReturnAt.toISOString(), booking.status, booking.totalCharge, paid, Math.max(0, booking.totalCharge - paid)]
    })]
  }
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="doxa-${report}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
