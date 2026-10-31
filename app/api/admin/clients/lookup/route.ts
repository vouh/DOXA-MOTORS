import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth/session'
import { findClientsByLookupQuery } from '@/lib/car-hire/client-lookup'
import { logDevError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/** Fast client lookup — name, phone, or National ID. */
export async function GET(request: Request) {
  try {
    const profile = await getSessionProfile()
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Sign in required.' }, { status: 401 })
    }

    const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) {
      return NextResponse.json({ ok: true, clients: [] })
    }

    const rows = await findClientsByLookupQuery(q, 12)
    return NextResponse.json({
      ok: true,
      clients: rows.map((client) => ({
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        email: client.email,
        idOrPassportNo: client.idOrPassportNo,
        licenceNo: client.licenceNo,
        licenceExpiry: client.licenceExpiry?.toISOString().slice(0, 10) ?? null,
        physicalAddress: client.physicalAddress,
        nextOfKin: client.nextOfKin,
        employer: client.employer,
        secondContact: client.secondContact,
        notes: client.notes,
        status: client.status as 'ACTIVE' | 'SUSPENDED',
        trips: client._count?.bookings ?? 0,
      })),
    })
  } catch (error) {
    logDevError('clients-lookup', error)
    return NextResponse.json({ ok: false, message: 'Search failed. Try again.' }, { status: 500 })
  }
}
