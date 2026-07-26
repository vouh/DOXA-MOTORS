'use client'

import { demoOwners } from '@/lib/admin/data'
import { Btn, Card, Th, SectionHead } from '@/components/admin/ui'

export default function OwnersPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="Owner Management" action={<Btn label="Add Owner" icon="person_add" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Owner', 'Phone', 'Vehicles', 'Gross (KES)', 'Expenses (KES)', 'Net Balance (KES)', 'Actions']} />
            <tbody className="divide-y divide-outline-variant dark:divide-[#1a2d4f]">
              {demoOwners.map((o) => (
                <tr key={o.id} className="hover:bg-surface-container-low dark:hover:bg-[#0a1628]">
                  <td className="px-4 py-3 font-semibold text-on-surface dark:text-blue-50">{o.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60 whitespace-nowrap">{o.phone}</td>
                  <td className="px-4 py-3 text-center text-on-surface-variant dark:text-blue-200/60">{o.vehicles}</td>
                  <td className="px-4 py-3 font-semibold text-green-700 dark:text-green-400">{o.gross.toLocaleString()}</td>
                  <td className="px-4 py-3 text-secondary-container dark:text-red-400">{o.expenses.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-on-surface dark:text-blue-50">{o.balance.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Btn label="Earnings" icon="trending_up" />
                      <Btn label="Expenses" icon="receipt" />
                      <Btn label="Pay Out" icon="payments" variant="primary" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
