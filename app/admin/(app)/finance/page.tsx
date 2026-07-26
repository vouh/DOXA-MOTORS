'use client'

import { Btn, Card, SectionHead } from '@/components/admin/ui'

export default function FinancePage() {
  const income   = { bookings: 97100, penalties: 2500, other: 1000, total: 100600 }
  const expenses = { fuel: 5000, maintenance: 8500, commission: 4000, other: 2000, total: 19500 }
  const net      = income.total - expenses.total
  const margin   = Math.round((net / income.total) * 100)

  return (
    <div className="space-y-5">
      <SectionHead
        title="Finance & Reports"
        action={
          <div className="flex gap-2">
            <Btn label="Export CSV"   icon="table_view" />
            <Btn label="Export Excel" icon="grid_on" variant="primary" />
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">trending_up</span>
            <p className="font-semibold text-on-surface-variant dark:text-blue-200/60 text-[13px]">Total Income</p>
          </div>
          <p className="font-number text-[28px] font-bold text-green-700 dark:text-green-400">KES {income.total.toLocaleString()}</p>
          <div className="mt-3 space-y-1.5 border-t border-outline-variant dark:border-[#1a2d4f] pt-3">
            {[['Bookings', income.bookings], ['Penalties', income.penalties], ['Other', income.other]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-[12px] text-on-surface-variant dark:text-blue-200/50">
                <span>{l}</span><span className="font-medium">KES {Number(v).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary-container dark:text-red-400">trending_down</span>
            <p className="font-semibold text-on-surface-variant dark:text-blue-200/60 text-[13px]">Total Expenses</p>
          </div>
          <p className="font-number text-[28px] font-bold text-secondary-container dark:text-red-400">KES {expenses.total.toLocaleString()}</p>
          <div className="mt-3 space-y-1.5 border-t border-outline-variant dark:border-[#1a2d4f] pt-3">
            {[['Fuel', expenses.fuel], ['Maintenance', expenses.maintenance], ['Commission', expenses.commission], ['Other', expenses.other]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-[12px] text-on-surface-variant dark:text-blue-200/50">
                <span>{l}</span><span className="font-medium">KES {Number(v).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="rounded-xl p-5 text-white shadow-card bg-primary-container">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-white/70">account_balance</span>
            <p className="font-semibold text-white/80 text-[13px]">Net Profit</p>
          </div>
          <p className="font-number text-[28px] font-bold">KES {net.toLocaleString()}</p>
          <div className="mt-4">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${margin}%` }} />
            </div>
            <p className="text-white/50 text-[11px] mt-1">{margin}% profit margin</p>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <p className="font-semibold text-on-surface dark:text-blue-50 text-[13px] mb-4">Record Transaction</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Btn label="Record Income"   icon="add_circle"    variant="primary" />
          <Btn label="Record Expense"  icon="remove_circle" variant="danger"  />
          <Btn label="P & L Report"    icon="bar_chart"                       />
          <Btn label="Monthly Summary" icon="calendar_month"                  />
        </div>
      </Card>
    </div>
  )
}
