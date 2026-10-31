/**
 * SMS sender — Africa's Talking-ready stub.
 * Without SMS_API_KEY / SMS_USERNAME, messages stay queued and are logged only.
 * Wire the HTTP call when the provider account is ready.
 */

export type SmsSendResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; providerRef: string }
  | { ok: false; error: string }

function smsConfigured() {
  const key = process.env.SMS_API_KEY?.trim()
  const user = process.env.SMS_USERNAME?.trim()
  if (!key || !user) return false
  if (key.startsWith('your-') || user.startsWith('your-')) return false
  return true
}

/** Normalize KE numbers toward 2547… for gateway APIs. */
export function normalizeSmsPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('254') && digits.length >= 12) return digits
  if (digits.startsWith('0') && digits.length >= 10) return `254${digits.slice(1)}`
  if (digits.length === 9) return `254${digits}`
  return digits
}

export async function sendSms(opts: {
  to: string
  message: string
}): Promise<SmsSendResult> {
  const to = normalizeSmsPhone(opts.to)
  if (!to || to.length < 10) {
    return { ok: false, error: 'Invalid phone number for SMS.' }
  }

  if (!smsConfigured()) {
    console.info('[sms] not configured — queued only:', to, opts.message.slice(0, 80))
    return { ok: true, skipped: true, reason: 'SMS provider not configured yet' }
  }

  // Placeholder for Africa's Talking (or similar) when keys are live.
  // Example AT endpoint: https://api.africastalking.com/version1/messaging
  try {
    const sender = process.env.SMS_SENDER_ID || 'DOXA'
    const username = process.env.SMS_USERNAME!
    const apiKey = process.env.SMS_API_KEY!

    const body = new URLSearchParams({
      username,
      to,
      message: opts.message,
      from: sender,
    })

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey,
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `SMS provider error (${res.status}): ${text.slice(0, 200)}` }
    }

    const data = (await res.json().catch(() => ({}))) as {
      SMSMessageData?: { Recipients?: { messageId?: string }[] }
    }
    const providerRef =
      data.SMSMessageData?.Recipients?.[0]?.messageId || `sms-${Date.now()}`

    return { ok: true, skipped: false, providerRef }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'SMS send failed',
    }
  }
}

export { smsConfigured }
