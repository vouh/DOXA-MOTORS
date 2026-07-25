import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import type { Contribution, User } from '@prisma/client'
import { buildReceiptPdf } from '@/lib/pdf/receipt'
import { SITE_LOGO } from '@/lib/constants'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key || key.startsWith('re_your-')) return null
  return new Resend(key)
}

const from = () => process.env.FROM_EMAIL || 'noreply@doxacarhire.com'
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
// When set, ALL outgoing emails are redirected here (use until domain is verified)
const testEmailOverride = () => process.env.RESEND_TEST_EMAIL || null

function baseHtml(body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
  <div style="background:#043BA9;padding:20px 28px;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:14px;">
        <div style="width:44px;height:44px;border-radius:22px;overflow:hidden;display:inline-block;line-height:0;background:#0C5CF0;">
          <img src="${SITE_LOGO}" alt="Doxa Car Hire" width="44" height="44"
            style="width:44px;height:44px;display:block;" />
        </div>
      </td>
      <td style="vertical-align:middle;">
        <span style="color:#fff;font-size:17px;font-weight:700;letter-spacing:-.3px;font-family:sans-serif;">Doxa Car Hire</span>
      </td>
    </tr></table>
  </div>
  <div style="height:3px;background:#E90809;"></div>
  <div style="padding:28px 32px;">${body}</div>
  <div style="padding:16px 32px;background:#f5f7fa;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Doxa Tours & Car Hire · <a href="${appUrl()}" style="color:#9ca3af;">${appUrl()}</a></p>
  </div>
</div></body></html>`
}

// Sends an email to active users (all, or a specific subset by ID)
export async function sendBroadcastEmail({
  subject,
  title,
  body,
  ctaLabel,
  ctaUrl,
  imageUrl,
  template,
  actorId,
  memberIds,
}: {
  subject: string
  title: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  imageUrl?: string
  template: string
  actorId?: string
  memberIds?: string[]
}) {
  const resend = getResend()
  const where = memberIds?.length
    ? { id: { in: memberIds }, status: 'ACTIVE' as const }
    : { status: 'ACTIVE' as const }
  const members = await prisma.user.findMany({
    where,
    select: { id: true, email: true, fullName: true },
  })

  const ctaBlock = ctaLabel && ctaUrl
    ? `<p style="margin-top:24px;"><a href="${ctaUrl}" style="display:inline-block;background:#0C5CF0;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${ctaLabel}</a></p>`
    : ''

  const imageBlock = imageUrl
    ? `<img src="${imageUrl}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin-bottom:20px;display:block;" />`
    : ''

  const html = (name: string) =>
    baseHtml(`${imageBlock}<h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h2>
<p style="margin:0 0 8px;color:#374151;">Hello ${name},</p>
<div style="color:#374151;line-height:1.7;">${body}</div>
${ctaBlock}`)

  if (!resend) {
    await prisma.emailLog.create({
      data: {
        userId: actorId ?? '',
        toEmail: 'BROADCAST',
        subject,
        template,
        status: 'skipped',
        meta: { reason: 'RESEND_API_KEY not configured', recipients: members.length },
      },
    })
    return { sent: 0, skipped: members.length }
  }

  const override = testEmailOverride()
  let sent = 0
  for (let i = 0; i < members.length; i += 100) {
    const chunk = members.slice(i, i + 100)
    if (override) {
      const names = chunk.map((m) => m.fullName).join(', ')
      await resend.emails.send({
        from: from(),
        to: override,
        subject: `[TEST — would go to ${chunk.length} member(s): ${names}] ${subject}`,
        html: html('staff'),
      })
    } else {
      await resend.batch.send(
        chunk.map((m) => ({
          from: from(),
          to: m.email,
          subject,
          html: html(m.fullName),
        })),
      )
    }
    sent += chunk.length
  }

  await prisma.emailLog.create({
    data: {
      userId: actorId ?? '',
      toEmail: 'BROADCAST',
      subject,
      template,
      status: 'sent',
      meta: { sent },
    },
  })
  return { sent }
}

export async function sendNotificationEmail({
  title,
  body,
  actorId,
}: {
  title: string
  body: string
  actorId: string
}) {
  return sendBroadcastEmail({
    subject: title,
    title,
    body,
    template: 'notification',
    actorId,
  })
}

export async function sendMemberApprovedEmail(user: User) {
  const resend = getResend()
  const subject = 'Your Doxa Car Hire account was approved'
  const html = baseHtml(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome to Doxa Car Hire!</h2>
    <p style="margin:0 0 12px;color:#374151;">Hello ${user.fullName},</p>
    <p style="margin:0 0 20px;color:#374151;">Your account has been approved and is now active. You can log in and start using the management portal.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/login" style="display:inline-block;background:#0C5CF0;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Log in to your account</a></p>
  `)

  if (!resend) {
    await prisma.emailLog.create({
      data: {
        userId: user.id,
        toEmail: user.email,
        subject,
        template: 'member_approved',
        status: 'skipped',
        meta: { reason: 'RESEND_API_KEY not configured' },
      },
    })
    return { skipped: true }
  }

  try {
    await resend.emails.send({ from: from(), to: user.email, subject, html })
    await prisma.emailLog.create({
      data: { userId: user.id, toEmail: user.email, subject, template: 'member_approved', status: 'sent' },
    })
    return { skipped: false }
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        userId: user.id, toEmail: user.email, subject, template: 'member_approved', status: 'failed',
        meta: { error: err instanceof Error ? err.message : 'unknown' },
      },
    })
    return { skipped: false, error: true }
  }
}

export async function sendContributionReceiptEmail(
  contribution: Contribution & { user: User }
) {
  const resend = getResend()
  const { user, amount, mpesaRef: ref } = contribution
  const subject = `Payment receipt — KES ${amount.toLocaleString()}`
  const html = baseHtml(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Payment received</h2>
    <p style="margin:0 0 12px;color:#374151;">Hello ${user.fullName},</p>
    <p style="margin:0 0 8px;color:#374151;">We have received your payment of <strong style="color:#043BA9;">KES ${Math.round(amount).toLocaleString()}</strong>${ref ? ` (M-Pesa ref: <strong>${ref}</strong>)` : ''}.</p>
    <p style="margin:0 0 20px;color:#374151;">Your official receipt is attached as a PDF to this email.</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Thank you for choosing Doxa Car Hire.</p>
  `)

  if (!resend) {
    await prisma.emailLog.create({
      data: {
        userId: user.id, toEmail: user.email, subject, template: 'contribution_receipt',
        status: 'skipped', meta: { reason: 'RESEND_API_KEY not configured' },
      },
    })
    return { skipped: true }
  }

  try {
    const pdfBytes = await buildReceiptPdf(contribution)
    const { error } = await resend.emails.send({
      from: from(), to: user.email, subject, html,
      attachments: [{ filename: `receipt-${contribution.id}.pdf`, content: Buffer.from(pdfBytes) }],
    })
    if (error) throw new Error(error.message)
    await prisma.emailLog.create({
      data: { userId: user.id, toEmail: user.email, subject, template: 'contribution_receipt', status: 'sent' },
    })
    return { skipped: false }
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        userId: user.id, toEmail: user.email, subject, template: 'contribution_receipt', status: 'failed',
        meta: { error: err instanceof Error ? err.message : 'unknown' },
      },
    })
    return { skipped: false, error: true }
  }
}

export async function sendWelfareStatusEmail(user: User, status: string, note?: string | null) {
  const resend = getResend()
  const subject = `Request ${status.toLowerCase()}`
  const statusColor = status === 'APPROVED' ? '#15803d' : status === 'REJECTED' ? '#dc2626' : '#374151'
  const html = baseHtml(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Request update</h2>
    <p style="margin:0 0 12px;color:#374151;">Hello ${user.fullName},</p>
    <p style="margin:0 0 12px;color:#374151;">Your request is now <strong style="color:${statusColor};">${status}</strong>.</p>
    ${note ? `<p style="margin:0;color:#374151;">Note: ${note}</p>` : ''}
  `)

  if (!resend) {
    await prisma.emailLog.create({
      data: { userId: user.id, toEmail: user.email, subject, template: 'welfare_status', status: 'skipped' },
    })
    return
  }

  try {
    await resend.emails.send({ from: from(), to: user.email, subject, html })
    await prisma.emailLog.create({
      data: { userId: user.id, toEmail: user.email, subject, template: 'welfare_status', status: 'sent' },
    })
  } catch {
    await prisma.emailLog.create({
      data: { userId: user.id, toEmail: user.email, subject, template: 'welfare_status', status: 'failed' },
    })
  }
}
