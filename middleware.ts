import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isStaffRole, isUserStatus } from '@/lib/auth/helpers'
import { normalizeSupabaseUrl, isSupabaseConfigured } from '@/lib/supabase-url'

function isProtectedPath(pathname: string) {
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/') ||
    pathname === '/admin/setup' ||
    pathname.startsWith('/admin/setup/')
  ) {
    return false
  }
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!isSupabaseConfigured()) return NextResponse.next()

  let supabaseResponse = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isProtectedPath(pathname)) {
    return supabaseResponse
  }

  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirect.cookies.set(name, value)
    })
    return redirect
  }

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('next', pathname)
    return redirectWithCookies(url)
  }

  const staffRole = isStaffRole(user.app_metadata?.staffRole)
    ? user.app_metadata.staffRole
    : isStaffRole(user.app_metadata?.role)
      ? mapLegacyRole(user.app_metadata.role)
      : null
  const status = isUserStatus(user.app_metadata?.status)
    ? user.app_metadata.status
    : null
  const isSuperAdmin = Boolean(user.app_metadata?.isSuperAdmin)
  const roleId = typeof user.app_metadata?.roleId === 'string' ? user.app_metadata.roleId : null

  // Stage 2: allow Super Admin, assigned roleId, or legacy staffRole enum
  if (!isSuperAdmin && !roleId && !staffRole) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('next', pathname)
    return redirectWithCookies(url)
  }

  if (status === 'SUSPENDED' || status === 'INACTIVE') {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('error', status === 'SUSPENDED' ? 'suspended' : 'inactive')
    await supabase.auth.signOut()
    return redirectWithCookies(url)
  }

  if (status && status !== 'ACTIVE') {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('error', 'inactive')
    await supabase.auth.signOut()
    return redirectWithCookies(url)
  }

  return supabaseResponse
}

function mapLegacyRole(role: string): 'DIRECTOR' | 'CLERK' | 'YARD' | 'ACCOUNTANT' | null {
  switch (role) {
    case 'ADMIN':
    case 'EXECUTIVE':
      return 'DIRECTOR'
    case 'SECRETARY':
      return 'CLERK'
    case 'ORGANIZER':
    case 'MEMBER':
      return 'YARD'
    case 'TREASURER':
      return 'ACCOUNTANT'
    default:
      return null
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
