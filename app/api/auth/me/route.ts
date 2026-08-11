export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth/session'
import { getUserPermissionSet } from '@/lib/rbac/require'

export async function GET() {
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.json({ user: null }, { status: 401 })
  const permissions = [...(await getUserPermissionSet(profile))]
  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      initials: profile.initials,
      staffRole: profile.staffRole,
      roleId: profile.roleId,
      roleName: profile.roleName,
      isSuperAdmin: profile.isSuperAdmin,
      status: profile.status,
      permissions,
    },
  })
}
