import Link from 'next/link'
import { isDatabaseConfigured } from '@/lib/database-config'
import { isSupabaseConfigured } from '@/lib/supabase-url'

export const dynamic = 'force-dynamic'

export default function AdminSetupPage() {
  const databaseReady = isDatabaseConfigured()
  const authReady = isSupabaseConfigured()
  return (
    <main className="min-h-screen bg-surface px-5 py-16 text-on-surface">
      <div className="mx-auto max-w-2xl rounded-2xl border border-outline-variant bg-white p-7 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-primary">database</span>
          <div>
            <h1 className="text-xl font-bold">Connect Doxa to Supabase</h1>
            <p className="text-sm text-on-surface-variant">The application is running, but its example credentials must be replaced.</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Status label="PostgreSQL database" ready={databaseReady} />
          <Status label="Supabase authentication" ready={authReady} />
        </div>

        <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
          <li>Create or open the Doxa project in Supabase.</li>
          <li>Copy <code>.env.local.example</code> to <code>.env.local</code> and replace every <code>your-*</code> or <code>placeholder</code> value.</li>
          <li>Set <code>DATABASE_URL</code> to the Supabase pooled PostgreSQL URL and <code>DIRECT_URL</code> to its direct database URL.</li>
          <li>Set the project URL, publishable/anon key and service-role key from Supabase project settings.</li>
          <li>Stop the development server, run <code>npm run db:push</code>, then restart it with <code>npm run dev</code>.</li>
        </ol>

        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Current configuration still contains <code>db.placeholder.supabase.co</code>. That host does not exist and cannot accept a login or database query.
        </div>

        {databaseReady && authReady && (
          <Link href="/admin" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">
            Open dashboard
          </Link>
        )}
      </div>
    </main>
  )
}

function Status({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${ready ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <p className="font-semibold">{ready ? 'Ready' : 'Needs setup'}</p>
      <p className="text-xs">{label}</p>
    </div>
  )
}
