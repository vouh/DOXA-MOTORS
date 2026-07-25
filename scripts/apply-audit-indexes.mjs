import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
  process.env[key] = value
}

const prisma = new PrismaClient()

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS audit_logs_meta_checkout_request_id_idx
  ON audit_logs ((meta->>'checkoutRequestId'))
  WHERE action = 'MPESA_STK_INIT'
`)

console.log('M-Pesa checkoutRequestId index ensured.')
await prisma.$disconnect()
