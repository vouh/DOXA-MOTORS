import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth/session'
import { countUnreadStaffNotifications } from '@/lib/intelligence/notifications'
import { logDevError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const profile = await getSessionProfile()
    if (!profile) {
      return NextResponse.json({ ok: false, count: 0 })
    }
    const count = await countUnreadStaffNotifications(profile.id)
    return NextResponse.json({ ok: true, count })
  } catch (error) {
    logDevError('notifications-badge', error)
    return NextResponse.json({ ok: true, count: 0 })
  }
}
