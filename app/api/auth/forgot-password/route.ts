import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/auth/helpers'
import { normalizeSupabaseUrl } from '@/lib/supabase-url'

const bodySchema = z.object({
  email: z.string().email().transform(normalizeEmail),
})

/**
 * Staff forgot-password: only invited Prisma users get a Supabase recovery email.
 * Always returns the same message to avoid email enumeration.
 */
export async function POST(req: Request) {
  const generic = {
    ok: true,
    message: 'If that email has a staff account, a reset link has been sent.',
  }

  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(generic)
    }

    const email = parsed.data.email
    const staff = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    if (!staff) {
      return NextResponse.json(generic)
    }

    const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    const anon =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth is not configured.' }, { status: 503 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const redirectTo = `${origin.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent('/admin/profile')}`

    const supabase = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      console.error('[forgot-password]', error.message)
    }

    return NextResponse.json(generic)
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json(generic)
  }
}
