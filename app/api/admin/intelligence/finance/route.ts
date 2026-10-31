import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth/session'
import {
  listOwnerStatements,
  monthBounds,
  parseDay,
  summarizeOwnerFinance,
  summarizeVehicleFinance,
  ymd,
} from '@/lib/intelligence/finance'

export const dynamic = 'force-dynamic'

/** Staff fetch — owner/vehicle earnings and costs for a period. */
export async function GET(request: Request) {
  const profile = await getSessionProfile()
  if (!profile || profile.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const ownerId = url.searchParams.get('ownerId')?.trim() || ''
  const vehicleId = url.searchParams.get('vehicleId')?.trim() || ''
  const defaults = monthBounds()
  const fromRaw = url.searchParams.get('from')?.trim()
  const toRaw = url.searchParams.get('to')?.trim()
  const start = fromRaw ? parseDay(fromRaw) : defaults.start
  const end = toRaw ? parseDay(toRaw, true) : defaults.end

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: 'Enter a valid period.' }, { status: 400 })
  }

  try {
    if (vehicleId) {
      const vehicle = await summarizeVehicleFinance(vehicleId, start, end)
      return NextResponse.json({
        ok: true,
        period: { from: ymd(start), to: ymd(end) },
        vehicle,
        polledAt: new Date().toISOString(),
      })
    }
    if (ownerId) {
      const [summary, statements] = await Promise.all([
        summarizeOwnerFinance(ownerId, start, end),
        listOwnerStatements(ownerId),
      ])
      return NextResponse.json({
        ok: true,
        period: { from: ymd(start), to: ymd(end) },
        summary,
        statements,
        polledAt: new Date().toISOString(),
      })
    }
    return NextResponse.json({ error: 'ownerId or vehicleId is required.' }, { status: 400 })
  } catch (error) {
    console.error('[intelligence/finance]', error)
    return NextResponse.json({ error: 'Could not load finance summary.' }, { status: 500 })
  }
}
