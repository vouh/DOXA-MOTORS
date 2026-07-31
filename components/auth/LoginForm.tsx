'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import BrandLogo from '@/components/brand/BrandLogo'
import DevAccountsDropdown from '@/components/auth/DevAccountsDropdown'
import { ADMIN_HOME, loginRequest, logoutRequest, meRequest, type AuthUser } from '@/lib/auth/client'

type Props = {
  title?: string
}

export default function LoginForm({ title = 'Staff Login' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devOpen, setDevOpen] = useState(false)

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
    if (err === 'suspended') {
      setError('Your account has been suspended. Contact a Director.')
    } else if (err === 'inactive') {
      setError('Your account is not active. Contact a Director.')
    } else if (err === 'not_invited') {
      setError('No staff invite for this account. Ask a Director to invite you first.')
    } else if (err === 'oauth') {
      setError('Sign-in failed. Try again or use email and password.')
    }
  }, [searchParams])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
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
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white shadow-lg p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <BrandLogo variant="compact" />
          <h1 className="font-h3 text-xl font-bold text-on-surface">{title}</h1>
          <p className="text-sm text-on-surface-variant text-center">Doxa Car Hire — staff access</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setDevOpen(true)}
              onBlur={() => setTimeout(() => setDevOpen(false), 150)}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              autoComplete="username"
            />
            <DevAccountsDropdown
              open={devOpen}
              onPick={(e, p) => {
                setEmail(e)
                setPassword(p)
                setDevOpen(false)
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary text-white py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
