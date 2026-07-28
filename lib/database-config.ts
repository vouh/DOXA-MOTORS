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
