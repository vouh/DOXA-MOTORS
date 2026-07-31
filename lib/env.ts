import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(8).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

const productionRequired = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'CRON_SECRET',
] as const

export type ServerEnv = z.infer<typeof serverEnvSchema>

/** Validate env. In production, missing critical keys throw. Dev only warns. */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = serverEnvSchema.safeParse(env)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    if (env.NODE_ENV === 'production') throw new Error(`Invalid environment: ${msg}`)
    console.warn('[env]', msg)
    return env as ServerEnv
  }

  if (env.NODE_ENV === 'production') {
    const missing: string[] = productionRequired.filter((key) => !env[key]?.trim())
    const hasSupabaseKey =
      Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) ||
      Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
    const hasServiceKey =
      Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()) || Boolean(env.SUPABASE_SECRET_KEY?.trim())
    if (!hasSupabaseKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    if (!hasServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)')
    if (missing.length) {
      throw new Error(`Invalid environment: missing ${missing.join(', ')}`)
    }
  }

  return parsed.data
}
