import { ADMIN_HOME, type AuthUser, type StaffRole } from './types'

export { ADMIN_HOME }
export type { AuthUser, StaffRole }

const OFFLINE_MSG = "You're offline. Check your internet connection and try again."

export async function loginRequest(email: string, password: string) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(OFFLINE_MSG)
  }

  let res: Response
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error(OFFLINE_MSG)
  }

  let data: { error?: string; user?: AuthUser; redirectTo?: string; status?: string } = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  if (!res.ok) {
    // Prefer API’s friendly message; never surface raw transport dumps.
    throw new Error(
      data.error ||
        (res.status === 503
          ? 'We could not reach the database just now. Please try again in a moment.'
          : 'Incorrect email or password. Please try again.'),
    )
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
  try {
    const res = await fetch('/api/auth/me')
    if (!res.ok) return null
    const data = await res.json()
    return data.user ?? null
  } catch {
    return null
  }
}

export function homeForRole(_role?: StaffRole) {
  return ADMIN_HOME
}
