export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL
  if (!url) return false
  const normalized = url.toLowerCase()
  return ![
    'placeholder',
    'your-project',
    '[your-password]',
    'example.supabase.co',
  ].some((marker) => normalized.includes(marker))
}

/** Longer connect timeout helps Supabase pooler / free-tier wake-ups. */
export function withPrismaConnectionParams(url: string | undefined) {
  if (!url) return url
  const lower = url.toLowerCase()
  const parts: string[] = []
  if (!lower.includes('connect_timeout=')) parts.push('connect_timeout=30')
  if (!lower.includes('sslmode=')) parts.push('sslmode=require')
  if (!parts.length) return url
  const joiner = url.includes('?') ? '&' : '?'
  return `${url}${joiner}${parts.join('&')}`
}
