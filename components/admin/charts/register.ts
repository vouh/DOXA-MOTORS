'use client'

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

let registered = false

export function ensureChartJs() {
  if (registered) return
  ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
  registered = true
}

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
