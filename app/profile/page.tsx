import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { initialsFromName } from '@/lib/auth/helpers'
import ProfileView from '@/components/profile/ProfileView'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { navForRole } from '@/lib/dashboard/nav'
import type { Role } from '@/lib/auth/types'

export const metadata = {
  title: 'My profile',
}

export default async function ProfilePage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login?next=/profile')

  if (profile.status === 'SUSPENDED') {
    redirect('/login?error=suspended')
  }

  const [agg, welfareCount] = await Promise.all([
    prisma.contribution.aggregate({
      where: { userId: profile.id },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.welfareRequest.count({ where: { userId: profile.id } }),
  ])

  const user = await prisma.user.findUnique({ where: { id: profile.id } })
  if (!user) redirect('/login')

  const role = user.role as Role

  return (
    <DashboardShell role={role} title="My profile" nav={navForRole(role)}>
      <ProfileView
        data={{
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          location: user.location,
          avatarUrl: user.avatarUrl,
          role,
          status: user.status,
          isSuperAdmin: user.isSuperAdmin,
          initials: initialsFromName(user.fullName),
          contributionCount: agg._count,
          contributionTotal: agg._sum.amount ?? 0,
          welfareCount,
        }}
      />
    </DashboardShell>
  )
}
