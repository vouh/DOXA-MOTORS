export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { ADMIN_HOME } from '@/lib/auth/types'
import { syncUserMetadata } from '@/lib/auth/session'
import { normalizeEmail, toAuthUser } from '@/lib/auth/helpers'

const bodySchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
    }

    const email = parsed.data.email
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    })

    if (error || !data.user) {
      const message = error?.message?.toLowerCase() ?? ''
      if (message.includes('email not confirmed')) {
        return NextResponse.json(
          { error: 'Your email address has not been verified yet.' },
          { status: 401 },
        )
      }
      const knownProfile = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!knownProfile) {
        return NextResponse.json(
          { error: 'No staff account found for this email. Ask a Director to invite you.' },
          { status: 401 },
        )
      }
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })
    }

    let profile = await prisma.user.findFirst({
      where: {
        OR: [
          { authUserId: data.user.id },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    })

    if (!profile) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'No staff profile found. Ask a Director to invite you.' },
        { status: 403 },
      )
    }

    if (!profile.authUserId) {
      profile = await prisma.user.update({
        where: { id: profile.id },
        data: { authUserId: data.user.id },
      })
    }

    await syncUserMetadata(profile)

    if (profile.status === 'SUSPENDED') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Your account has been suspended. Contact a Director.' },
        { status: 403 },
      )
    }

    if (profile.status !== 'ACTIVE') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Your account is not active. Contact a Director.' },
        { status: 403 },
      )
    }

    const user = toAuthUser(profile)
    return NextResponse.json({
      user: {
        ...user,
        isSuperAdmin: profile.isSuperAdmin,
      },
      redirectTo: ADMIN_HOME,
      status: profile.status,
    })
  } catch (err) {
    console.error('login error', err)
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 })
  }
}
