import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Dashboard — Alubonets SHG',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
