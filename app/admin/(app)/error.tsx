'use client'

import ErrorFallback from '@/components/admin/ErrorFallback'

export default function AdminAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorFallback error={error} reset={reset} homeHref="/admin" />
}
