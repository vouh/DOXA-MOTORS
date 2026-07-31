import { Resend } from 'resend'
import { SITE_LOGO } from '@/lib/constants'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key || key.startsWith('re_your-')) return null
  return new Resend(key)
}

const from = () => process.env.FROM_EMAIL || 'noreply@doxacarhire.com'
const testEmailOverride = () => process.env.RESEND_TEST_EMAIL || null

function resolveTo(intended: string) {
  const override = testEmailOverride()
  return {
    to: override || intended,
    subjectPrefix: override ? `[TEST — intended for ${intended}] ` : '',
  }
}

function baseHtml(body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#043BA9;padding:20px 28px;color:#fff;font-weight:700;">
    <img src="${SITE_LOGO}" alt="Doxa" width="32" height="32" style="vertical-align:middle;margin-right:8px;" />
    Doxa Car Hire
  </div>
  <div style="padding:28px;color:#222;font-size:14px;line-height:1.5;">${body}</div>
</div></body></html>`
}

export async function sendTransactionalEmail(opts: {
  to: string
  subject: string
  htmlBody: string
  attachments?: { filename: string; content: Buffer }[]
}) {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — skip send:', opts.subject)
    return { skipped: true as const }
  }
  const { to, subjectPrefix } = resolveTo(opts.to)
  await resend.emails.send({
    from: from(),
    to,
    subject: `${subjectPrefix}${opts.subject}`,
    html: baseHtml(opts.htmlBody),
    attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  })
  return { skipped: false as const }
}
