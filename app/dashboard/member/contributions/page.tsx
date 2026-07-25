import { redirect } from 'next/navigation'

/** Member contributions live at the shared /contributions page for all roles. */
export default function MemberContributionsRedirect() {
  redirect('/contributions')
}
