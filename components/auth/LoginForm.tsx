'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import BrandLogo from '@/components/brand/BrandLogo'
import { ADMIN_HOME, loginRequest, logoutRequest, meRequest, type AuthUser } from '@/lib/auth/client'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDev = process.env.NODE_ENV === 'development'
  const [email, setEmail] = useState(isDev ? 'superadmin@doxacarhire.com' : '')
  const [password, setPassword] = useState(isDev ? 'SuperAdmin@2026!' : '')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')

  useEffect(() => {
    meRequest().then((user: AuthUser | null) => {
      if (user) {
        const next = searchParams.get('next')
        router.replace(next && next.startsWith('/') ? next : ADMIN_HOME)
      }
    })
  }, [router, searchParams])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'suspended') setError('Your account has been suspended.')
    else if (err === 'inactive') setError('Your account is not active.')
    else if (err === 'not_invited') setError('No staff invite for this email.')
    else if (err === 'oauth') setError('Sign-in failed. Try again.')
  }, [searchParams])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        setInfo(data.message || 'If that account exists, a reset link was sent.')
        setMode('login')
        return
      }

      const { redirectTo, status } = await loginRequest(email, password)
      if (status && status !== 'ACTIVE') {
        await logoutRequest()
        setError('Your account is not active.')
        return
      }
      const next = searchParams.get('next')
      router.replace(next && next.startsWith('/') ? next : redirectTo || ADMIN_HOME)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#D4E6FB] px-4 py-20">
      {/* Same compact card size for Sign in + Reset password */}
      <div className="relative w-full max-w-[600px]">
        <div className="relative z-0 flex min-h-[360px] flex-col justify-center rounded-2xl bg-white px-8 pb-8 pt-16 shadow-[0_18px_50px_rgba(4,59,169,0.1)] md:ml-[200px] md:min-h-[340px] md:px-11 md:py-10 md:pl-12">
          <h1 className="text-[24px] font-semibold tracking-tight text-[#3a4150]">
            {mode === 'forgot' ? 'Reset password' : 'Sign in'}
          </h1>

          <form onSubmit={onSubmit} className="mt-6 max-w-[240px] space-y-5" autoComplete="on">
            <label className="block">
              <span className={`text-[13px] ${email ? 'font-medium text-primary' : 'text-[#a0a8b8]'}`}>
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 text-[15px] text-[#2a2f3a] focus:outline-none focus:ring-0 ${
                  email ? 'border-primary' : 'border-[#d8dde6] focus:border-primary'
                }`}
                autoComplete="username"
              />
            </label>

            {mode === 'login' && (
              <label className="block">
                <span
                  className={`text-[13px] ${password ? 'font-medium text-primary' : 'text-[#a0a8b8]'}`}
                >
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 pr-12 text-[15px] text-[#2a2f3a] focus:outline-none focus:ring-0 ${
                      password ? 'border-primary' : 'border-[#d8dde6] focus:border-primary'
                    }`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute bottom-1.5 right-0 text-[11px] font-medium text-[#a0a8b8] hover:text-primary"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
            )}

            {error && (
              <p className="text-sm text-secondary" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-green-700" role="status">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-full bg-gradient-to-r from-secondary to-secondary-container py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_32px_rgba(233,8,9,0.42)] transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
            >
              {loading
                ? mode === 'forgot'
                  ? 'Sending…'
                  : 'Signing in…'
                : mode === 'forgot'
                  ? 'Send link'
                  : 'Sign in'}
            </button>

            <button
              type="button"
              className="w-full text-[13px] text-[#a0a8b8] hover:text-primary"
              onClick={() => {
                setMode((m) => (m === 'login' ? 'forgot' : 'login'))
                setError('')
                setInfo('')
              }}
            >
              {mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </form>
        </div>

        {/* BLUE brand — 12px overhang top & bottom */}
        <aside
          className="absolute left-0 z-10 hidden w-[240px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-[#3B8BFF] via-primary to-primary-container px-6 py-8 text-white shadow-[12px_4px_32px_rgba(4,59,169,0.32)] md:flex"
          style={{
            top: '-12px',
            bottom: '-12px',
            clipPath: 'polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)',
          }}
          aria-label="Doxa Motor Solutions"
        >
          <div className="pr-3">
            <BrandLogo variant="login" className="!h-[56px] !w-[56px]" />
            <p className="mt-6 text-[28px] font-extrabold leading-none tracking-tight">DOXA</p>
            <p className="mt-2.5 text-[13px] font-medium text-white/85">Motor Solutions</p>
            <p className="mt-1 text-[11px] text-white/55">Car Hire</p>
          </div>
          <p className="pr-3 text-[10px] leading-relaxed tracking-wide text-white/50">
            Powered by
            <br />
            SpectreTech Limited
          </p>
        </aside>

        {/* Mobile brand */}
        <div className="absolute -top-5 left-4 right-4 z-10 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container px-4 py-3 text-white shadow-lg md:hidden">
          <BrandLogo variant="compact" />
          <div>
            <p className="text-base font-bold leading-none">DOXA</p>
            <p className="mt-1 text-[10px] text-white/70">Powered by SpectreTech Limited</p>
          </div>
        </div>
      </div>
    </div>
  )
}
