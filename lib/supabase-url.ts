/** Strip accidental /rest/v1 suffix — Project URL must be the base host only. */
export function normalizeSupabaseUrl(url: string | undefined) {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '')
}

/** Service role / secret key — supports legacy and new Supabase env names. */
export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  )
}

/** Returns false when running with placeholder/missing credentials. */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    !!url &&
    !url.includes('placeholder') &&
    !!key &&
    !key.includes('placeholder')
  )
}
