'use client'

import ErrorFallback from '@/components/admin/ErrorFallback'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[var(--background,#f5f7fb)] dark:bg-[#06101f]">
      <ErrorFallback error={error} reset={reset} homeHref="/admin" />
    </div>
  )
}
