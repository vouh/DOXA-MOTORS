'use client'

import { useEffect } from 'react'
import { friendlyErrorMessage, isConnectionError } from '@/lib/errors'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const connection = isConnectionError(error)
  const message = friendlyErrorMessage(error)

  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f7fb' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 16,
              border: '1px solid #d8dee9',
              background: '#fff',
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(4,59,169,0.12)',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 18, color: '#1D2235' }}>
              {connection ? 'Connection problem' : 'Something went wrong'}
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.5, color: '#5b657a' }}>
              {message}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                border: 0,
                borderRadius: 10,
                background: '#0C5CF0',
                color: '#fff',
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
