import { prisma } from '@/lib/prisma'
import StaffTable from '@/components/admin/StaffTable'
import RolesAccessForm from '@/components/admin/RolesAccessForm'
import AuditLogsTable from '@/components/admin/AuditLogsTable'
import { SectionHead } from '@/components/admin/ui'

const ROLE_LABEL: Record<string, string> = {
  DIRECTOR: 'Director',
  CLERK: 'Office Clerk',
  YARD: 'Yard Staff',
  ACCOUNTANT: 'Accountant',
}

export default async function StaffPage() {
  const [users, audits] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.auditLog.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    }),
  ])

  return (
    <div className="space-y-8">
      <SectionHead title="Staff & roles" subtitle="Invite and manage staff. Dynamic role permissions land in Stage 2." />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-on-surface">Staff accounts</h2>
        <StaffTable
          rows={users.map((u) => ({
            id: u.id,
            name: u.fullName,
            email: u.email,
            roleLabel: u.isSuperAdmin ? 'Super Admin' : ROLE_LABEL[u.staffRole] || u.staffRole,
            status: u.status,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-on-surface">Role permission matrix (preview)</h2>
        <RolesAccessForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-on-surface">Recent audit log</h2>
        <AuditLogsTable
          rows={audits.map((a) => ({
            id: a.id,
            action: a.action,
            entity: a.entity,
            createdAt: a.createdAt.toLocaleString(),
            userName: a.user?.fullName,
          }))}
        />
      </section>
    </div>
  )
}
