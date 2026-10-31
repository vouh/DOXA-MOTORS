export const KPI_CHART_COLORS = [
  '#0C5CF0',
  '#043BA9',
  '#E90809',
  '#3B8BFF',
  '#8C929D',
  '#1D2235',
  '#C50000',
  '#6B7A99',
]

/** Fleet status doughnut / legend — each status its own colour (theme blue + red + distinct accents). */
export const FLEET_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#0C5CF0', // brand blue — ready to hire
  RESERVED: '#D97706', // amber — booked, not yet out
  HIRED: '#E90809', // brand red — on the road
  MAINTENANCE: '#7C3AED', // violet — in workshop
}

/** Shared money colours for Finance pie + line/bar (same meaning on every chart). */
export const FINANCE_MONEY_COLORS = {
  collected: '#0C5CF0',
  collectedFill: 'rgba(12, 92, 240, 0.75)',
  collectedSoft: 'rgba(12, 92, 240, 0.15)',
  /** Fleet costs — amber so red stays reserved for unpaid balances */
  expenses: '#D97706',
  expensesFill: 'rgba(217, 119, 6, 0.75)',
  expensesSoft: 'rgba(217, 119, 6, 0.15)',
  /** Net profit (collected − expenses) */
  profit: '#16a34a',
  profitFill: 'rgba(22, 163, 74, 0.7)',
  profitSoft: 'rgba(22, 163, 74, 0.12)',
  /** Unpaid hire balances from bookings */
  outstanding: '#E90809',
  outstandingFill: 'rgba(233, 8, 9, 0.75)',
  outstandingSoft: 'rgba(233, 8, 9, 0.12)',
  /** Negative net (period loss) — dark navy, not a second red */
  loss: '#043BA9',
} as const
