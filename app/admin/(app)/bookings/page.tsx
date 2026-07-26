'use client'

import { demoBookings } from '@/lib/admin/data'
import { Btn, Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

export default function BookingsPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="Bookings & Dispatch" action={<Btn label="New Booking" icon="add_circle" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Booking ID', 'Client', 'Vehicle', 'From', 'To', 'Rate/Day', 'Total (KES)', 'Status', 'Actions']} />
            <tbody className="divide-y divide-outline-variant dark:divide-[#1a2d4f]">
              {demoBookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low dark:hover:bg-[#0a1628]">
                  <td className="px-4 py-3 font-mono text-primary dark:text-blue-400 font-semibold">{b.id}</td>
                  <td className="px-4 py-3 font-semibold text-on-surface dark:text-blue-50">{b.client}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{b.vehicle}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60 whitespace-nowrap">{b.from}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60 whitespace-nowrap">{b.to}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{b.rate.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-on-surface dark:text-blue-50">{b.total.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {b.status === 'Active' ? (
                        <>
                          <Btn label="Extend" icon="schedule" />
                          <Btn label="Check In" icon="login" variant="primary" />
                        </>
                      ) : (
                        <Btn label="Receipt" icon="receipt_long" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">warning</span>
        <p className="text-[13px] text-amber-800 dark:text-amber-300 font-medium">
          Lateness penalties are calculated at check-in — 20% surcharge per day overdue.
        </p>
      </div>
    </div>
  )
}
