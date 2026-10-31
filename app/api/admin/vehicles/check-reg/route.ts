import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase-url'
import {
  findVehicleByRegNumber,
  formatRegNumber,
  normalizeRegKey,
  vehicleRegConflictMessage,
} from '@/lib/car-hire/vehicle-reg'
import { logDevError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/** Fast plate uniqueness check for Add / Edit vehicle forms. */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, message: 'Sign in required.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Sign in required.' }, { status: 401 })
    }

    const body = (await request.json()) as { regNumber?: string; excludeId?: string }
    const regNumber = formatRegNumber(String(body.regNumber ?? ''))
    const excludeId = String(body.excludeId ?? '').trim() || undefined

    if (normalizeRegKey(regNumber).length < 5) {
      return NextResponse.json({ ok: false, message: 'Enter a valid registration plate.' })
    }

    const existing = await findVehicleByRegNumber(regNumber, excludeId)
    if (existing) {
      return NextResponse.json({
        ok: false,
        message: vehicleRegConflictMessage(existing),
      })
    }

    return NextResponse.json({ ok: true, message: 'Plate is available.' })
  } catch (error) {
    logDevError('vehicles-check-reg', error)
    return NextResponse.json(
      { ok: false, message: 'Could not verify plate. Try again.' },
      { status: 500 },
    )
  }
}
