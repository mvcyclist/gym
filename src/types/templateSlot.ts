import type { AccessoryGroup, LoadTier, MovementPattern } from '../data/exerciseCatalog'

export interface TemplateSlot {
  id: string
  slotType: 'pattern' | 'accessory'
  movementPattern?: MovementPattern
  accessoryGroup?: AccessoryGroup
  /** Preferred load tier when falling back into the pattern pool. */
  loadTier?: LoadTier
  /** Classic-template parity pick (Decision B). */
  defaultCatalogExerciseId: string
  sets: string
  reps: string
  suggestedRestSeconds: number
  primaryMuscles: string[]
}
