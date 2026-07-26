'use client'

import { Card, SectionHead } from '@/components/admin/ui'

export default function NotificationsPage() {
  const types = [
    { title: 'Booking Confirmation', desc: 'Send confirmation to client when a booking is created.',    icon: 'confirmation_number', count: 3, bg: 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30',                              ic: 'text-primary dark:text-blue-400',            btn: 'Send Confirmations' },
    { title: 'Return Reminder',      desc: 'Notify clients 24 h before their vehicle return deadline.', icon: 'alarm',               count: 2, bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',                               ic: 'text-amber-600 dark:text-amber-400',          btn: 'Send Reminders'     },
    { title: 'Owner Statement',      desc: 'Email earnings & expense statements to vehicle owners.',    icon: 'mail',                count: 5, bg: 'bg-tertiary/5 border-tertiary/20 dark:bg-[#1D2235]/40 dark:border-[#2d3550]',                           ic: 'text-tertiary dark:text-blue-200/70',         btn: 'Send Statements'    },
    { title: 'Late Return Alert',    desc: 'Alert management when a vehicle is overdue for return.',   icon: 'warning',             count: 1, bg: 'bg-secondary-container/5 border-secondary-container/20 dark:bg-red-900/20 dark:border-red-800',          ic: 'text-secondary-container dark:text-red-400', btn: 'Send Alerts'        },
  ]

  const log = [
    { msg: 'Booking confirmation sent to James Kariuki',   time: 'Today 09:15', icon: 'check_circle', cls: 'text-green-600 dark:text-green-400'              },
    { msg: 'Return reminder sent to Grace Muthoni',        time: 'Today 08:00', icon: 'alarm',        cls: 'text-amber-600 dark:text-amber-400'              },
    { msg: 'Owner statement sent to John Kamau',           time: 'Yesterday',   icon: 'mail',         cls: 'text-primary dark:text-blue-400'                 },
    { msg: 'Late return alert: KHF 678F overdue by 1 day', time: 'Yesterday',  icon: 'warning',      cls: 'text-secondary-container dark:text-red-400'      },
  ]

  return (
    <div className="space-y-5">
      <SectionHead title="Notifications" />
      <div className="grid sm:grid-cols-2 gap-4">
        {types.map((t) => (
          <div key={t.title} className={`rounded-xl border p-4 ${t.bg}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-[#0d1729] shadow-sm shrink-0">
                <span className={`material-symbols-outlined icon-fill text-[22px] ${t.ic}`}>{t.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-on-surface dark:text-blue-50 text-[14px]">{t.title}</p>
                  <span className="text-[10px] font-bold bg-white dark:bg-[#0d1729] border border-outline-variant dark:border-[#1a2d4f] rounded-full px-1.5 py-0.5 text-on-surface-variant dark:text-blue-200/50">{t.count}</span>
                </div>
                <p className="text-[12px] text-on-surface-variant dark:text-blue-200/60 mt-1">{t.desc}</p>
                <button className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white dark:bg-[#0d1729] border border-outline-variant dark:border-[#1a2d4f] hover:border-primary/40 text-on-surface dark:text-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  {t.btn}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="p-5">
        <p className="font-semibold text-on-surface dark:text-blue-50 text-[13px] mb-3">Recent Notifications</p>
        {log.map((n, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-outline-variant dark:border-[#1a2d4f] last:border-0">
            <span className={`material-symbols-outlined icon-fill text-[16px] ${n.cls}`}>{n.icon}</span>
            <p className="flex-1 text-[13px] text-on-surface dark:text-blue-100">{n.msg}</p>
            <span className="text-[11px] text-on-surface-variant dark:text-blue-200/40 shrink-0 whitespace-nowrap">{n.time}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
