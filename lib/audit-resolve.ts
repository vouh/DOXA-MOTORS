import { prisma } from '@/lib/prisma'
import { ROLE_LABEL, type Role } from '@/lib/auth/types'

export type ResolvedTarget = {
  kind: string
  label: string
  subtitle: string | null
}

/** Batch-resolve audit entity IDs into readable names (no raw cuid in the UI). */
export async function resolveAuditTargets(
  rows: { entity: string | null; entityId: string | null; meta: unknown }[]
): Promise<Map<string, ResolvedTarget>> {
  const userIds = new Set<string>()
  const meetingIds = new Set<string>()
  const contributionIds = new Set<string>()
  const welfareIds = new Set<string>()

  for (const row of rows) {
    if (!row.entityId) continue
    switch (row.entity) {
      case 'User':
        userIds.add(row.entityId)
        break
      case 'Meeting':
        meetingIds.add(row.entityId)
        break
      case 'Contribution':
        contributionIds.add(row.entityId)
        break
      case 'WelfareRequest':
        welfareIds.add(row.entityId)
        break
    }
  }

  const [users, meetings, contributions, welfare] = await Promise.all([
    userIds.size
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, fullName: true, email: true, role: true },
        })
      : Promise.resolve([]),
    meetingIds.size
      ? prisma.meeting.findMany({
          where: { id: { in: [...meetingIds] } },
          select: { id: true, title: true, heldAt: true },
        })
      : Promise.resolve([]),
    contributionIds.size
      ? prisma.contribution.findMany({
          where: { id: { in: [...contributionIds] } },
          select: {
            id: true,
            amount: true,
            category: true,
            user: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    welfareIds.size
      ? prisma.welfareRequest.findMany({
          where: { id: { in: [...welfareIds] } },
          select: {
            id: true,
            description: true,
            user: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const map = new Map<string, ResolvedTarget>()

  for (const u of users) {
    map.set(`User:${u.id}`, {
      kind: 'Member',
      label: u.fullName,
      subtitle: `${u.email} · ${ROLE_LABEL[u.role as Role] ?? u.role}`,
    })
  }
  for (const m of meetings) {
    map.set(`Meeting:${m.id}`, {
      kind: 'Meeting',
      label: m.title,
      subtitle: m.heldAt.toLocaleDateString(),
    })
  }
  for (const c of contributions) {
    map.set(`Contribution:${c.id}`, {
      kind: 'Contribution',
      label: `KES ${c.amount.toLocaleString()}`,
      subtitle: [c.user.fullName, c.category].filter(Boolean).join(' · ') || null,
    })
  }
  for (const w of welfare) {
    map.set(`WelfareRequest:${w.id}`, {
      kind: 'Welfare',
      label: w.user.fullName,
      subtitle: w.description.slice(0, 80) || null,
    })
  }

  return map
}

export function targetKey(entity: string | null, entityId: string | null): string | null {
  if (!entity || !entityId) return null
  return `${entity}:${entityId}`
}
