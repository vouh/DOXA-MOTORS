import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { ORGANIZER_NAV } from '@/lib/dashboard/nav'
import { getSessionProfile } from '@/lib/auth/session'
import { getOrganizerEvents, getActiveMembers } from '@/lib/data/queries'
import OrganizerEventsClient from '@/components/dashboard/OrganizerEventsClient'

export default async function OrganizerEventsPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const [{ upcoming, past }, members] = await Promise.all([
    getOrganizerEvents(),
    getActiveMembers(),
  ])

  return (
    <DashboardShell role="ORGANIZER" title="Events" nav={ORGANIZER_NAV}>
      <OrganizerEventsClient upcoming={upcoming} past={past} members={members} />
    </DashboardShell>
  )
}
