/**
 * Creates Supabase Auth users for seeded Prisma profiles and links authUserId.
 *
 * Usage: npm run db:bootstrap-auth
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvLocal() {
  const raw = readFileSync(resolve(root, '.env.local'), 'utf8')
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

const SUPER_ADMIN_EMAIL = 'superadmin@doxacarhire.com'
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2026!'
const defaultPassword = process.env.SEED_AUTH_PASSWORD || 'ChangeMe123!'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const prisma = new PrismaClient()

const users = await prisma.user.findMany()
for (const user of users) {
  const password =
    user.email.toLowerCase() === SUPER_ADMIN_EMAIL ? superAdminPassword : defaultPassword

  const meta = {
    staffRole: user.staffRole,
    status: user.status,
    isSuperAdmin: user.isSuperAdmin,
    dbUserId: user.id,
    fullName: user.fullName,
  }

  if (user.authUserId) {
    await admin.auth.admin.updateUserById(user.authUserId, {
      password,
      app_metadata: meta,
    })
    console.log(`updated ${user.email}`)
    continue
  }

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === user.email.toLowerCase())

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, app_metadata: meta })
    await prisma.user.update({ where: { id: user.id }, data: { authUserId: existing.id } })
    console.log(`linked ${user.email}`)
    continue
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    app_metadata: meta,
  })
  if (error || !created.user) {
    console.error(`failed ${user.email}`, error?.message)
    continue
  }
  await prisma.user.update({ where: { id: user.id }, data: { authUserId: created.user.id } })
  console.log(`created ${user.email}`)
}

await prisma.$disconnect()
console.log('bootstrap-auth done')
