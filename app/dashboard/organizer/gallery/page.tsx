import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { ORGANIZER_NAV } from '@/lib/dashboard/nav'
import { getSessionProfile } from '@/lib/auth/session'
import { getOrganizerGalleryPhotos } from '@/lib/data/queries'
import OrganizerGalleryClient from '@/components/dashboard/OrganizerGalleryClient'

export default async function OrganizerGalleryPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (!['ORGANIZER', 'ADMIN', 'SECRETARY'].includes(profile.role)) redirect('/dashboard')

  const photos = await getOrganizerGalleryPhotos()

  return (
    <DashboardShell role="ORGANIZER" title="Gallery" nav={ORGANIZER_NAV}>
      <OrganizerGalleryClient photos={photos} />
    </DashboardShell>
  )
}
