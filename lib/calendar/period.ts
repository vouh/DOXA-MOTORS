/**
 * Calendar / period helpers for admin finance and reports.
 * Presets resolve to inclusive [start, end] in local time.
 */

export type PeriodPreset =
  | 'last_24h'
  | 'last_6d'
  | 'last_7d'
  | 'last_30d'
  | 'this_month'
  | 'last_month'
  | 'today'
  | 'custom'

export type ResolvedPeriod = {
  preset: PeriodPreset
  start: Date
  end: Date
  label: string
  fromYmd: string
  toYmd: string
}

export const PERIOD_PRESETS: Array<{
  id: PeriodPreset
  label: string
  hint?: string
}> = [
  { id: 'today', label: 'Today' },
  { id: 'last_24h', label: 'Last 24 hours' },
  { id: 'last_6d', label: 'Last 6 days' },
  { id: 'last_7d', label: 'Last 7 days', hint: '1 week' },
  { id: 'last_30d', label: 'Last 30 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'custom', label: 'Custom dates' },
]

export function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(value: string, endOfDay = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(day.getTime())) return null
  if (endOfDay) day.setHours(23, 59, 59, 999)
  else day.setHours(0, 0, 0, 0)
  return day
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function daysAgoStart(n: number, now = new Date()) {
  const d = startOfDay(now)
  d.setDate(d.getDate() - (n - 1))
  return d
}

export function isPeriodPreset(value: string | undefined | null): value is PeriodPreset {
  return PERIOD_PRESETS.some((p) => p.id === value)
}

/** Resolve a preset (+ optional custom from/to) into inclusive bounds. */
export function resolvePeriod(input: {
  period?: string | null
  from?: string | null
  to?: string | null
  now?: Date
}): ResolvedPeriod {
  const now = input.now ?? new Date()
  const raw = String(input.period || 'this_month').trim()
  const preset: PeriodPreset = isPeriodPreset(raw) ? raw : 'this_month'

  if (preset === 'custom') {
    const start = parseYmd(input.from || '', false) ?? startOfDay(now)
    let end = parseYmd(input.to || '', true) ?? endOfDay(now)
    if (end < start) end = endOfDay(start)
    return {
      preset,
      start,
      end,
      label: `${ymd(start)} → ${ymd(end)}`,
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  if (preset === 'last_24h') {
    const end = new Date(now)
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return {
      preset,
      start,
      end,
      label: 'Last 24 hours',
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  if (preset === 'today') {
    const start = startOfDay(now)
    const end = endOfDay(now)
    return {
      preset,
      start,
      end,
      label: 'Today',
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  if (preset === 'last_6d') {
    const start = daysAgoStart(6, now)
    const end = endOfDay(now)
    return {
      preset,
      start,
      end,
      label: 'Last 6 days',
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  if (preset === 'last_7d') {
    const start = daysAgoStart(7, now)
    const end = endOfDay(now)
    return {
      preset,
      start,
      end,
      label: 'Last 7 days',
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  if (preset === 'last_30d') {
    const start = daysAgoStart(30, now)
    const end = endOfDay(now)
    return {
      preset,
      start,
      end,
      label: 'Last 30 days',
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    end.setHours(23, 59, 59, 999)
    return {
      preset,
      start,
      end,
      label: start.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
      fromYmd: ymd(start),
      toYmd: ymd(end),
    }
  }

  // this_month (default)
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = endOfDay(now)
  return {
    preset: 'this_month',
    start,
    end,
    label: start.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    fromYmd: ymd(start),
    toYmd: ymd(end),
  }
}

export function periodQueryString(period: ResolvedPeriod, extra?: Record<string, string>) {
  const params = new URLSearchParams()
  params.set('period', period.preset)
  if (period.preset === 'custom') {
    params.set('from', period.fromYmd)
    params.set('to', period.toYmd)
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v)
    }
  }
  return params.toString()
}
