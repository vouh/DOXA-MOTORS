'use client'

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

export { KPI_CHART_COLORS } from '@/components/admin/charts/colors'

let registered = false

export function ensureChartJs() {
  if (registered) return
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    LineElement,
    PointElement,
    Filler,
    Tooltip,
    Legend,
  )
  registered = true
}
