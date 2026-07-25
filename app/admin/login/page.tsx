import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: {
    absolute: 'Admin Login — Alubonets SHG',
  },
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary" />}>
      <LoginForm title="Admin Login" allowRegister={false} admin />
    </Suspense>
  )
}
