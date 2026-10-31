import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase-url'
import { clientIdentityConflictMessage } from '@/lib/car-hire/client-uniqueness'
import { warmPrismaConnection } from '@/lib/prisma'
import { logDevError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * Fast duplicate check for the new-client wizard.
 * Auth is cookie/JWT only (no staff DB profile round-trip) so Continue stays responsive.
 */
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

    const meta = user.app_metadata || {}
    const allowed =
      Boolean(meta.isSuperAdmin) ||
      typeof meta.roleId === 'string' ||
      typeof meta.staffRole === 'string' ||
      typeof meta.role === 'string'
    if (!allowed) {
      return NextResponse.json({ ok: false, message: 'Sign in required.' }, { status: 401 })
    }

    const body = (await request.json()) as {
      phone?: string
      idOrPassportNo?: string
      email?: string
    }

    const phone = String(body.phone ?? '').trim()
    const idOrPassportNo = String(body.idOrPassportNo ?? '').trim()
    const emailRaw = String(body.email ?? '').trim()
    const email = emailRaw ? emailRaw.toLowerCase() : null

    if (!phone && !idOrPassportNo && !email) {
      return NextResponse.json({
        ok: false,
        message: 'Enter phone, National ID, or email before continuing.',
      })
    }

    void warmPrismaConnection()

    const conflict = await clientIdentityConflictMessage({
      phone,
      idOrPassportNo,
      email,
    })

    if (conflict) {
      return NextResponse.json({ ok: false, message: conflict })
    }

    return NextResponse.json({ ok: true, message: 'Details are available.' })
  } catch (error) {
    logDevError('clients-check-duplicate', error)
    return NextResponse.json(
      { ok: false, message: 'Could not verify details. Check your connection and try again.' },
      { status: 500 },
    )
  }
}
