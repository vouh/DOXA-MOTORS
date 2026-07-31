'use client'

const ACCOUNTS: { email: string; password: string; label: string }[] = [
  { email: 'superadmin@doxacarhire.com', password: 'SuperAdmin@2026!', label: 'Super Admin / Director' },
  { email: 'admin@doxacarhire.com', password: 'ChangeMe123!', label: 'Director' },
  { email: 'dispatch@doxacarhire.com', password: 'ChangeMe123!', label: 'Office Clerk' },
  { email: 'fleet@doxacarhire.com', password: 'ChangeMe123!', label: 'Yard Staff' },
  { email: 'finance@doxacarhire.com', password: 'ChangeMe123!', label: 'Accountant' },
]

export default function DevAccountsDropdown({
  open,
  onPick,
}: {
  open: boolean
  onPick: (email: string, password: string) => void
}) {
  if (process.env.NODE_ENV === 'production' || !open) return null

  return (
    <div className="absolute z-40 top-full left-0 right-0 mt-1 rounded-lg border border-outline-variant bg-white shadow-lg overflow-hidden">
      <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-on-surface-variant bg-surface-container-low border-b border-outline-variant/60">
        Dev accounts — click to autofill
      </p>
      <ul className="max-h-56 overflow-y-auto">
        {ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(a.email, a.password)
              }}
              className="w-full text-left px-3 py-2 hover:bg-surface-container transition-colors"
            >
              <span className="block text-[13px] font-medium text-on-surface">{a.label}</span>
              <span className="block text-[11px] text-on-surface-variant">{a.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
