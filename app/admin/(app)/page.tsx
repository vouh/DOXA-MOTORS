'use client'

import { useRouter } from 'next/navigation'
import { demoBookings } from '@/lib/admin/data'
import { Card, Th, StatusPill } from '@/components/admin/ui'

export default function DashboardPage() {
  const router = useRouter()

  const kpis = [
    { label: 'Total Clients',   value: '5',       icon: 'people',                 bg: 'bg-primary',             href: '/admin/clients'       },
    { label: 'Fleet Size',      value: '6',       icon: 'directions_car',         bg: 'bg-primary-container',   href: '/admin/vehicles'      },
    { label: 'Active Bookings', value: '3',       icon: 'assignment',             bg: 'bg-tertiary',            href: '/admin/bookings'      },
    { label: 'Revenue (KES)',   value: '100,600', icon: 'account_balance_wallet', bg: 'bg-secondary-container', href: '/admin/finance'       },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => router.push(k.href)}
            className={`text-left rounded-xl p-4 text-white shadow-card hover:opacity-90 active:scale-[.98] transition-all ${k.bg}`}
          >
            <span className="material-symbols-outlined icon-fill text-[22px] opacity-70">{k.icon}</span>
            <p className="mt-2 font-number text-[26px] font-bold leading-none">{k.value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest opacity-60">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Fleet status */}
        <Card className="p-5">
          <p className="text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 uppercase tracking-wider mb-4">Fleet Status</p>
          {[
            { label: 'Hired',       count: 3, total: 6, color: 'bg-green-500' },
            { label: 'Parked',      count: 2, total: 6, color: 'bg-outline' },
            { label: 'Maintenance', count: 1, total: 6, color: 'bg-secondary-container' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 mb-3 last:mb-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${f.color}`} />
              <span className="text-[13px] text-on-surface-variant dark:text-blue-200/60 w-24">{f.label}</span>
              <div className="flex-1 h-1.5 bg-surface-container dark:bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${f.color}`} style={{ width: `${(f.count / f.total) * 100}%` }} />
              </div>
              <span className="text-[13px] font-semibold text-on-surface dark:text-blue-50 w-4 text-right">{f.count}</span>
            </div>
          ))}
        </Card>

        {/* Quick actions */}
        <Card className="p-5">
          <p className="text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 uppercase tracking-wider mb-4">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Booking',     icon: 'add_circle',     href: '/admin/bookings'  },
              { label: 'Register Client', icon: 'person_add',     href: '/admin/clients'   },
              { label: 'Add Vehicle',     icon: 'directions_car', href: '/admin/vehicles'  },
              { label: 'Finance Report',  icon: 'bar_chart',      href: '/admin/finance'   },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => router.push(q.href)}
                className="flex items-center gap-2 p-3 rounded-xl border border-outline-variant dark:border-[#1a2d4f] hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-primary dark:text-blue-400 text-[18px]">{q.icon}</span>
                <span className="text-[12px] font-medium text-on-surface dark:text-blue-100">{q.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent bookings */}
      <Card>
        <div className="px-4 py-3 border-b border-outline-variant dark:border-[#1a2d4f] flex items-center justify-between">
          <p className="text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 uppercase tracking-wider">Recent Bookings</p>
          <button onClick={() => router.push('/admin/bookings')} className="text-[12px] text-primary dark:text-blue-400 hover:underline font-medium">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['ID', 'Client', 'Vehicle', 'Period', 'Total (KES)', 'Status']} />
            <tbody className="divide-y divide-outline-variant dark:divide-[#1a2d4f]">
              {demoBookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low dark:hover:bg-[#0a1628]">
                  <td className="px-4 py-3 font-mono text-primary dark:text-blue-400 font-semibold">{b.id}</td>
                  <td className="px-4 py-3 font-medium text-on-surface dark:text-blue-50">{b.client}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60">{b.vehicle}</td>
                  <td className="px-4 py-3 text-on-surface-variant dark:text-blue-200/60 whitespace-nowrap">{b.from} → {b.to}</td>
                  <td className="px-4 py-3 font-semibold text-on-surface dark:text-blue-50">{b.total.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
