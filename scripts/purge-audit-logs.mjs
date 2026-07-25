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

const months = Number(process.env.AUDIT_RETENTION_MONTHS || 18)
const dryRun = process.argv.includes('--dry-run')
const prisma = new PrismaClient()

const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - months)

const count = await prisma.auditLog.count({
  where: { createdAt: { lt: cutoff } },
})

console.log(
  `Audit retention: ${count} row(s) older than ${months} months (before ${cutoff.toISOString()})`
)

if (dryRun) {
  console.log('Dry run — no deletes.')
} else if (count > 0) {
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  console.log(`Deleted ${result.count} audit log row(s).`)
} else {
  console.log('Nothing to delete.')
}

await prisma.$disconnect()
