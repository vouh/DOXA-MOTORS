import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import StaffTable from '@/components/admin/StaffTable'
import InviteStaffForm from '@/components/admin/InviteStaffForm'
import RoleEditor from '@/components/admin/RoleEditor'
import AuditLogsTable from '@/components/admin/AuditLogsTable'
import { Card, PageShell, SectionHead } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'
import type { UserStatus } from '@/lib/auth/types'
import { redirect } from 'next/navigation'

export default async function StaffPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/admin/login')

  const canView = await hasPermission(profile, PERMISSIONS.STAFF_VIEW)
  if (!canView && !profile.isSuperAdmin) {
    return (
      <PageShell>
        <Card className="p-6">
          <p className="text-sm text-on-surface">You do not have permission to view staff.</p>
        </Card>
      </PageShell>
    )
  }

  const canManage = await hasPermission(profile, PERMISSIONS.STAFF_MANAGE)
  const canEditRoles = await hasPermission(profile, PERMISSIONS.STAFF_ROLE_EDIT)

  const loaded = await softQuery(() =>
    Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        include: { role: { select: { id: true, name: true } } },
      }),
      prisma.role.findMany({
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        include: {
          _count: { select: { users: true, permissions: true } },
          permissions: {
            include: { permission: { select: { key: true, label: true, category: true } } },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true } } },
      }),
    ]),
  )
  const [users, roles, audits] = loaded.data ?? [[], [], []]

  const roleOptions = roles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem }))

  return (
    <PageShell>
      <SectionHead
        title="Staff & roles"
        subtitle="Permissions → Roles → Users. One role per staff email. Super Admin creates roles; keys stay developer-owned."
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      {canEditRoles && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Roles
          </h2>
          <RoleEditor roles={roles} />
        </section>
      )}

      {canManage && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Invite staff
          </h2>
          <InviteStaffForm roles={roleOptions} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
          Staff accounts
        </h2>
        <StaffTable
          canManage={canManage || profile.isSuperAdmin}
          roles={roleOptions}
          rows={users.map((u) => ({
            id: u.id,
            name: u.fullName,
            email: u.email,
            roleId: u.roleId,
            roleLabel: u.role?.name || (u.isSuperAdmin ? 'Super Admin' : 'Unassigned'),
            status: u.status as UserStatus,
            isSuperAdmin: u.isSuperAdmin,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
          Recent audit log
        </h2>
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
    </PageShell>
  )
}
