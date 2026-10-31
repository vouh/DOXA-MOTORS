export type FinanceVehicleLine = {
  vehicleId: string
  regNumber: string
  make: string
  model: string
  billed: number
  collected: number
  expenses: number
}

export type OwnerFinanceSummary = {
  ownerId: string
  ownerName: string
  commissionLabel: string
  billed: number
  collected: number
  expenses: number
  commission: number
  deductions: number
  net: number
  vehicles: FinanceVehicleLine[]
}

/** Lifetime paid-hire split for owners list / eye modal. */
export type OwnerEarningsShare = {
  ownerId: string
  /** Sum of COMPLETED payments on bookings for this owner's cars. */
  totalEarned: number
  /** Doxa / management cut from commission settings. */
  doxaShare: number
  /** Owner's rightful share of hire money (before vehicle expenses / deductions). */
  ownerShare: number
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  commissionLabel: string
}

export type VehicleExpenseRow = {
  id: string
  description: string
  category: string
  amount: number
  incurredAt: string
}

export type VehicleFinanceSummary = {
  vehicleId: string
  regNumber: string
  ownerId: string
  ownerName: string
  billed: number
  collected: number
  expenses: number
  expenseRows: VehicleExpenseRow[]
}

export type OwnerPayoutStatement = {
  id: string
  periodStart: string
  periodEnd: string
  grossEarnings: number
  commission: number
  totalExpenses: number
  deductions: number
  netPay: number
  status: string
  paymentRef: string | null
}
