import { redirect } from 'next/navigation'

/** Legacy path — profile is the account home. */
export default function AccountRedirect() {
  redirect('/admin/profile')
}
