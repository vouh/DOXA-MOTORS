import { describe, expect, it } from 'vitest'
import {
  applyDeleteRisk,
  BULK_DELETE_ALERT_AT,
  CONSECUTIVE_DELETE_ALERT_AT,
  resetDeleteStreak,
  SCORE_BULK,
  SCORE_CONSECUTIVE,
} from '@/lib/security/suspicious-deletes'

const blank = {
  suspiciousScore: 0,
  consecutiveDeletes: 0,
  consecutiveDeleteAlerted: false,
  lastDeleteAt: null as Date | null,
}

describe('applyDeleteRisk', () => {
  it('alerts when consecutive deletes exceed 5', () => {
    let state = blank
    for (let i = 0; i < CONSECUTIVE_DELETE_ALERT_AT; i++) {
      const r = applyDeleteRisk(state, { mode: 'single', count: 1 })
      state = r.next
      expect(r.alerts).toHaveLength(0)
    }
    const trip = applyDeleteRisk(state, { mode: 'single', count: 1 })
    expect(trip.alerts.some((a) => a.reason === 'consecutive_deletes')).toBe(true)
    expect(trip.next.suspiciousScore).toBe(SCORE_CONSECUTIVE)
    expect(trip.next.consecutiveDeleteAlerted).toBe(true)

    const again = applyDeleteRisk(trip.next, { mode: 'single', count: 1 })
    expect(again.alerts).toHaveLength(0)
  })

  it('alerts when bulk delete exceeds 10', () => {
    const r = applyDeleteRisk(blank, {
      mode: 'bulk',
      count: BULK_DELETE_ALERT_AT + 1,
    })
    expect(r.alerts.some((a) => a.reason === 'bulk_delete')).toBe(true)
    expect(r.next.suspiciousScore).toBeGreaterThanOrEqual(SCORE_BULK)
  })

  it('does not bulk-alert at exactly 10', () => {
    const r = applyDeleteRisk(blank, { mode: 'bulk', count: BULK_DELETE_ALERT_AT })
    expect(r.alerts.some((a) => a.reason === 'bulk_delete')).toBe(false)
  })

  it('resets streak after idle window', () => {
    const old = new Date(Date.now() - 31 * 60 * 1000)
    const r = applyDeleteRisk(
      { ...blank, consecutiveDeletes: 4, lastDeleteAt: old },
      { mode: 'single', count: 1 },
    )
    expect(r.next.consecutiveDeletes).toBe(1)
    expect(r.alerts).toHaveLength(0)
  })

  it('resetDeleteStreak clears consecutive counters', () => {
    const next = resetDeleteStreak({
      suspiciousScore: 40,
      consecutiveDeletes: 9,
      consecutiveDeleteAlerted: true,
      lastDeleteAt: new Date(),
    })
    expect(next.consecutiveDeletes).toBe(0)
    expect(next.consecutiveDeleteAlerted).toBe(false)
    expect(next.suspiciousScore).toBe(40)
  })
})
