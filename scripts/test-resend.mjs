import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resend } from 'resend'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvLocal() {
  const path = resolve(root, '.env.local')
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvLocal()

const apiKey = process.env.RESEND_API_KEY
const from = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const to = process.env.RESEND_TEST_EMAIL

if (!apiKey || apiKey.startsWith('re_your-')) {
  console.error('FAIL: RESEND_API_KEY missing or placeholder')
  process.exit(1)
}
if (!to) {
  console.error('FAIL: RESEND_TEST_EMAIL not set')
  process.exit(1)
}

const resend = new Resend(apiKey)

console.log(`Sending test email`)
console.log(`  from: ${from}`)
console.log(`  to:   ${to}`)

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: 'Doxa Car Hire — Resend test',
  html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
  <div style="background:#043BA9;padding:20px 28px;">
    <span style="color:#fff;font-size:17px;font-weight:700;">Doxa Car Hire</span>
  </div>
  <div style="height:3px;background:#E90809;"></div>
  <div style="padding:28px 32px;">
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Resend is working</h2>
    <p style="margin:0 0 12px;color:#374151;">This is a connection test from your Doxa app.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Sent via <code>RESEND_API_KEY</code> to <code>RESEND_TEST_EMAIL</code> using <code>FROM_EMAIL=${from}</code>.</p>
  </div>
</div></body></html>`,
})

if (error) {
  console.error('FAIL:', error.message || error)
  process.exit(1)
}

console.log('OK: Email accepted by Resend')
console.log('  id:', data?.id)
console.log(`Check inbox (and spam) for ${to}`)
