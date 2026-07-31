import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { ADMIN_HOME } from '@/lib/auth/types'
import { syncUserMetadata } from '@/lib/auth/session'
import { normalizeEmail } from '@/lib/auth/helpers'

/**
 * Staff access is invitation-only: a Prisma User must already exist.
 * Uninvited OAuth (e.g. Google) must not leave a stranded Supabase Auth user.
 */
async function rejectUninvited(authUserId: string, origin: string, reason: 'not_invited' | 'inactive' | 'suspended' | 'oauth') {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Session may already be invalid.
  }

  // Remove orphan Auth account so retries / dashboards stay clean.
  // Invited staff always have a Prisma row first (inviteStaff / seed).
  try {
    const admin = createServerClient()
    await admin.auth.admin.deleteUser(authUserId)
  } catch {
    // Best-effort cleanup; login is already blocked.
  }

  return NextResponse.redirect(`${origin}/admin/login?error=${reason}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=oauth`)
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/admin/login?error=oauth`)
  }

  const email = data.user.email
  if (!email) {
    return rejectUninvited(data.user.id, origin, 'oauth')
  }

  const normalizedEmail = normalizeEmail(email)

  let profile = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: data.user.id },
        { email: { equals: normalizedEmail, mode: 'insensitive' } },
      ],
    },
  })

  // No staff invite → do not keep Auth session or orphan Auth user
  if (!profile) {
    return rejectUninvited(data.user.id, origin, 'not_invited')
  }

  if (!profile.authUserId || profile.email !== normalizedEmail) {
    profile = await prisma.user.update({
      where: { id: profile.id },
      data: {
        ...(!profile.authUserId ? { authUserId: data.user.id } : {}),
        ...(profile.email !== normalizedEmail ? { email: normalizedEmail } : {}),
      },
    })
  }

  await syncUserMetadata(profile)

  if (profile.status !== 'ACTIVE') {
    // Keep Auth user (they are real staff); only clear the browser session.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore
    }
    return NextResponse.redirect(
      `${origin}/admin/login?error=${profile.status === 'SUSPENDED' ? 'suspended' : 'inactive'}`,
    )
  }

  const dest = next && next.startsWith('/') ? next : ADMIN_HOME
  return NextResponse.redirect(`${origin}${dest}`)
}
