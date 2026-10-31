import { softQuery } from '@/lib/errors'
import { getSessionProfile } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { resolvePeriod } from '@/lib/calendar/period'
import {
  fleetFinanceSeries,
  fleetFinanceTotals,
  listFinancePayments,
  listFleetVehicleFinance,
} from '@/lib/intelligence/fleet-finance'
import { PageShell } from '@/components/admin/ui'
import ServiceAlert from '@/components/admin/ServiceAlert'
import FinanceChrome from '@/components/admin/FinanceChrome'
import FinanceWorkspace, { type FinanceViewMode } from '@/components/admin/FinanceWorkspace'

export const dynamic = 'force-dynamic'

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string
    from?: string
    to?: string
    view?: string
  }>
}) {
  const params = await searchParams
  const period = resolvePeriod({
    period: params.period,
    from: params.from,
    to: params.to,
  })
  const view: FinanceViewMode = params.view === 'vehicles' ? 'vehicles' : 'payments'

  const profile = await getSessionProfile()
  const canExpense = profile
    ? profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.EXPENSE_RECORD))
    : false

  const loaded = await softQuery(() =>
    Promise.all([
      fleetFinanceTotals(period.start, period.end),
      fleetFinanceSeries(period.start, period.end),
      listFinancePayments(period.start, period.end, 'COMPLETED'),
      listFleetVehicleFinance(period.start, period.end),
    ]),
  )

  const [totals, series, payments, vehicles] = loaded.data ?? [
    { collected: 0, expenses: 0, net: 0, pendingBalance: 0, paymentCount: 0 },
    [],
    [],
    [],
  ]

  const kpiItems = [
    {
      id: 'collected',
      label: 'Collected',
      value: `KES ${totals.collected.toLocaleString()}`,
      numericValue: totals.collected,
      icon: 'payments',
      kind: 'money' as const,
    },
    {
      id: 'expenses',
      label: 'Fleet expenses',
      value: `KES ${totals.expenses.toLocaleString()}`,
      numericValue: totals.expenses,
      icon: 'receipt_long',
      kind: 'money' as const,
    },
    {
      id: 'net',
      label: 'Profit',
      value: `KES ${totals.net.toLocaleString()}`,
      numericValue: totals.net,
      icon: 'account_balance',
      kind: 'money' as const,
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: `KES ${totals.pendingBalance.toLocaleString()}`,
      numericValue: totals.pendingBalance,
      icon: 'money_off',
      kind: 'money' as const,
    },
  ]

  return (
    <PageShell>
      <FinanceChrome
        period={period.preset}
        fromYmd={period.fromYmd}
        toYmd={period.toYmd}
        label={period.label}
        view={view}
        kpiItems={kpiItems}
        totals={totals}
        series={series}
      />

      {loaded.error ? <ServiceAlert message={loaded.error} /> : null}

      <FinanceWorkspace
        view={view}
        payments={payments}
        vehicles={vehicles}
        canExpense={canExpense}
      />
    </PageShell>
  )
}
