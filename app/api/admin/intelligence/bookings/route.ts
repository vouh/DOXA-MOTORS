import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth/session'
import { listBookingAlerts } from '@/lib/intelligence/bookings'

export const dynamic = 'force-dynamic'

/** Staff poll — booking intelligence (ending soon / overdue) + light overdue sync. */
export async function GET() {
  const profile = await getSessionProfile()
  if (!profile || profile.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const alerts = await listBookingAlerts()
    return NextResponse.json({
      ok: true,
      alerts,
      overdueCount: alerts.filter((a) => a.kind === 'overdue').length,
      endingSoonCount: alerts.filter((a) => a.kind === 'ending_soon').length,
      polledAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[intelligence/bookings]', error)
    return NextResponse.json({ error: 'Could not load booking alerts.' }, { status: 500 })
  }
}
