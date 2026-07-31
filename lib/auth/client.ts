import { ADMIN_HOME, type AuthUser, type StaffRole } from './types'

export { ADMIN_HOME }
export type { AuthUser, StaffRole }

export async function loginRequest(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Invalid credentials')
  }
  return data as { user: AuthUser; redirectTo: string; status?: string }
}

export async function logoutRequest() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Network hiccup — callers still redirect
  }
}

export async function meRequest(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) return null
  const data = await res.json()
  return data.user ?? null
}

export function homeForRole(_role?: StaffRole) {
  return ADMIN_HOME
}
