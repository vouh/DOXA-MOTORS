import DashboardShell from '@/components/dashboard/DashboardShell'
import MembersTable from '@/components/admin/MembersTable'
import { ADMIN_NAV } from '@/lib/dashboard/nav'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/lib/auth/types'

export default async function AdminMembersPage() {
  const users = await prisma.user.findMany({
    orderBy: { fullName: 'asc' },
  })

  return (
    <DashboardShell role="ADMIN" title="Members" nav={ADMIN_NAV}>
      <MembersTable
        users={users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role as Role,
          status: u.status,
          isSuperAdmin: u.isSuperAdmin,
          phone: u.phone,
          location: u.location,
        }))}
      />
    </DashboardShell>
  )
}
