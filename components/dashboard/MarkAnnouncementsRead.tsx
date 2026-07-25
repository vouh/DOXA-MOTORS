'use client'

import { useEffect } from 'react'
import { actionMarkAnnouncementsRead } from '@/app/actions/domain'

export default function MarkAnnouncementsRead() {
  useEffect(() => {
    actionMarkAnnouncementsRead().then(() => {
      window.dispatchEvent(new Event('announcements-read'))
    })
  }, [])

  return null
}
