'use server'

import { revalidatePath } from 'next/cache'
import { actionFail } from '@/lib/errors'
import { requireActiveStaff } from '@/lib/auth/session'
import {
  countUnreadStaffNotifications,
  deleteStaffNotification,
  markStaffNotificationRead,
} from '@/lib/intelligence/notifications'

type ActionResult = { ok: true; message: string; unread?: number } | { ok: false; message: string }

function refresh() {
  revalidatePath('/admin/notifications')
  revalidatePath('/admin', 'layout')
}

export async function markStaffNoticeRead(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActiveStaff()
    const id = String(formData.get('id') || '').trim()
    if (!id) return { ok: false, message: 'Notification id is required.' }
    await markStaffNotificationRead(profile.id, id)
    const unread = await countUnreadStaffNotifications(profile.id)
    refresh()
    return { ok: true, message: 'Marked as read.', unread }
  } catch (error) {
    return actionFail(error)
  }
}

export async function dismissStaffNotification(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActiveStaff()
    const id = String(formData.get('id') || '').trim()
    if (!id) return { ok: false, message: 'Notification id is required.' }
    await deleteStaffNotification(id)
    const unread = await countUnreadStaffNotifications(profile.id)
    refresh()
    return { ok: true, message: 'Notification removed.', unread }
  } catch (error) {
    return actionFail(error)
  }
}
