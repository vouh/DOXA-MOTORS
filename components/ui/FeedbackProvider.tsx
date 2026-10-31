'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import FriendlyModal, { type FriendlyTone } from '@/components/ui/FriendlyModal'
import {
  classifyError,
  friendlyErrorMessage,
  logDevError,
  titleForErrorKind,
  urgencyForErrorKind,
} from '@/lib/errors'

type FeedbackPayload = {
  title: string
  message: string
  tone?: FriendlyTone
  primaryLabel?: string
}

type FeedbackContextValue = {
  showFeedback: (payload: FeedbackPayload) => void
  showError: (error: unknown, scope?: string) => void
  showSuccess: (message: string, title?: string) => void
  clearFeedback: () => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<FeedbackPayload | null>(null)

  const clearFeedback = useCallback(() => {
    setOpen(false)
  }, [])

  const showFeedback = useCallback((next: FeedbackPayload) => {
    setPayload(next)
    setOpen(true)
  }, [])

  const showError = useCallback(
    (error: unknown, scope = 'ui') => {
      logDevError(scope, error)
      const kind = classifyError(error)
      const tone: FriendlyTone = urgencyForErrorKind(kind) === 'urgent' ? 'urgent' : 'info'
      showFeedback({
        title: titleForErrorKind(kind),
        message: friendlyErrorMessage(error),
        tone,
        primaryLabel: kind === 'offline' || kind === 'connection' ? 'Got it' : 'OK',
      })
    },
    [showFeedback],
  )

  const showSuccess = useCallback(
    (message: string, title = 'Success') => {
      showFeedback({ title, message, tone: 'success', primaryLabel: 'OK' })
    },
    [showFeedback],
  )

  const value = useMemo(
    () => ({ showFeedback, showError, showSuccess, clearFeedback }),
    [showFeedback, showError, showSuccess, clearFeedback],
  )

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FriendlyModal
        open={open && Boolean(payload)}
        title={payload?.title || ''}
        message={payload?.message || ''}
        tone={payload?.tone || 'urgent'}
        primaryLabel={payload?.primaryLabel || 'OK'}
        onClose={clearFeedback}
      />
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error('useFeedback must be used within FeedbackProvider')
  }
  return ctx
}

/** Safe optional hook when provider may be missing (e.g. isolated story). */
export function useOptionalFeedback() {
  return useContext(FeedbackContext)
}
