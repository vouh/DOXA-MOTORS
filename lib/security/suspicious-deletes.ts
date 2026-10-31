/**
 * Pure rules for delete risk scoring (easy to unit-test).
 * - Consecutive deletes > 5 → raise score + alert once per streak
 * - Bulk delete count > 10 → raise score + alert every time
 */

export const CONSECUTIVE_DELETE_ALERT_AT = 5
export const BULK_DELETE_ALERT_AT = 10

export const SCORE_CONSECUTIVE = 15
export const SCORE_BULK = 25

const STREAK_IDLE_MS = 30 * 60 * 1000

export type DeleteRiskState = {
  suspiciousScore: number
  consecutiveDeletes: number
  consecutiveDeleteAlerted: boolean
  lastDeleteAt: Date | null
}

export type DeleteRiskEvent = {
  mode: 'single' | 'bulk'
  count: number
  now?: Date
}

export type DeleteRiskResult = {
  next: DeleteRiskState
  alerts: Array<{
    reason: 'consecutive_deletes' | 'bulk_delete'
    detail: string
    scoreDelta: number
  }>
}

export function applyDeleteRisk(state: DeleteRiskState, event: DeleteRiskEvent): DeleteRiskResult {
  const now = event.now ?? new Date()
  const count = Math.max(0, Math.floor(event.count))
  const alerts: DeleteRiskResult['alerts'] = []

  let consecutive = state.consecutiveDeletes
  let alerted = state.consecutiveDeleteAlerted
  let score = state.suspiciousScore

  if (
    state.lastDeleteAt &&
    now.getTime() - state.lastDeleteAt.getTime() > STREAK_IDLE_MS
  ) {
    consecutive = 0
    alerted = false
  }

  consecutive += count

  if (event.mode === 'bulk' && count > BULK_DELETE_ALERT_AT) {
    score += SCORE_BULK
    alerts.push({
      reason: 'bulk_delete',
      detail: `Bulk deleted ${count} records (limit ${BULK_DELETE_ALERT_AT}).`,
      scoreDelta: SCORE_BULK,
    })
  }

  if (consecutive > CONSECUTIVE_DELETE_ALERT_AT && !alerted) {
    score += SCORE_CONSECUTIVE
    alerted = true
    alerts.push({
      reason: 'consecutive_deletes',
      detail: `Deleted ${consecutive} records in a row (limit ${CONSECUTIVE_DELETE_ALERT_AT}).`,
      scoreDelta: SCORE_CONSECUTIVE,
    })
  }

  return {
    next: {
      suspiciousScore: score,
      consecutiveDeletes: consecutive,
      consecutiveDeleteAlerted: alerted,
      lastDeleteAt: now,
    },
    alerts,
  }
}

export function resetDeleteStreak(state: DeleteRiskState): DeleteRiskState {
  return {
    ...state,
    consecutiveDeletes: 0,
    consecutiveDeleteAlerted: false,
  }
}
