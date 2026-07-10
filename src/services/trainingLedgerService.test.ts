import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { WorkoutSession } from '../types/workout'

const upsertSession = vi.fn(async () => undefined)

vi.mock('./ledgerRepository', () => ({
  upsertSession,
}))

describe('recordPartialWorkout', () => {
  beforeEach(() => {
    upsertSession.mockClear()
  })

  it('preserves an existing completedAt timestamp', async () => {
    const { recordPartialWorkout } = await import('./trainingLedgerService')

    const session: WorkoutSession = {
      id: 'push-partial',
      workoutType: 'push',
      status: 'active',
      startedAt: '2026-06-22T18:00:00.000Z',
      updatedAt: '2026-06-22T18:00:00.000Z',
      completedAt: '2026-06-22T23:59:00.000Z',
      exercises: [],
    }

    await recordPartialWorkout(session)

    expect(upsertSession).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'partial',
        completedAt: '2026-06-22T23:59:00.000Z',
      }),
    )
  })
})
