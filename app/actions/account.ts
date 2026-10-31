'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { requireActiveStaff } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'
import { actionFail, friendlyErrorMessage } from '@/lib/errors'

type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function fail(error: unknown): ActionResult {
  return actionFail(error)
}

/** Logged-in staff change their own password via Supabase Auth. */
export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireActiveStaff()
    const schema = z.object({
      password: z.string().min(8),
      confirm: z.string().min(8),
    })
    const data = schema.parse({
      password: formData.get('password'),
      confirm: formData.get('confirm'),
    })
    if (data.password !== data.confirm) throw new Error('Passwords do not match.')

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) throw new Error(friendlyErrorMessage(error))

    await writeAudit({
      userId: profile.id,
      action: 'staff.password_change',
      entity: 'User',
      entityId: profile.id,
    })
    return { ok: true, message: 'Password updated.' }
  } catch (error) {
    return fail(error)
  }
}
