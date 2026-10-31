import { redirect } from 'next/navigation'

/** Staff moved into Settings — keep old URL working. */
export default function StaffRedirectPage() {
  redirect('/admin/settings')
}
