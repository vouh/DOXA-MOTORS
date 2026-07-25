'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSessionProfile, syncUserMetadata } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(40).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  avatarUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => {
      const t = v?.trim()
      if (!t) return null
      try {
        // eslint-disable-next-line no-new
        new URL(t)
        return t
      } catch {
        throw new Error('Avatar URL must be a valid link')
      }
    }),
})

export async function updateMyProfile(input: z.infer<typeof profileSchema>) {
  const session = await requireSessionProfile()
  const data = profileSchema.parse(input)

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || null,
      location: data.location?.trim() || null,
      avatarUrl: data.avatarUrl?.trim() || null,
    },
  })

  await syncUserMetadata(updated)
  await writeAudit({
    userId: session.id,
    action: 'PROFILE_UPDATE',
    entity: 'User',
    entityId: session.id,
  })

  revalidatePath('/profile')
  return updated
}
