import { prisma } from '@/lib/prisma'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { sendSms } from '@/lib/sms/send'

export type CommRecipientType = 'CLIENT' | 'OWNER'
export type CommChannel = 'EMAIL' | 'SMS'

export type DispatchResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason?: 'no_address' | 'send_failed' }

/**
 * Deliver email to the recipient's address only.
 * RESEND_TEST_EMAIL (via sendTransactionalEmail) may redirect delivery for onboarding,
 * but we never invent a destination when the recipient has no email.
 */
export async function dispatchEmail(opts: {
  recipientType: CommRecipientType
  recipientId: string
  recipientName: string
  email: string | null
  template: string
  subject: string
  body: string
  broadcastId?: string
}): Promise<DispatchResult> {
  const intended = opts.email?.trim() || ''
  if (!intended) {
    await prisma.messageLog.create({
      data: {
        recipientType: opts.recipientType,
        recipientId: opts.recipientId,
        recipientName: opts.recipientName,
        destination: '(none)',
        channel: 'EMAIL',
        template: opts.template,
        subject: opts.subject,
        body: opts.body,
        status: 'SKIPPED',
        error: 'No email address on file',
        broadcastId: opts.broadcastId,
      },
    })
    return { ok: false, reason: 'no_address' }
  }

  const log = await prisma.messageLog.create({
    data: {
      recipientType: opts.recipientType,
      recipientId: opts.recipientId,
      recipientName: opts.recipientName,
      destination: intended,
      channel: 'EMAIL',
      template: opts.template,
      subject: opts.subject,
      body: opts.body,
      status: 'QUEUED',
      broadcastId: opts.broadcastId,
    },
  })

  const htmlBody = opts.body
    .split('\n')
    .map((line) => `<p style="margin:0 0 10px;">${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('')

  try {
    const sent = await sendTransactionalEmail({
      to: intended,
      subject: opts.subject,
      htmlBody,
    })
    await prisma.messageLog.update({
      where: { id: log.id },
      data: sent.skipped
        ? { status: 'SKIPPED', error: 'RESEND_API_KEY missing — email not sent' }
        : { status: 'SENT', sentAt: new Date(), error: null },
    })
    return { ok: true, skipped: sent.skipped }
  } catch (err) {
    await prisma.messageLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Email send failed',
      },
    })
    return { ok: false, reason: 'send_failed' }
  }
}

export async function dispatchSms(opts: {
  recipientType: CommRecipientType
  recipientId: string
  recipientName: string
  phone: string
  template: string
  body: string
  broadcastId?: string
}): Promise<DispatchResult> {
  const phone = opts.phone?.trim() || ''
  if (!phone) {
    await prisma.messageLog.create({
      data: {
        recipientType: opts.recipientType,
        recipientId: opts.recipientId,
        recipientName: opts.recipientName,
        destination: '(none)',
        channel: 'SMS',
        template: opts.template,
        body: opts.body,
        status: 'SKIPPED',
        error: 'No phone number on file',
        broadcastId: opts.broadcastId,
      },
    })
    return { ok: false, reason: 'no_address' }
  }

  const log = await prisma.messageLog.create({
    data: {
      recipientType: opts.recipientType,
      recipientId: opts.recipientId,
      recipientName: opts.recipientName,
      destination: phone,
      channel: 'SMS',
      template: opts.template,
      body: opts.body,
      status: 'QUEUED',
      broadcastId: opts.broadcastId,
    },
  })

  const sms = await sendSms({ to: phone, message: opts.body })
  if (!sms.ok) {
    await prisma.messageLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', error: sms.error },
    })
    return { ok: false, reason: 'send_failed' }
  }
  if (sms.skipped) {
    await prisma.messageLog.update({
      where: { id: log.id },
      data: { status: 'QUEUED', error: sms.reason },
    })
    return { ok: true, skipped: true }
  }
  await prisma.messageLog.update({
    where: { id: log.id },
    data: { status: 'SENT', sentAt: new Date(), providerRef: sms.providerRef, error: null },
  })
  return { ok: true, skipped: false }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
