import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Admin Dashboard — Doxa Car Hire',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
