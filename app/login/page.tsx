import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: {
    absolute: 'Login — Alubonets SHG',
  },
}

/** Staff/member portal sign-in only. Public registration is via AuthModal on the site. */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary" />}>
      <LoginForm title="Member Login" allowRegister={false} />
    </Suspense>
  )
}
