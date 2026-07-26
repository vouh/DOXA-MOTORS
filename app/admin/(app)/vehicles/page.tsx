'use client'

import { demoVehicles } from '@/lib/admin/data'
import { Btn, Card, Th, StatusPill, SectionHead } from '@/components/admin/ui'

export default function VehiclesPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="Vehicle Management" action={<Btn label="Add Vehicle" icon="add" variant="primary" />} />
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hired',       count: 3, cls: 'border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
          { label: 'Parked',      count: 2, cls: 'border-outline-variant bg-surface-container text-on-surface-variant dark:bg-[#111f36] dark:text-blue-200/60 dark:border-[#1a2d4f]' },
          { label: 'Maintenance', count: 1, cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.cls}`}>
            <p className="font-number text-[26px] font-bold">{s.count}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Reg No', 'Make / Model', 'Owner', 'Status', 'Current Client', 'Days Out', 'Actions']} />
            <tbody className="divide-y divide-outline-variant dark:divide-[#1a2d4f]">
              {demoVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-surface-container-low dark:hover:bg-[#0a1628]">
                  <td className="px-4 py-3 font-mono font-bold text-on-surface dark:text-blue-50">{v.reg}</td>
                  <td className="px-4 py-3 text-on-surface dark:text-blue-100">{v.make}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{v.owner}</td>
                  <td className="px-4 py-3"><StatusPill status={v.status} /></td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{v.client}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{v.days > 0 ? `${v.days}d` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Btn label="Edit" icon="edit" />
                      <Btn label="Assign Owner" icon="person" />
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
