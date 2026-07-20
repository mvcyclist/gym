import { describe, expect, it } from 'vitest'
import { emptyCheckInRegions } from '../types/checkIn'
import type { EquipmentKey } from '../types/userProfile'
import { buildSessionRows, sessionRowsToExercises, toLedgerWorkoutCategory } from './sessionBuilderService'

const equipment: EquipmentKey[] = ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx']
const gear = { equipment, canBench: true }

describe('sessionBuilderService', () => {
  it('builds six TRX rows at low_impact with 60s rest', () => {
    const rows = buildSessionRows(
      'trx',
      { global: '100', regions: emptyCheckInRegions() },
      { equipment: gear.equipment, canBench: true },
    )
    expect(rows).toHaveLength(6)
    expect(rows.every((r) => r.currentTier === 'low_impact')).toBe(true)
    expect(rows.every((r) => r.suggestedRestSeconds === 60)).toBe(true)
    expect(rows.every((r) => r.forceTrx)).toBe(true)
  })

  it('builds heavy rows with 180s rest when 100%', () => {
    const rows = buildSessionRows(
      'full_body',
      { global: '100', regions: emptyCheckInRegions() },
      { equipment: gear.equipment, canBench: true },
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.suggestedRestSeconds === 180 || r.currentTier === 'low_impact')).toBe(true)
    const heavy = rows.filter((r) => r.currentTier === 'heavy')
    expect(heavy.every((r) => r.suggestedRestSeconds === 180)).toBe(true)
  })

  it('maps exercises for ledger start', () => {
    const rows = buildSessionRows(
      'upper',
      { global: '100', regions: emptyCheckInRegions() },
      { equipment: gear.equipment, canBench: true },
    )
    const category = toLedgerWorkoutCategory('upper')
    expect(category).toBe('full_body')
    const exercises = sessionRowsToExercises(rows, category)
    expect(exercises).toHaveLength(rows.length)
    expect(exercises[0].suggestedRestSeconds).toBe(rows[0].suggestedRestSeconds)
  })
})
