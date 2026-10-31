import { prisma } from '@/lib/prisma'
import { writeAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email/resend'
import {
  applyDeleteRisk,
  resetDeleteStreak,
  type DeleteRiskState,
} from '@/lib/security/suspicious-deletes'

function alertRecipientsFallback() {
  const configured =
    process.env.SECURITY_ALERT_EMAIL?.trim() ||
    process.env.RESEND_TEST_EMAIL?.trim() ||
    ''
  return configured ? [configured.toLowerCase()] : []
}

async function resolveAlertEmails(): Promise<string[]> {
  const fromEnv = alertRecipientsFallback()
  const supers = await prisma.user.findMany({
    where: { isSuperAdmin: true, status: 'ACTIVE' },
    select: { email: true },
  })
  const set = new Set<string>([
    ...fromEnv,
    ...supers.map((u) => u.email.trim().toLowerCase()).filter(Boolean),
  ])
  set.add('superadmin@doxacarhire.com')
  return [...set]
}

async function loadState(userId: string): Promise<DeleteRiskState> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      suspiciousScore: true,
      consecutiveDeletes: true,
      consecutiveDeleteAlerted: true,
      lastDeleteAt: true,
    },
  })
  return {
    suspiciousScore: user.suspiciousScore,
    consecutiveDeletes: user.consecutiveDeletes,
    consecutiveDeleteAlerted: user.consecutiveDeleteAlerted,
    lastDeleteAt: user.lastDeleteAt,
  }
}

async function persistState(userId: string, next: DeleteRiskState) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      suspiciousScore: next.suspiciousScore,
      consecutiveDeletes: next.consecutiveDeletes,
      consecutiveDeleteAlerted: next.consecutiveDeleteAlerted,
      lastDeleteAt: next.lastDeleteAt,
    },
  })
}

async function notifyScoreRise(opts: {
  userId: string
  actorName: string
  actorEmail: string
  entity: string
  mode: 'single' | 'bulk'
  count: number
  previousScore: number
  next: DeleteRiskState
  alerts: Array<{ reason: string; detail: string; scoreDelta: number }>
}) {
  const recipients = await resolveAlertEmails()
  const reasons =
    opts.alerts.map((a) => a.reason).join(', ') || 'score_increase'
  const detailHtml =
    opts.alerts.length > 0
      ? opts.alerts
          .map(
            (a) =>
              `<li><strong>${a.reason}</strong>: ${a.detail} (+${a.scoreDelta} score)</li>`,
          )
          .join('')
      : `<li>Score increased without a named rule detail.</li>`

  const title = `Suspicious activity: ${opts.actorName}`
  const message = `${opts.actorName} (${opts.actorEmail}) — score ${opts.previousScore} → ${opts.next.suspiciousScore} (${reasons}).`

  const inbox = prisma.staffNotification
  if (inbox?.create) {
    await inbox.create({
      data: {
        sourceKey: `security:delete:${opts.userId}:${Date.now()}`,
        kind: 'security',
        title,
        message,
        href: '/admin/settings',
        urgency: 'critical',
        eventAt: new Date(),
      },
    })
  }

  const htmlBody = `
      <p><strong>Suspicious score updated</strong></p>
      <p>Staff: ${opts.actorName} &lt;${opts.actorEmail}&gt;</p>
      <p>Entity: ${opts.entity} · mode: ${opts.mode} · count: ${opts.count}</p>
      <p>Score: <strong>${opts.previousScore} → ${opts.next.suspiciousScore}</strong> · consecutive deletes: ${opts.next.consecutiveDeletes}</p>
      <ul>${detailHtml}</ul>
      <p>Review Staff / audit logs in Doxa admin.</p>
    `

  for (const to of recipients) {
    await sendTransactionalEmail({
      to,
      subject: `[Security] ${title} (score ${opts.next.suspiciousScore})`,
      htmlBody,
    })
  }
}

/** Call after successful record deletes (single or bulk). Never throws to callers. */
export async function trackRecordDeletes(opts: {
  userId: string
  actorName: string
  actorEmail: string
  entity: string
  mode: 'single' | 'bulk'
  count: number
  entityIds: string[]
}): Promise<void> {
  try {
    if (opts.count <= 0) return

    const state = await loadState(opts.userId)
    const previousScore = state.suspiciousScore
    const { next, alerts } = applyDeleteRisk(state, {
      mode: opts.mode,
      count: opts.count,
    })
    await persistState(opts.userId, next)

    await writeAudit({
      userId: opts.userId,
      action: opts.mode === 'bulk' ? 'DELETE_BULK' : 'DELETE',
      entity: opts.entity,
      entityId: opts.entityIds[0] ?? null,
      meta: {
        count: opts.count,
        entityIds: opts.entityIds.slice(0, 50),
        previousScore,
        suspiciousScore: next.suspiciousScore,
        consecutiveDeletes: next.consecutiveDeletes,
      },
    })

    // Email whenever the suspicious score rises (not only first streak trip).
    if (next.suspiciousScore > previousScore) {
      await notifyScoreRise({
        ...opts,
        previousScore,
        next,
        alerts,
      })
    }
  } catch (e) {
    console.error('[security] trackRecordDeletes failed', e)
  }
}

/** Soften streak when staff creates/updates (not deletes). */
export async function noteCalmingAction(userId: string): Promise<void> {
  try {
    const state = await loadState(userId)
    if (state.consecutiveDeletes === 0 && !state.consecutiveDeleteAlerted) return
    await persistState(userId, resetDeleteStreak(state))
  } catch (e) {
    console.error('[security] noteCalmingAction failed', e)
  }
}
