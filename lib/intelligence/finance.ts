import { ownerSettlement, roundMoney } from '@/lib/car-hire/calculations'
import { prisma } from '@/lib/prisma'
import type {
  FinanceVehicleLine,
  OwnerEarningsShare,
  OwnerFinanceSummary,
  OwnerPayoutStatement,
  VehicleExpenseRow,
  VehicleFinanceSummary,
} from '@/lib/intelligence/finance-types'

export type {
  FinanceVehicleLine,
  OwnerEarningsShare,
  OwnerFinanceSummary,
  OwnerPayoutStatement,
  VehicleExpenseRow,
  VehicleFinanceSummary,
} from '@/lib/intelligence/finance-types'

export function monthBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDay(value: string, endOfDay = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    const fallback = new Date(value)
    if (endOfDay && !Number.isNaN(fallback.getTime())) fallback.setHours(23, 59, 59, 999)
    return fallback
  }
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (endOfDay) day.setHours(23, 59, 59, 999)
  return day
}

function commissionLabel(type: 'PERCENTAGE' | 'FIXED', value: number) {
  return type === 'PERCENTAGE'
    ? `${value}% Doxa`
    : `KES ${value.toLocaleString()} Doxa fixed`
}

/**
 * Split paid hire revenue using the owner's Doxa share settings.
 * Owner share = total − Doxa share (expenses handled separately in payouts).
 */
export function splitOwnerEarnings(input: {
  totalEarned: number
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
}): { doxaShare: number; ownerShare: number } {
  const total = roundMoney(Math.max(0, input.totalEarned))
  const doxaShare = roundMoney(
    input.commissionType === 'PERCENTAGE'
      ? (total * Math.max(0, input.commissionValue)) / 100
      : Math.min(total, Math.max(0, input.commissionValue)),
  )
  return {
    doxaShare,
    ownerShare: roundMoney(Math.max(0, total - doxaShare)),
  }
}

/** Roll vehicle hire + cost lines into an owner settlement. */
export function rollUpOwnerFinance(input: {
  vehicles: Array<{ billed: number; collected: number; expenses: number }>
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  recurringDeduction: number
}) {
  const billed = roundMoney(input.vehicles.reduce((sum, v) => sum + v.billed, 0))
  const collected = roundMoney(input.vehicles.reduce((sum, v) => sum + v.collected, 0))
  const expenses = roundMoney(input.vehicles.reduce((sum, v) => sum + v.expenses, 0))
  const figures = ownerSettlement({
    bookingRevenue: [collected],
    expenseAmounts: [expenses],
    commissionType: input.commissionType,
    commissionValue: input.commissionValue,
    recurringDeduction: input.recurringDeduction,
  })
  return { billed, collected, expenses, ...figures }
}

function lineFromVehicle(vehicle: {
  id: string
  regNumber: string
  make: string
  model: string
  bookings: Array<{ totalCharge: number; payments: Array<{ amount: number }> }>
  expenses: Array<{ amount: number }>
}): FinanceVehicleLine {
  return {
    vehicleId: vehicle.id,
    regNumber: vehicle.regNumber,
    make: vehicle.make,
    model: vehicle.model,
    billed: roundMoney(vehicle.bookings.reduce((sum, b) => sum + b.totalCharge, 0)),
    collected: roundMoney(
      vehicle.bookings.reduce(
        (sum, b) => sum + b.payments.reduce((p, pay) => p + pay.amount, 0),
        0,
      ),
    ),
    expenses: roundMoney(vehicle.expenses.reduce((sum, e) => sum + e.amount, 0)),
  }
}

/**
 * Lifetime earnings per owner: COMPLETED payments on bookings for their cars,
 * then split into Doxa share vs owner share from commission settings.
 */
export async function loadOwnersEarningsMap(
  ownerIds?: string[],
): Promise<Map<string, OwnerEarningsShare>> {
  const owners = await prisma.carOwner.findMany({
    where: ownerIds?.length ? { id: { in: ownerIds } } : undefined,
    select: {
      id: true,
      commissionType: true,
      commissionValue: true,
      vehicles: {
        select: {
          bookings: {
            select: {
              payments: {
                where: { status: 'COMPLETED' },
                select: { amount: true },
              },
            },
          },
        },
      },
    },
  })

  const map = new Map<string, OwnerEarningsShare>()
  for (const owner of owners) {
    const totalEarned = roundMoney(
      owner.vehicles.reduce(
        (sum, v) =>
          sum +
          v.bookings.reduce(
            (bSum, b) => bSum + b.payments.reduce((pSum, p) => pSum + p.amount, 0),
            0,
          ),
        0,
      ),
    )
    const split = splitOwnerEarnings({
      totalEarned,
      commissionType: owner.commissionType,
      commissionValue: owner.commissionValue,
    })
    map.set(owner.id, {
      ownerId: owner.id,
      totalEarned,
      doxaShare: split.doxaShare,
      ownerShare: split.ownerShare,
      commissionType: owner.commissionType,
      commissionValue: owner.commissionValue,
      commissionLabel: commissionLabel(owner.commissionType, owner.commissionValue),
    })
  }
  return map
}

/** Owner payout figures from each linked vehicle's returned hires + recorded costs. */
export async function summarizeOwnerFinance(
  ownerId: string,
  start: Date,
  end: Date,
): Promise<OwnerFinanceSummary> {
  const owner = await prisma.carOwner.findUniqueOrThrow({
    where: { id: ownerId },
    include: {
      vehicles: {
        orderBy: { regNumber: 'asc' },
        include: {
          bookings: {
            where: { status: 'RETURNED', returnedAt: { gte: start, lte: end } },
            select: {
              totalCharge: true,
              payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
            },
          },
          expenses: {
            where: { incurredAt: { gte: start, lte: end } },
            select: { amount: true },
          },
        },
      },
    },
  })

  const vehicles = owner.vehicles.map(lineFromVehicle)
  const rolled = rollUpOwnerFinance({
    vehicles,
    commissionType: owner.commissionType,
    commissionValue: owner.commissionValue,
    recurringDeduction: owner.recurringDeduction,
  })

  return {
    ownerId: owner.id,
    ownerName: owner.fullName,
    commissionLabel: commissionLabel(owner.commissionType, owner.commissionValue),
    billed: rolled.billed,
    collected: rolled.collected,
    expenses: rolled.expenses,
    commission: rolled.commission,
    deductions: rolled.deductions,
    net: rolled.netPay,
    vehicles,
  }
}

export async function listOwnerStatements(ownerId: string): Promise<OwnerPayoutStatement[]> {
  const rows = await prisma.ownerPayout.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    take: 12,
  })
  return rows.map((p) => ({
    id: p.id,
    periodStart: ymd(p.periodStart),
    periodEnd: ymd(p.periodEnd),
    grossEarnings: p.grossEarnings,
    commission: p.commission,
    totalExpenses: p.totalExpenses,
    deductions: p.deductions,
    netPay: p.netPay,
    status: p.status,
    paymentRef: p.paymentRef,
  }))
}

/** Costs and hire money for one vehicle in the period. */
export async function summarizeVehicleFinance(
  vehicleId: string,
  start: Date,
  end: Date,
): Promise<VehicleFinanceSummary> {
  const vehicle = await prisma.carVehicle.findUniqueOrThrow({
    where: { id: vehicleId },
    include: {
      owner: { select: { id: true, fullName: true } },
      bookings: {
        where: { status: 'RETURNED', returnedAt: { gte: start, lte: end } },
        select: {
          totalCharge: true,
          payments: { where: { status: 'COMPLETED' }, select: { amount: true } },
        },
      },
      expenses: {
        where: { incurredAt: { gte: start, lte: end } },
        orderBy: { incurredAt: 'desc' },
        take: 30,
      },
    },
  })
  const line = lineFromVehicle(vehicle)
  return {
    vehicleId: vehicle.id,
    regNumber: vehicle.regNumber,
    ownerId: vehicle.owner.id,
    ownerName: vehicle.owner.fullName,
    billed: line.billed,
    collected: line.collected,
    expenses: line.expenses,
    expenseRows: vehicle.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amount: e.amount,
      incurredAt: ymd(e.incurredAt),
    })),
  }
}
