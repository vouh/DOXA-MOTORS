'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { actionFail } from '@/lib/errors'
import { ForbiddenError, requirePermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { writeAudit } from '@/lib/audit'
import { dispatchEmail, dispatchSms } from '@/lib/communications/dispatch'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

const composeSchema = z.object({
  audience: z.enum(['CLIENT', 'OWNER', 'ALL_CLIENTS', 'ALL_OWNERS']),
  recipientId: z.string().optional(),
  channel: z.enum(['EMAIL', 'SMS', 'BOTH']),
  subject: z.string().trim().optional(),
  body: z.string().trim().min(2, 'Write a message.').max(4000),
})

function fail(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message }
  if (error instanceof z.ZodError) {
    return { ok: false, message: error.issues[0]?.message || 'Please check the form fields.' }
  }
  return actionFail(error)
}

function refresh() {
  revalidatePath('/admin/communications')
}

type Target = {
  type: 'CLIENT' | 'OWNER'
  id: string
  name: string
  email: string | null
  phone: string
}

type ChannelOutcome = 'sent' | 'queued' | 'failed' | 'no_contact'

async function loadTargets(audience: z.infer<typeof composeSchema>['audience'], recipientId?: string) {
  if (audience === 'CLIENT' || audience === 'OWNER') {
    const id = recipientId?.trim() || ''
    if (!id) throw new Error('Pick a recipient.')
    if (audience === 'CLIENT') {
      const row = await prisma.carClient.findUniqueOrThrow({
        where: { id },
        select: { id: true, fullName: true, email: true, phone: true },
      })
      return [
        { type: 'CLIENT' as const, id: row.id, name: row.fullName, email: row.email, phone: row.phone },
      ]
    }
    const row = await prisma.carOwner.findUniqueOrThrow({
      where: { id },
      select: { id: true, fullName: true, email: true, phone: true },
    })
    return [
      { type: 'OWNER' as const, id: row.id, name: row.fullName, email: row.email, phone: row.phone },
    ]
  }

  if (audience === 'ALL_CLIENTS') {
    const rows = await prisma.carClient.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, fullName: true, email: true, phone: true },
    })
    return rows.map((row) => ({
      type: 'CLIENT' as const,
      id: row.id,
      name: row.fullName,
      email: row.email,
      phone: row.phone,
    }))
  }

  const rows = await prisma.carOwner.findMany({
    where: { active: true },
    select: { id: true, fullName: true, email: true, phone: true },
  })
  return rows.map((row) => ({
    type: 'OWNER' as const,
    id: row.id,
    name: row.fullName,
    email: row.email,
    phone: row.phone,
  }))
}

function mapDispatch(result: Awaited<ReturnType<typeof dispatchEmail>>): ChannelOutcome {
  if (result.ok) return result.skipped ? 'queued' : 'sent'
  return result.reason === 'no_address' ? 'no_contact' : 'failed'
}

async function sendToTarget(
  target: Target,
  opts: {
    channel: 'EMAIL' | 'SMS' | 'BOTH'
    subject: string
    body: string
    template: string
    broadcastId?: string
  },
): Promise<{ email?: ChannelOutcome; sms?: ChannelOutcome }> {
  const wantEmail = opts.channel === 'EMAIL' || opts.channel === 'BOTH'
  const wantSms = opts.channel === 'SMS' || opts.channel === 'BOTH'
  const out: { email?: ChannelOutcome; sms?: ChannelOutcome } = {}

  if (wantEmail) {
    out.email = mapDispatch(
      await dispatchEmail({
        recipientType: target.type,
        recipientId: target.id,
        recipientName: target.name,
        email: target.email,
        template: opts.template,
        subject: opts.subject,
        body: opts.body,
        broadcastId: opts.broadcastId,
      }),
    )
  }

  if (wantSms) {
    out.sms = mapDispatch(
      await dispatchSms({
        recipientType: target.type,
        recipientId: target.id,
        recipientName: target.name,
        phone: target.phone || '',
        template: opts.template,
        body: opts.body.slice(0, 480),
        broadcastId: opts.broadcastId,
      }),
    )
  }

  return out
}

function tally(outcomes: ChannelOutcome[]) {
  return {
    ok: outcomes.filter((o) => o === 'sent' || o === 'queued').length,
    failed: outcomes.filter((o) => o === 'failed').length,
    noContact: outcomes.filter((o) => o === 'no_contact').length,
  }
}

export async function sendStaffMessage(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission(PERMISSIONS.MESSAGE_SEND)
    const data = composeSchema.parse({
      audience: formData.get('audience'),
      recipientId: String(formData.get('recipientId') || ''),
      channel: formData.get('channel'),
      subject: String(formData.get('subject') || ''),
      body: formData.get('body'),
    })
    const isBroadcast = data.audience === 'ALL_CLIENTS' || data.audience === 'ALL_OWNERS'
    if (isBroadcast) await requirePermission(PERMISSIONS.MESSAGE_BROADCAST)
    if ((data.channel === 'EMAIL' || data.channel === 'BOTH') && !(data.subject || '').trim()) {
      return { ok: false, message: 'Email needs a subject.' }
    }

    const targets = await loadTargets(data.audience, data.recipientId)
    if (!targets.length) return { ok: false, message: 'No recipients found for that audience.' }

    const subject = (data.subject || 'Message from Doxa Car Hire').trim()
    const template = isBroadcast ? 'broadcast' : 'direct'
    let broadcastId: string | undefined
    if (isBroadcast) {
      const campaign = await prisma.broadcast.create({
        data: {
          title: subject,
          body: data.body,
          audience: data.audience === 'ALL_OWNERS' ? 'OWNERS' : 'CLIENTS',
          channel: data.channel === 'SMS' ? 'SMS' : 'EMAIL',
          createdBy: profile.id,
          sentAt: new Date(),
        },
      })
      broadcastId = campaign.id
    }

    const channelOutcomes: ChannelOutcome[] = []
    for (const target of targets) {
      const result = await sendToTarget(target, {
        channel: data.channel,
        subject,
        body: data.body,
        template,
        broadcastId,
      })
      if (result.email) channelOutcomes.push(result.email)
      if (result.sms) channelOutcomes.push(result.sms)
    }

    const stats = tally(channelOutcomes)
    const anyDelivered = stats.ok > 0

    if (!anyDelivered) {
      if (stats.noContact > 0 && stats.failed === 0) {
        return {
          ok: false,
          message: isBroadcast
            ? 'No messages sent — recipients are missing email/phone for the selected channel.'
            : `${targets[0].name} has no ${data.channel === 'SMS' ? 'phone number' : data.channel === 'EMAIL' ? 'email address' : 'email or phone'} on file.`,
        }
      }
      return {
        ok: false,
        message: isBroadcast
          ? 'Broadcast failed — no messages were delivered.'
          : `Could not send to ${targets[0].name}. Check delivery settings and try again.`,
      }
    }

    await writeAudit({
      userId: profile.id,
      action: isBroadcast ? 'comms.broadcast' : 'comms.send',
      entity: 'MessageLog',
      meta: {
        audience: data.audience,
        channel: data.channel,
        count: targets.length,
        delivered: stats.ok,
        failed: stats.failed,
        noContact: stats.noContact,
      },
    })
    refresh()

    const audienceLabel = data.audience === 'ALL_OWNERS' ? 'owners' : 'clients'
    if (isBroadcast) {
      const parts = [`Broadcast queued to ${targets.length} ${audienceLabel}`]
      if (stats.failed) parts.push(`${stats.failed} delivery failure${stats.failed === 1 ? '' : 's'}`)
      if (stats.noContact) {
        parts.push(`${stats.noContact} skipped (missing contact)`)
      }
      return {
        ok: true,
        message: `${parts[0]}${parts.length > 1 ? ` — ${parts.slice(1).join(', ')}` : ''}.`,
      }
    }

    if (stats.failed || stats.noContact) {
      return {
        ok: true,
        message: `Message partially queued to ${targets[0].name} (${stats.ok} channel${stats.ok === 1 ? '' : 's'} ok${
          stats.failed ? `, ${stats.failed} failed` : ''
        }${stats.noContact ? `, ${stats.noContact} missing contact` : ''}).`,
      }
    }

    return { ok: true, message: `Message queued to ${targets[0].name}.` }
  } catch (error) {
    return fail(error)
  }
}
