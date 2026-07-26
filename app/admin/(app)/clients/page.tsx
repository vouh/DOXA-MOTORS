'use client'

import { demoClients } from '@/lib/admin/data'
import { Btn, Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="Client Management" action={<Btn label="Register Client" icon="person_add" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Name', 'Phone', 'Email', 'Trips', 'Status', 'Actions']} />
            <tbody className="divide-y divide-outline-variant dark:divide-[#1a2d4f]">
              {demoClients.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low dark:hover:bg-[#0a1628]">
                  <td className="px-4 py-3 font-semibold text-on-surface dark:text-blue-50">{c.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60 whitespace-nowrap">{c.phone}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{c.email}</td>
                  <td className="px-4 py-3 text-center text-on-surface-variant dark:text-blue-200/60">{c.trips}</td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Btn label="View" icon="visibility" />
                      <Btn label="Receipt" icon="receipt_long" />
                      {c.status === 'Active'
                        ? <Btn label="Suspend" icon="block" variant="danger" />
                        : <Btn label="Activate" icon="check_circle" variant="primary" />}
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
