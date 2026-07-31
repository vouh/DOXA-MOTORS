import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, normalizeSupabaseUrl } from '@/lib/supabase-url'

export function createServerClient() {
  return createClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
