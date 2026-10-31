import { describe, expect, it } from 'vitest'
import { resolvePeriod, ymd } from '@/lib/calendar/period'

describe('resolvePeriod', () => {
  const now = new Date(2026, 7, 21, 15, 30, 0) // 21 Aug 2026

  it('defaults to this month', () => {
    const p = resolvePeriod({ now })
    expect(p.preset).toBe('this_month')
    expect(ymd(p.start)).toBe('2026-08-01')
    expect(ymd(p.end)).toBe('2026-08-21')
  })

  it('resolves last 6 days inclusive of today', () => {
    const p = resolvePeriod({ period: 'last_6d', now })
    expect(ymd(p.start)).toBe('2026-08-16')
    expect(ymd(p.end)).toBe('2026-08-21')
  })

  it('resolves last 24 hours as a sliding window', () => {
    const p = resolvePeriod({ period: 'last_24h', now })
    expect(p.end.getTime()).toBe(now.getTime())
    expect(p.start.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000)
  })

  it('resolves custom from/to', () => {
    const p = resolvePeriod({
      period: 'custom',
      from: '2026-01-10',
      to: '2026-01-15',
      now,
    })
    expect(p.fromYmd).toBe('2026-01-10')
    expect(p.toYmd).toBe('2026-01-15')
    expect(p.end.getHours()).toBe(23)
  })

  it('resolves last calendar month', () => {
    const p = resolvePeriod({ period: 'last_month', now })
    expect(ymd(p.start)).toBe('2026-07-01')
    expect(ymd(p.end)).toBe('2026-07-31')
  })
})
