import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { createServerClient as createServiceClient } from '@/lib/supabase-server'
import { isSupabaseConfigured } from '@/lib/supabase-url'
import type { AuthUser, StaffRole, UserStatus } from './types'
import { isStaffRole, isUserStatus, toAuthUser } from './helpers'
import type { User } from '@prisma/client'

export type SessionProfile = AuthUser & {
  status: UserStatus
  authUserId: string | null
  isSuperAdmin: boolean
}

export type AppMetadataPayload = {
  staffRole: StaffRole
  status: UserStatus
  isSuperAdmin: boolean
  dbUserId: string
  fullName: string
}

export async function syncAppMetadata(authUserId: string, payload: AppMetadataPayload) {
  const admin = createServiceClient()
  await admin.auth.admin.updateUserById(authUserId, { app_metadata: payload })
}

export async function syncUserMetadata(user: User) {
  if (!user.authUserId) return
  await syncAppMetadata(user.authUserId, {
    staffRole: user.staffRole as StaffRole,
    status: user.status as UserStatus,
    isSuperAdmin: user.isSuperAdmin,
    dbUserId: user.id,
    fullName: user.fullName,
  })
}

function makeInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured()) return null
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()
  if (!authUser || error) return null

  const meta = authUser.app_metadata ?? {}

  if (isStaffRole(meta.staffRole) && isUserStatus(meta.status) && meta.dbUserId) {
    const fullName = (meta.fullName as string) || authUser.email?.split('@')[0] || ''
    return {
      id: meta.dbUserId as string,
      email: authUser.email ?? '',
      fullName,
      initials: makeInitials(fullName),
      staffRole: meta.staffRole,
      status: meta.status,
      authUserId: authUser.id,
      isSuperAdmin: Boolean(meta.isSuperAdmin),
    }
  }

  const email = authUser.email?.trim().toLowerCase()
  let profile = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: authUser.id },
        ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
      ],
    },
  })

  if (!profile) return null

  if (!profile.authUserId) {
    profile = await prisma.user.update({
      where: { id: profile.id },
      data: { authUserId: authUser.id },
    })
  }

  syncUserMetadata(profile).catch(() => {})

  return {
    ...toAuthUser(profile),
    status: profile.status as UserStatus,
    authUserId: profile.authUserId,
    isSuperAdmin: profile.isSuperAdmin ?? false,
  }
}

export async function requireSessionProfile() {
  const profile = await getSessionProfile()
  if (!profile) throw new Error('Unauthorized')
  return profile
}

export async function requireActiveStaff() {
  const profile = await requireSessionProfile()
  if (profile.status !== 'ACTIVE') throw new Error('Account is not active')
  return profile
}

export async function requireDirector() {
  const profile = await requireActiveStaff()
  if (!profile.isSuperAdmin && profile.staffRole !== 'DIRECTOR') throw new Error('Forbidden')
  return profile
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const profile = await getSessionProfile()
  if (!profile || profile.status !== 'ACTIVE') return null
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    staffRole: profile.staffRole,
    initials: profile.initials,
    isSuperAdmin: profile.isSuperAdmin,
    status: profile.status,
  }
}

export async function clearSessionCookie() {}
export async function setSessionCookie(_user: AuthUser) {
  return ''
}

export async function getPrismaUserByAuthId(authUserId: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { authUserId } })
}
