import { prisma } from '@/lib/prisma'
import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS, SUPER_ADMIN_ROLE_NAME } from '@/lib/rbac/registry'
import { syncPermissionRegistry } from '@/lib/rbac/sync'
import { parseDocumentKind } from '@/lib/documents/meta'
import { Card, Th, SectionHead, PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'
import DocumentsAddButton from '@/components/admin/DocumentsAddButton'
import DocumentsTableActions from '@/components/admin/DocumentsTableActions'

export const dynamic = 'force-dynamic'

function formatBytes(n: number | null | undefined) {
  if (!n || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function ensureDocPermissionsForSuperAdmin() {
  try {
    await syncPermissionRegistry()
    const role = await prisma.role.findUnique({ where: { name: SUPER_ADMIN_ROLE_NAME } })
    if (!role) return
    const keys = [PERMISSIONS.DOC_VIEW, PERMISSIONS.DOC_UPLOAD, PERMISSIONS.DOC_DELETE]
    const perms = await prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    })
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        create: { roleId: role.id, permissionId: p.id },
        update: {},
      })
    }
  } catch {
    /* ignore — page still works for isSuperAdmin */
  }
}

export default async function DocumentsPage() {
  const profile = await getSessionProfile()
  if (profile?.isSuperAdmin) await ensureDocPermissionsForSuperAdmin()

  const canUpload = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.DOC_UPLOAD))
    : false
  const canDelete = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.DOC_DELETE))
    : false

  const loaded = await softQuery(() =>
    Promise.all([
      prisma.attachment.findMany({
        include: { uploader: { select: { fullName: true } } },
        orderBy: { uploadedAt: 'desc' },
        take: 200,
      }),
      prisma.carClient.findMany({
        select: { id: true, fullName: true, phone: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.carVehicle.findMany({
        select: { id: true, regNumber: true, make: true, model: true },
        orderBy: { regNumber: 'asc' },
      }),
      prisma.carOwner.findMany({
        where: { active: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
    ]),
  )

  const [docs, clients, vehicles, owners] = loaded.data ?? [[], [], [], []]

  const clientLabel = new Map(clients.map((c) => [c.id, `${c.fullName} · ${c.phone}`]))
  const vehicleLabel = new Map(
    vehicles.map((v) => [v.id, `${v.regNumber} · ${v.make} ${v.model}`]),
  )
  const ownerLabel = new Map(owners.map((o) => [o.id, o.fullName]))

  function linkLabel(entityType: string, entityId: string) {
    if (entityType === 'GENERAL') return 'Company library'
    if (entityType === 'CLIENT') return clientLabel.get(entityId) || entityId
    if (entityType === 'VEHICLE') return vehicleLabel.get(entityId) || entityId
    if (entityType === 'OWNER') return ownerLabel.get(entityId) || entityId
    return `${entityType} / ${entityId}`
  }

  const clientOpts = clients.map((c) => ({ id: c.id, label: `${c.fullName} · ${c.phone}` }))
  const vehicleOpts = vehicles.map((v) => ({
    id: v.id,
    label: `${v.regNumber} · ${v.make} ${v.model}`,
  }))
  const ownerOpts = owners.map((o) => ({ id: o.id, label: o.fullName }))

  return (
    <PageShell>
      <SectionHead
        title="Documents"
        action={
          canUpload ? (
            <DocumentsAddButton clients={clientOpts} vehicles={vehicleOpts} owners={ownerOpts} />
          ) : null
        }
      />
      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <Th cols={['Document', 'Linked to', 'Type', 'Size', 'Uploaded', 'Actions']} />
            <tbody>
              {!docs.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">
                    {canUpload
                      ? 'No documents yet. Use Add new document to upload a file.'
                      : 'No documents yet.'}
                  </td>
                </tr>
              ) : (
                docs.map((doc) => {
                  const meta = parseDocumentKind(doc.kind)
                  return (
                    <tr key={doc.id} className="border-b border-outline-variant/70 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-on-surface">
                          {meta.title || meta.originalName}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {meta.originalName}
                          {meta.notes ? ` · ${meta.notes}` : ''}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {doc.entityType}
                        </span>
                        <p>{linkLabel(doc.entityType, doc.entityId)}</p>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">{meta.category}</td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        {formatBytes(meta.fileSize)}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        <p>{doc.uploadedAt.toLocaleString()}</p>
                        <p className="text-xs">{doc.uploader?.fullName || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DocumentsTableActions id={doc.id} canDelete={canDelete} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
