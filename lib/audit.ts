import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditEntry = {
  userId: string
  action: string
  entity?: string | null
  entityId?: string | null
  meta?: Prisma.InputJsonValue
}

/** Never throws — a failed audit insert must not break the user action. */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: entry.meta ?? undefined,
      },
    })
  } catch (e) {
    console.error('audit log failed', entry.action, e)
  }
}

export { formatAuditAction, formatAuditMeta, ACTION_LABELS } from '@/lib/audit-labels'
