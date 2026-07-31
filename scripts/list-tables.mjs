import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raw = readFileSync(resolve(root, '.env.local'), 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  process.env[k] = v
}

const prisma = new PrismaClient()
const rows = await prisma.$queryRaw`
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`
console.log(rows.map((r) => r.tablename).join('\n'))
await prisma.$disconnect()
