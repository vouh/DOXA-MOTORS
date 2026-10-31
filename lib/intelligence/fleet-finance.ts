import { roundMoney } from '@/lib/car-hire/calculations'
import { prisma } from '@/lib/prisma'
import { ymd } from '@/lib/calendar/period'

export type FleetVehicleFinanceCard = {
  vehicleId: string
  regNumber: string
  label: string
  ownerName: string
  /** COMPLETED payments in period linked to this vehicle's bookings */
  collected: number
  /** Expenses incurred in period */
  expenses: number
  /** Hire billed on bookings that received payment in period (or returned in period) */
  billed: number
  /** Outstanding on non-cancelled bookings for this vehicle (all open debt) */
  pendingBalance: number
  /** collected − expenses */
  profit: number
  paymentCount: number
  expenseCount: number
  expenseRows: Array<{
    id: string
    description: string
    category: string
    amount: number
    /** YYYY-MM-DD */
    incurredAt: string
  }>
}

export type FinancePaymentRow = {
  id: string
  amount: number
  method: string
  status: string
  mpesaRef: string | null
  phone: string | null
  notes: string | null
  paidAt: string | null
  createdAt: string
  bookingId: string | null
  bookingRef: string | null
  clientName: string | null
  vehicleId: string | null
  vehicleLabel: string | null
}

/** Fleet-wide vehicle cards for the finance page period. */
export async function listFleetVehicleFinance(
  start: Date,
  end: Date,
): Promise<FleetVehicleFinanceCard[]> {
  const vehicles = await prisma.carVehicle.findMany({
    include: {
      owner: { select: { fullName: true } },
      expenses: {
        where: { incurredAt: { gte: start, lte: end } },
        orderBy: { incurredAt: 'desc' },
        select: {
          id: true,
          description: true,
          category: true,
          amount: true,
          incurredAt: true,
        },
      },
      bookings: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          totalCharge: true,
          status: true,
          returnedAt: true,
          payments: {
            where: { status: 'COMPLETED' },
            select: { amount: true, paidAt: true },
          },
        },
      },
    },
    orderBy: { regNumber: 'asc' },
  })

  return vehicles.map((vehicle) => {
    let collected = 0
    let paymentCount = 0
    let billedTouched = 0
    let pendingBalance = 0

    for (const booking of vehicle.bookings) {
      const paidAll = booking.payments.reduce((s, p) => s + p.amount, 0)
      pendingBalance += Math.max(0, booking.totalCharge - paidAll)

      const periodPayments = booking.payments.filter(
        (p) => p.paidAt && p.paidAt >= start && p.paidAt <= end,
      )
      const periodPaid = periodPayments.reduce((s, p) => s + p.amount, 0)
      collected += periodPaid
      paymentCount += periodPayments.length

      const returnedInPeriod =
        booking.returnedAt != null && booking.returnedAt >= start && booking.returnedAt <= end
      if (periodPaid > 0 || returnedInPeriod) {
        billedTouched += booking.totalCharge
      }
    }

    const expenses = vehicle.expenses.reduce((s, e) => s + e.amount, 0)
    collected = roundMoney(collected)
    const expenseTotal = roundMoney(expenses)

    return {
      vehicleId: vehicle.id,
      regNumber: vehicle.regNumber,
      label: `${vehicle.make} ${vehicle.model}`,
      ownerName: vehicle.owner.fullName,
      collected,
      expenses: expenseTotal,
      billed: roundMoney(billedTouched),
      pendingBalance: roundMoney(pendingBalance),
      profit: roundMoney(collected - expenseTotal),
      paymentCount,
      expenseCount: vehicle.expenses.length,
      expenseRows: vehicle.expenses.map((e) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amount: e.amount,
        incurredAt: ymd(e.incurredAt),
      })),
    }
  })
}

/** COMPLETED payments in period (plus optional FAILED for side panel). */
export async function listFinancePayments(
  start: Date,
  end: Date,
  status: 'COMPLETED' | 'FAILED' | 'ALL' = 'COMPLETED',
): Promise<FinancePaymentRow[]> {
  const where =
    status === 'ALL'
      ? {
          OR: [
            { status: 'COMPLETED' as const, paidAt: { gte: start, lte: end } },
            { status: 'FAILED' as const, createdAt: { gte: start, lte: end } },
          ],
        }
      : status === 'FAILED'
        ? { status: 'FAILED' as const, createdAt: { gte: start, lte: end } }
        : { status: 'COMPLETED' as const, paidAt: { gte: start, lte: end } }

  const rows = await prisma.carPayment.findMany({
    where,
    include: {
      booking: {
        include: {
          client: { select: { fullName: true } },
          vehicle: { select: { id: true, regNumber: true, make: true, model: true } },
        },
      },
    },
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  })

  return rows.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    status: p.status,
    mpesaRef: p.mpesaRef,
    phone: p.phone,
    notes: p.notes,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    bookingId: p.bookingId,
    bookingRef: p.booking?.reference ?? null,
    clientName: p.booking?.client.fullName ?? null,
    vehicleId: p.booking?.vehicle.id ?? null,
    vehicleLabel: p.booking
      ? `${p.booking.vehicle.regNumber} · ${p.booking.vehicle.make} ${p.booking.vehicle.model}`
      : null,
  }))
}

export type FleetFinanceTotals = {
  collected: number
  expenses: number
  net: number
  pendingBalance: number
  paymentCount: number
}

export type FinanceSeriesPoint = {
  /** Bucket label for the chart x-axis (time within the selected period). */
  label: string
  collected: number
  expenses: number
  net: number
}

function bucketKey(d: Date, mode: 'hour' | 'day' | 'week') {
  if (mode === 'hour') {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
  }
  if (mode === 'week') {
    const start = new Date(d)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay())
    return `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
  }
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function bucketLabel(d: Date, mode: 'hour' | 'day' | 'week') {
  if (mode === 'hour') {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })
  }
  if (mode === 'week') {
    return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Time-bucketed collected / expenses / net for the selected period (drives line & bar charts). */
export async function fleetFinanceSeries(
  start: Date,
  end: Date,
): Promise<FinanceSeriesPoint[]> {
  const spanMs = Math.max(0, end.getTime() - start.getTime())
  const mode: 'hour' | 'day' | 'week' =
    spanMs <= 48 * 60 * 60 * 1000 ? 'hour' : spanMs <= 45 * 86_400_000 ? 'day' : 'week'

  const [payments, expenses] = await Promise.all([
    prisma.carPayment.findMany({
      where: { status: 'COMPLETED', paidAt: { gte: start, lte: end } },
      select: { amount: true, paidAt: true },
    }),
    prisma.carExpense.findMany({
      where: { incurredAt: { gte: start, lte: end } },
      select: { amount: true, incurredAt: true },
    }),
  ])

  const map = new Map<string, { at: Date; collected: number; expenses: number }>()

  function ensure(at: Date) {
    const key = bucketKey(at, mode)
    let row = map.get(key)
    if (!row) {
      const bucketStart = new Date(at)
      if (mode === 'hour') bucketStart.setMinutes(0, 0, 0)
      else if (mode === 'week') {
        bucketStart.setHours(0, 0, 0, 0)
        bucketStart.setDate(bucketStart.getDate() - bucketStart.getDay())
      } else bucketStart.setHours(0, 0, 0, 0)
      row = { at: bucketStart, collected: 0, expenses: 0 }
      map.set(key, row)
    }
    return row
  }

  for (const p of payments) {
    if (!p.paidAt) continue
    ensure(p.paidAt).collected += p.amount
  }
  for (const e of expenses) {
    ensure(e.incurredAt).expenses += e.amount
  }

  // Fill empty buckets so the time axis is continuous
  const cursor = new Date(start)
  if (mode === 'hour') cursor.setMinutes(0, 0, 0)
  else if (mode === 'week') {
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() - cursor.getDay())
  } else cursor.setHours(0, 0, 0, 0)

  const step =
    mode === 'hour' ? 60 * 60 * 1000 : mode === 'week' ? 7 * 86_400_000 : 86_400_000
  while (cursor.getTime() <= end.getTime()) {
    ensure(cursor)
    cursor.setTime(cursor.getTime() + step)
  }

  return [...map.values()]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((row) => ({
      label: bucketLabel(row.at, mode),
      collected: roundMoney(row.collected),
      expenses: roundMoney(row.expenses),
      net: roundMoney(row.collected - row.expenses),
    }))
}

export async function fleetFinanceTotals(start: Date, end: Date): Promise<FleetFinanceTotals> {
  const [payments, expenses, bookings] = await Promise.all([
    prisma.carPayment.findMany({
      where: { status: 'COMPLETED', paidAt: { gte: start, lte: end } },
      select: { amount: true },
    }),
    prisma.carExpense.findMany({
      where: { incurredAt: { gte: start, lte: end } },
      select: { amount: true },
    }),
    prisma.carBooking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        totalCharge: true,
        payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
      },
    }),
  ])

  const collected = roundMoney(payments.reduce((s, p) => s + p.amount, 0))
  const expenseTotal = roundMoney(expenses.reduce((s, e) => s + e.amount, 0))
  const pendingBalance = roundMoney(
    bookings.reduce(
      (s, b) => s + Math.max(0, b.totalCharge - b.payments.reduce((p, x) => p + x.amount, 0)),
      0,
    ),
  )

  return {
    collected,
    expenses: expenseTotal,
    net: roundMoney(collected - expenseTotal),
    pendingBalance,
    paymentCount: payments.length,
  }
}

export { ymd }
