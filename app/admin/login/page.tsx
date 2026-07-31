import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: {
    absolute: 'Staff Login — Doxa Car Hire',
  },
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary" />}>
      <LoginForm title="Staff Login" />
    </Suspense>
  )
}
