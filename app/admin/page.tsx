'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ADMIN_SIDEBAR_LOGO } from '@/lib/constants'

type Section = 'dashboard' | 'clients' | 'vehicles' | 'bookings' | 'owners' | 'finance' | 'notifications' | 'staff'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',          icon: 'dashboard' },
  { id: 'clients',       label: 'Clients',             icon: 'people' },
  { id: 'vehicles',      label: 'Vehicles',            icon: 'directions_car' },
  { id: 'bookings',      label: 'Bookings & Dispatch', icon: 'assignment' },
  { id: 'owners',        label: 'Owners',              icon: 'person_pin' },
  { id: 'finance',       label: 'Finance & Reports',   icon: 'account_balance_wallet' },
  { id: 'notifications', label: 'Notifications',       icon: 'notifications' },
  { id: 'staff',         label: 'Staff',               icon: 'manage_accounts' },
]

// ── Demo data ─────────────────────────────────────────────────────────────────

const demoClients = [
  { id: '1', name: 'James Kariuki',  phone: '0712 345 678', email: 'james@gmail.com',  status: 'Active',    trips: 3 },
  { id: '2', name: 'Mary Wanjiru',   phone: '0723 456 789', email: 'mary@gmail.com',   status: 'Active',    trips: 1 },
  { id: '3', name: 'Peter Otieno',   phone: '0734 567 890', email: 'peter@gmail.com',  status: 'Suspended', trips: 0 },
  { id: '4', name: 'Grace Muthoni',  phone: '0745 678 901', email: 'grace@gmail.com',  status: 'Active',    trips: 2 },
  { id: '5', name: 'Samuel Waweru',  phone: '0756 789 012', email: 'samuel@gmail.com', status: 'Active',    trips: 5 },
]

const demoVehicles = [
  { id: '1', reg: 'KCA 123A', make: 'Toyota Fielder',  owner: 'John Kamau',   status: 'Hired',       client: 'James Kariuki', days: 5 },
  { id: '2', reg: 'KDB 456B', make: 'Toyota Axio',     owner: 'Jane Njoki',   status: 'Parked',      client: '—',             days: 0 },
  { id: '3', reg: 'KEC 789C', make: 'Nissan Note',     owner: 'Peter Mwangi', status: 'Hired',       client: 'Grace Muthoni', days: 4 },
  { id: '4', reg: 'KFD 012D', make: 'Toyota Wish',     owner: 'Alice Auma',   status: 'Maintenance', client: '—',             days: 0 },
  { id: '5', reg: 'KGE 345E', make: 'Honda Fit',       owner: 'John Kamau',   status: 'Parked',      client: '—',             days: 0 },
  { id: '6', reg: 'KHF 678F', make: 'Toyota Premio',   owner: 'David Njeru',  status: 'Hired',       client: 'Samuel Waweru', days: 2 },
]

const demoBookings = [
  { id: 'BK-001', client: 'James Kariuki', vehicle: 'KCA 123A – Fielder',     from: '20 Jul', to: '25 Jul', rate: 2500, total: 12500, status: 'Active'   },
  { id: 'BK-002', client: 'Grace Muthoni', vehicle: 'KEC 789C – Nissan Note', from: '22 Jul', to: '26 Jul', rate: 2000, total: 8000,  status: 'Active'   },
  { id: 'BK-003', client: 'Samuel Waweru', vehicle: 'KHF 678F – Premio',      from: '23 Jul', to: '25 Jul', rate: 3000, total: 6000,  status: 'Active'   },
  { id: 'BK-004', client: 'Mary Wanjiru',  vehicle: 'KDB 456B – Axio',        from: '18 Jul', to: '21 Jul', rate: 2200, total: 6600,  status: 'Returned' },
]

const demoOwners = [
  { id: '1', name: 'John Kamau',   phone: '0711 111 111', vehicles: 2, gross: 45000, expenses: 3500, balance: 41500 },
  { id: '2', name: 'Jane Njoki',   phone: '0722 222 222', vehicles: 1, gross: 22000, expenses: 1800, balance: 20200 },
  { id: '3', name: 'Peter Mwangi', phone: '0733 333 333', vehicles: 1, gross: 18000, expenses: 1500, balance: 16500 },
  { id: '4', name: 'Alice Auma',   phone: '0744 444 444', vehicles: 1, gross: 0,     expenses: 0,    balance: 0     },
  { id: '5', name: 'David Njeru',  phone: '0755 555 555', vehicles: 1, gross: 12000, expenses: 1000, balance: 11000 },
]

const demoStaff = [
  { id: '1', name: 'Super Admin',      email: 'admin@doxacarhire.com',    role: 'Super Admin', status: 'Active' },
  { id: '2', name: 'Dispatch Officer', email: 'dispatch@doxacarhire.com', role: 'Dispatch',    status: 'Active' },
  { id: '3', name: 'Finance Officer',  email: 'finance@doxacarhire.com',  role: 'Finance',     status: 'Active' },
]

// ── Shared components ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'Active' || status === 'Hired'
      ? 'bg-green-100 text-green-700'
      : status === 'Suspended' || status === 'Maintenance'
        ? status === 'Suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        : status === 'Returned'
          ? 'bg-gray-100 text-gray-500'
          : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  )
}

function Btn({
  label, icon, onClick, variant = 'ghost',
}: { label: string; icon: string; onClick?: () => void; variant?: 'ghost' | 'primary' | 'danger' }) {
  const cls =
    variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700 border-transparent' :
    variant === 'danger'  ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' :
                            'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${cls}`}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {label}
    </button>
  )
}

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-semibold text-gray-800 text-[16px]">{title}</h2>
      {action}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>
}

function Th({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ go }: { go: (s: Section) => void }) {
  const kpis = [
    { label: 'Total Clients',   value: '5',       icon: 'people',                  bg: '#0C5CF0', to: 'clients'  as Section },
    { label: 'Fleet Size',      value: '6',       icon: 'directions_car',          bg: '#059669', to: 'vehicles' as Section },
    { label: 'Active Bookings', value: '3',       icon: 'assignment',              bg: '#043BA9', to: 'bookings' as Section },
    { label: 'Revenue (KES)',   value: '100,600', icon: 'account_balance_wallet',  bg: '#7C3AED', to: 'finance'  as Section },
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => go(k.to)}
            className="text-left rounded-xl p-4 text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: k.bg }}
          >
            <span className="material-symbols-outlined icon-fill opacity-70 text-[22px]">{k.icon}</span>
            <p className="mt-2 text-[26px] font-bold leading-none">{k.value}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider opacity-60">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Fleet Status</p>
          {[
            { label: 'Hired',       count: 3, total: 6, color: 'bg-green-500' },
            { label: 'Parked',      count: 2, total: 6, color: 'bg-gray-400' },
            { label: 'Maintenance', count: 1, total: 6, color: 'bg-amber-500' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 mb-3 last:mb-0">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${f.color}`} />
              <span className="text-[13px] text-gray-600 w-24">{f.label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${f.color}`} style={{ width: `${(f.count / f.total) * 100}%` }} />
              </div>
              <span className="text-[13px] font-semibold text-gray-700 w-4 text-right">{f.count}</span>
            </div>
          ))}
        </Card>

        <Card className="p-5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Booking',     icon: 'add_circle',      to: 'bookings'      as Section },
              { label: 'Register Client', icon: 'person_add',      to: 'clients'       as Section },
              { label: 'Add Vehicle',     icon: 'directions_car',  to: 'vehicles'      as Section },
              { label: 'Finance Report',  icon: 'bar_chart',       to: 'finance'       as Section },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => go(q.to)}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-blue-600 text-[18px]">{q.icon}</span>
                <span className="text-[12px] font-medium text-gray-700">{q.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Recent Bookings</p>
          <button onClick={() => go('bookings')} className="text-[12px] text-blue-600 hover:underline font-medium">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['ID', 'Client', 'Vehicle', 'Period', 'Total', 'Status']} />
            <tbody className="divide-y divide-gray-100">
              {demoBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-600 font-semibold">{b.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.client}</td>
                  <td className="px-4 py-3 text-gray-600">{b.vehicle}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.from} → {b.to}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">KES {b.total.toLocaleString()}</td>
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

// ── Clients ───────────────────────────────────────────────────────────────────

function Clients() {
  return (
    <div className="space-y-4">
      <SectionHead title="Client Management" action={<Btn label="Register Client" icon="person_add" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Name', 'Phone', 'Email', 'Trips', 'Status', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {demoClients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-600 text-center">{c.trips}</td>
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

// ── Vehicles ──────────────────────────────────────────────────────────────────

function Vehicles() {
  const summary = [
    { label: 'Hired',       count: 3, cls: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Parked',      count: 2, cls: 'bg-gray-50 border-gray-200 text-gray-600'   },
    { label: 'Maintenance', count: 1, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  ]
  return (
    <div className="space-y-4">
      <SectionHead title="Vehicle Management" action={<Btn label="Add Vehicle" icon="add" variant="primary" />} />
      <div className="grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
            <p className="text-[24px] font-bold">{s.count}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Reg No', 'Make / Model', 'Owner', 'Status', 'Current Client', 'Days Out', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {demoVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{v.reg}</td>
                  <td className="px-4 py-3 text-gray-700">{v.make}</td>
                  <td className="px-4 py-3 text-gray-600">{v.owner}</td>
                  <td className="px-4 py-3"><StatusPill status={v.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{v.client}</td>
                  <td className="px-4 py-3 text-gray-600">{v.days > 0 ? `${v.days}d` : '—'}</td>
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

// ── Bookings & Dispatch ───────────────────────────────────────────────────────

function Bookings() {
  return (
    <div className="space-y-4">
      <SectionHead title="Bookings & Dispatch" action={<Btn label="New Booking" icon="add_circle" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Booking ID', 'Client', 'Vehicle', 'From', 'To', 'Rate/Day', 'Total (KES)', 'Status', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {demoBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-600 font-semibold">{b.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.client}</td>
                  <td className="px-4 py-3 text-gray-600">{b.vehicle}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.from}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.to}</td>
                  <td className="px-4 py-3 text-gray-600">{b.rate.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{b.total.toLocaleString()}</td>
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
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
        <p className="text-[13px] text-amber-800 font-medium">
          Lateness penalties are calculated automatically at check-in — 20% surcharge per day overdue.
        </p>
      </div>
    </div>
  )
}

// ── Owners ────────────────────────────────────────────────────────────────────

function Owners() {
  return (
    <div className="space-y-4">
      <SectionHead title="Owner Management" action={<Btn label="Add Owner" icon="person_add" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Owner', 'Phone', 'Vehicles', 'Gross (KES)', 'Expenses (KES)', 'Net Balance (KES)', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {demoOwners.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{o.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.phone}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{o.vehicles}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{o.gross.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-600">{o.expenses.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{o.balance.toLocaleString()}</td>
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

// ── Finance & Reports ─────────────────────────────────────────────────────────

function Finance() {
  const income   = { bookings: 97100, penalties: 2500, other: 1000, total: 100600 }
  const expenses = { fuel: 5000, maintenance: 8500, commission: 4000, other: 2000, total: 19500 }
  const net      = income.total - expenses.total
  const margin   = Math.round((net / income.total) * 100)

  return (
    <div className="space-y-5">
      <SectionHead
        title="Finance & Reports"
        action={
          <div className="flex items-center gap-2">
            <Btn label="Export CSV"   icon="table_view" />
            <Btn label="Export Excel" icon="grid_on" variant="primary" />
          </div>
        }
      />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-green-600 text-[20px]">trending_up</span>
            <p className="font-semibold text-gray-700 text-[13px]">Total Income</p>
          </div>
          <p className="text-[28px] font-bold text-green-700">KES {income.total.toLocaleString()}</p>
          <div className="mt-3 space-y-1.5">
            {[['Bookings', income.bookings], ['Penalties', income.penalties], ['Other', income.other]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-[12px] text-gray-600">
                <span>{l}</span><span className="font-medium">KES {Number(v).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-red-500 text-[20px]">trending_down</span>
            <p className="font-semibold text-gray-700 text-[13px]">Total Expenses</p>
          </div>
          <p className="text-[28px] font-bold text-red-600">KES {expenses.total.toLocaleString()}</p>
          <div className="mt-3 space-y-1.5">
            {[['Fuel', expenses.fuel], ['Maintenance', expenses.maintenance], ['Commission', expenses.commission], ['Other', expenses.other]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-[12px] text-gray-600">
                <span>{l}</span><span className="font-medium">KES {Number(v).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="rounded-xl p-5 text-white shadow-sm" style={{ background: '#043BA9' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-white/70 text-[20px]">account_balance</span>
            <p className="font-semibold text-white/90 text-[13px]">Net Profit</p>
          </div>
          <p className="text-[28px] font-bold">KES {net.toLocaleString()}</p>
          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${margin}%` }} />
            </div>
            <p className="text-white/60 text-[11px] mt-1">{margin}% profit margin</p>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <p className="font-semibold text-gray-700 text-[13px] mb-4">Record Transaction</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Record Income',    icon: 'add_circle',    v: 'primary' as const },
            { label: 'Record Expense',   icon: 'remove_circle', v: 'danger'  as const },
            { label: 'P & L Report',     icon: 'bar_chart',     v: 'ghost'   as const },
            { label: 'Monthly Summary',  icon: 'calendar_month',v: 'ghost'   as const },
          ].map((a) => <Btn key={a.label} label={a.label} icon={a.icon} variant={a.v} />)}
        </div>
      </Card>
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function Notifications() {
  const types = [
    { title: 'Booking Confirmation', desc: 'Send confirmation to client when a booking is created.',          icon: 'confirmation_number', count: 3, bg: 'bg-blue-50 border-blue-200',   ic: 'text-blue-600',   btn: 'Send Confirmations' },
    { title: 'Return Reminder',      desc: 'Notify clients 24 h before their vehicle return deadline.',      icon: 'alarm',               count: 2, bg: 'bg-amber-50 border-amber-200', ic: 'text-amber-600',  btn: 'Send Reminders'     },
    { title: 'Owner Statement',      desc: 'Email earnings & expense statements to vehicle owners.',          icon: 'mail',                count: 5, bg: 'bg-purple-50 border-purple-200', ic: 'text-purple-600', btn: 'Send Statements'    },
    { title: 'Late Return Alert',    desc: 'Alert management when a vehicle is overdue for return.',          icon: 'warning',             count: 1, bg: 'bg-red-50 border-red-200',     ic: 'text-red-600',    btn: 'Send Alerts'        },
  ]
  const log = [
    { msg: 'Booking confirmation sent to James Kariuki',   time: 'Today 09:15',  icon: 'check_circle', cls: 'text-green-500' },
    { msg: 'Return reminder sent to Grace Muthoni',        time: 'Today 08:00',  icon: 'alarm',        cls: 'text-amber-500' },
    { msg: 'Owner statement sent to John Kamau',           time: 'Yesterday',    icon: 'mail',         cls: 'text-blue-500'  },
    { msg: 'Late return alert: KHF 678F overdue by 1 day', time: 'Yesterday',   icon: 'warning',      cls: 'text-red-500'   },
  ]
  return (
    <div className="space-y-5">
      <SectionHead title="Notifications" />
      <div className="grid sm:grid-cols-2 gap-4">
        {types.map((t) => (
          <div key={t.title} className={`rounded-xl border p-4 ${t.bg}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white shadow-sm shrink-0">
                <span className={`material-symbols-outlined icon-fill text-[22px] ${t.ic}`}>{t.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-[14px]">{t.title}</p>
                  <span className="text-[10px] font-bold bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-gray-500">{t.count}</span>
                </div>
                <p className="text-[12px] text-gray-600 mt-1">{t.desc}</p>
                <button className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-700 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  {t.btn}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Card className="p-5">
        <p className="font-semibold text-gray-700 text-[13px] mb-3">Recent Notifications</p>
        <div className="space-y-0">
          {log.map((n, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className={`material-symbols-outlined icon-fill text-[16px] ${n.cls}`}>{n.icon}</span>
              <p className="flex-1 text-[13px] text-gray-700">{n.msg}</p>
              <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">{n.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Staff ─────────────────────────────────────────────────────────────────────

function Staff() {
  const rolePerms = [
    { role: 'Super Admin', perms: ['All permissions', 'Manage staff', 'System settings'] },
    { role: 'Manager',     perms: ['View all modules', 'Approve bookings', 'Reports'] },
    { role: 'Dispatch',    perms: ['Manage bookings', 'Dispatch & check-in'] },
    { role: 'Finance',     perms: ['View finance', 'Record transactions', 'Export'] },
    { role: 'Viewer',      perms: ['Read-only access', 'View reports only'] },
  ]
  return (
    <div className="space-y-4">
      <SectionHead title="Staff Management" action={<Btn label="Add Staff" icon="person_add" variant="primary" />} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <Th cols={['Name', 'Email', 'Role', 'Status', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {demoStaff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">{s.role}</span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Btn label="Edit" icon="edit" />
                      <Btn label="Permissions" icon="admin_panel_settings" />
                      {s.id !== '1' && <Btn label="Remove" icon="person_remove" variant="danger" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <p className="font-semibold text-gray-700 text-[13px] mb-4">Roles & Permissions</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rolePerms.map((r) => (
            <div key={r.role} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
              <p className="font-semibold text-gray-800 text-[13px] mb-2">{r.role}</p>
              <ul className="space-y-1">
                {r.perms.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                    <span className="material-symbols-outlined text-green-500 text-[13px]">check</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('dashboard')
  const [open, setOpen] = useState(false)

  const go = (s: Section) => { setSection(s); setOpen(false) }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#1D2235' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
          <img src={ADMIN_SIDEBAR_LOGO} alt="Doxa" className="h-8 w-8 object-contain rounded" />
          <div>
            <p className="text-white font-bold text-[13px] leading-none">Doxa Car Hire</p>
            <p className="text-white/40 text-[10px] mt-0.5">Management System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${
                section === item.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ background: '#0C5CF0' }}
            >
              SA
            </div>
            <div className="min-w-0">
              <p className="text-white text-[12px] font-semibold truncate">Super Admin</p>
              <p className="text-white/40 text-[10px] truncate">admin@doxacarhire.com</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/login')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/8 text-[12px] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
          <button className="lg:hidden text-gray-500 hover:text-gray-800" onClick={() => setOpen(true)}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-semibold text-gray-800 text-[15px]">
            {NAV.find((n) => n.id === section)?.label ?? 'Dashboard'}
          </h1>
          <div className="ml-auto">
            <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 font-semibold">
              Demo Mode
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {section === 'dashboard'     && <Dashboard go={go} />}
          {section === 'clients'       && <Clients />}
          {section === 'vehicles'      && <Vehicles />}
          {section === 'bookings'      && <Bookings />}
          {section === 'owners'        && <Owners />}
          {section === 'finance'       && <Finance />}
          {section === 'notifications' && <Notifications />}
          {section === 'staff'         && <Staff />}
        </main>
      </div>
    </div>
  )
}
