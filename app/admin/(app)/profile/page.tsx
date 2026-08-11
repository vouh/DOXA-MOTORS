import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import ServiceAlert from '@/components/admin/ServiceAlert'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import ProfileWorkspace from '@/components/admin/ProfileWorkspace'
import type { UserStatus } from '@/lib/auth/types'

export default async function ProfilePage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/admin/login')

  const canManage = await hasPermission(profile, PERMISSIONS.STAFF_MANAGE)

  const loaded = await softQuery(() =>
    Promise.all([
      prisma.user.findUnique({
        where: { id: profile.id },
        select: { phone: true, createdAt: true, status: true },
      }),
      canManage ? prisma.user.count() : Promise.resolve(0),
      canManage ? prisma.user.count({ where: { status: 'ACTIVE' } }) : Promise.resolve(0),
      canManage
        ? prisma.role.findMany({
            orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
            select: { id: true, name: true, isSystem: true },
          })
        : Promise.resolve([]),
    ]),
  )
  const [dbUser, staffCount, activeCount, roles] = loaded.data ?? [null, 0, 0, []]

  return (
    <>
      {loaded.error ? <ServiceAlert message={loaded.error} className="mx-auto max-w-5xl" /> : null}
      <ProfileWorkspace
        user={{
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        initials: profile.initials,
        roleLabel: profile.roleName || (profile.isSuperAdmin ? 'Super Admin' : 'Staff'),
        isSuperAdmin: profile.isSuperAdmin,
        status: (dbUser?.status as UserStatus) || profile.status,
        phone: dbUser?.phone,
        memberSince: dbUser?.createdAt?.toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        }),
        }}
        canManage={canManage || profile.isSuperAdmin}
        roles={roles}
        stats={{
          staff: staffCount,
          active: activeCount,
          role: profile.isSuperAdmin ? 'SA' : (profile.roleName || '—').slice(0, 8),
        }}
      />
    </>
  )
}
