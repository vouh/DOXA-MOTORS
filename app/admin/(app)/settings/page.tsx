import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { getCategoryStartingPrices, getLoyaltyConfig } from '@/lib/settings/hire-settings'
import StaffTable from '@/components/admin/StaffTable'
import InviteStaffForm from '@/components/admin/InviteStaffForm'
import RoleEditor from '@/components/admin/RoleEditor'
import AuditLogsTable from '@/components/admin/AuditLogsTable'
import SettingsWorkspace from '@/components/admin/SettingsWorkspace'
import { Card, PageShell, SectionHead } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'
import type { UserStatus } from '@/lib/auth/types'
import {
  DEFAULT_CATEGORY_STARTING_PRICES,
  DEFAULT_LOYALTY_CONFIG,
} from '@/lib/loyalty/defaults'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/admin/login')

  const canSettings =
    profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.SETTINGS_VIEW))
  const canStaff =
    profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.STAFF_VIEW))

  if (!canSettings && !canStaff) {
    return (
      <PageShell>
        <Card className="p-6">
          <p className="text-sm text-on-surface">You do not have permission to view settings.</p>
        </Card>
      </PageShell>
    )
  }

  const canEditSettings =
    profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.SETTINGS_EDIT))
  const canManage = profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.STAFF_MANAGE))
  const canEditRoles =
    profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.STAFF_ROLE_EDIT))

  const hireLoaded = canSettings
    ? await softQuery(() =>
        Promise.all([getCategoryStartingPrices(), getLoyaltyConfig()]),
      )
    : { ok: true as const, data: [DEFAULT_CATEGORY_STARTING_PRICES, DEFAULT_LOYALTY_CONFIG] as const, error: null }

  const staffLoaded = canStaff
    ? await softQuery(() =>
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
                include: {
                  permission: { select: { key: true, label: true, category: true } },
                },
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
    : { ok: true as const, data: [[], [], []] as const, error: null }

  const [prices, loyalty] = hireLoaded.data ?? [
    DEFAULT_CATEGORY_STARTING_PRICES,
    DEFAULT_LOYALTY_CONFIG,
  ]
  const [users, roles, audits] = staffLoaded.data ?? [[], [], []]
  const editableRoles = [...roles]
  const roleOptions = roles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem }))
  const pageError = hireLoaded.error || staffLoaded.error

  return (
    <PageShell>
      <SectionHead
        title="Settings"
        subtitle="Fleet prices, loyalty metrics, staff accounts, and roles."
      />
      {pageError ? <ServiceAlert message={pageError} /> : null}

      {canSettings ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Hire & loyalty
          </h2>
          <SettingsWorkspace
            canEdit={canEditSettings}
            initialPrices={prices}
            initialLoyalty={loyalty}
          />
        </section>
      ) : null}

      {canStaff ? (
        <>
          {canEditRoles ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Roles
              </h2>
              <RoleEditor roles={editableRoles} />
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Staff accounts
            </h2>
            {canManage ? <InviteStaffForm roles={roleOptions} /> : null}
            <StaffTable
              canManage={canManage}
              roles={roleOptions}
              rows={users.map((u) => ({
                id: u.id,
                name: u.fullName,
                email: u.email,
                roleId: u.roleId,
                roleLabel: u.role?.name || (u.isSuperAdmin ? 'Super Admin' : 'Unassigned'),
                status: u.status as UserStatus,
                isSuperAdmin: u.isSuperAdmin,
                suspiciousScore: u.suspiciousScore ?? 0,
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
        </>
      ) : null}
    </PageShell>
  )
}
