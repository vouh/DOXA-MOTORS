import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Dashboard — Doxa Car Hire',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
