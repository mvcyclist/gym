import { describe, expect, it } from 'vitest'
import type { SessionRow } from '../types/sessionBuilder'
import { autoFitToTarget } from './autoFitService'

function row(partial: Partial<SessionRow> & Pick<SessionRow, 'patternKey' | 'currentTier'>): SessionRow {
  return {
    patternLabel: partial.patternKey,
    catalogExerciseId: 'x',
    currentName: 'X',
    resolvedTier: partial.currentTier,
    sets: 2,
    reps: '6–10',
    suggestedRestSeconds: partial.currentTier === 'low_impact' ? 60 : 180,
    forceTrx: false,
    autoAdjusted: false,
    options: [],
    ...partial,
  }
}

describe('autoFitToTarget', () => {
  const profile = {
    equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx'] as const,
    canBench: true,
  }

  it('skips when no time limit', () => {
    const rows = [
      row({ patternKey: 'squat', currentTier: 'heavy' }),
      row({ patternKey: 'hinge', currentTier: 'heavy' }),
    ]
    const result = autoFitToTarget(rows, null, {
      equipment: [...profile.equipment],
      canBench: true,
    })
    expect(result.changes).toEqual([])
    expect(result.core).toBe(true)
    expect(result.mobility).toBe(true)
    expect(result.rows).toHaveLength(2)
  })

  it('cuts mobility then core before dropping patterns on a tight target', () => {
    const rows = [
      row({ patternKey: 'squat', currentTier: 'heavy', sets: 2 }),
      row({ patternKey: 'hinge', currentTier: 'heavy', sets: 2 }),
      row({ patternKey: 'horizontal_push', currentTier: 'heavy', sets: 2 }),
      row({ patternKey: 'horizontal_pull', currentTier: 'heavy', sets: 2 }),
      row({ patternKey: 'vertical_push', currentTier: 'heavy', sets: 2 }),
      row({ patternKey: 'vertical_pull', currentTier: 'heavy', sets: 2 }),
    ]
    const result = autoFitToTarget(rows, 30, {
      equipment: [...profile.equipment],
      canBench: true,
    })
    expect(result.changes.some((c) => c.includes('Mobility'))).toBe(true)
    expect(result.mobility).toBe(false)
  })
})
