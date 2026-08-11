import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { createServerClient as createServiceClient } from '@/lib/supabase-server'
import { isSupabaseConfigured } from '@/lib/supabase-url'
import type { AuthUser, StaffRole, UserStatus } from './types'
import { toAuthUser } from './helpers'
import type { User } from '@prisma/client'
import { getRbacVersion } from '@/lib/rbac/sync'

export type SessionProfile = AuthUser & {
  status: UserStatus
  authUserId: string | null
  isSuperAdmin: boolean
  roleId: string | null
}

export type AppMetadataPayload = {
  staffRole: StaffRole
  status: UserStatus
  isSuperAdmin: boolean
  dbUserId: string
  fullName: string
  roleId: string | null
  rbacVersion: number
}

export async function syncAppMetadata(authUserId: string, payload: AppMetadataPayload) {
  const admin = createServiceClient()
  await admin.auth.admin.updateUserById(authUserId, { app_metadata: payload })
}

export async function syncUserMetadata(user: User) {
  if (!user.authUserId) return
  const rbacVersion = await getRbacVersion()
  await syncAppMetadata(user.authUserId, {
    staffRole: user.staffRole as StaffRole,
    status: user.status as UserStatus,
    isSuperAdmin: user.isSuperAdmin,
    dbUserId: user.id,
    fullName: user.fullName,
    roleId: user.roleId ?? null,
    rbacVersion,
  })
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

  const email = authUser.email?.trim().toLowerCase()
  const where = {
    OR: [
      { authUserId: authUser.id },
      ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
    ],
  }

  let profile: (User & { role?: { name: string } | null }) | null = null
  try {
    profile = await prisma.user.findFirst({
      where,
      include: { role: { select: { name: true } } },
    })
  } catch {
    // Client/schema mismatch or migration not applied yet
    profile = await prisma.user.findFirst({ where })
  }

  if (!profile) return null

  if (!profile.authUserId) {
    try {
      profile = await prisma.user.update({
        where: { id: profile.id },
        data: { authUserId: authUser.id },
        include: { role: { select: { name: true } } },
      })
    } catch {
      profile = await prisma.user.update({
        where: { id: profile.id },
        data: { authUserId: authUser.id },
      })
    }
  }

  syncUserMetadata(profile).catch(() => {})

  const base = toAuthUser(profile)
  return {
    ...base,
    roleId: profile.roleId ?? null,
    roleName: profile.role?.name ?? null,
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

/** @deprecated Prefer requirePermission — kept for gradual migration */
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
    roleId: profile.roleId,
    roleName: profile.roleName,
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
