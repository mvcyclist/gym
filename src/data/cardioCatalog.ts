export type CardioType = 'Run' | 'Bike' | 'Swim' | 'Walk' | 'HIIT'

export interface CardioDefinition {
  type: CardioType
  name: string
  emoji: string
  distanceUnit: 'meters' | 'miles'
  durationDefaultMinutes: number
  intensityDescriptions: Record<'Easy' | 'Moderate' | 'Hard', string>
}

export const cardioCatalog: CardioDefinition[] = [
  {
    type: 'Run',
    name: 'Run',
    emoji: '🏃',
    distanceUnit: 'miles',
    durationDefaultMinutes: 30,
    intensityDescriptions: {
      Easy:     'Conversational pace, Zone 1–2',
      Moderate: 'Tempo effort, Zone 3',
      Hard:     'Intervals or race effort, Zone 4–5',
    },
  },
  {
    type: 'Bike',
    name: 'Bike',
    emoji: '🚴',
    distanceUnit: 'miles',
    durationDefaultMinutes: 60,
    intensityDescriptions: {
      Easy:     'Spin, recovery ride, flat terrain',
      Moderate: 'Steady effort, some hills',
      Hard:     'Intervals, climbs, race effort',
    },
  },
  {
    type: 'Swim',
    name: 'Swim',
    emoji: '🏊',
    distanceUnit: 'meters',
    durationDefaultMinutes: 45,
    intensityDescriptions: {
      Easy:     'Recovery pace, comfortable breathing',
      Moderate: 'Steady effort, short phrases only',
      Hard:     'Race pace or intervals',
    },
  },
  {
    type: 'Walk',
    name: 'Walk',
    emoji: '🚶',
    distanceUnit: 'miles',
    durationDefaultMinutes: 30,
    intensityDescriptions: {
      Easy:     '',
      Moderate: '',
      Hard:     '',
    },
  },
  {
    type: 'HIIT',
    name: 'HIIT',
    emoji: '⚡',
    distanceUnit: 'miles',
    durationDefaultMinutes: 25,
    intensityDescriptions: {
      Easy:     'Active recovery intervals',
      Moderate: 'Standard work/rest intervals',
      Hard:     'All-out effort intervals',
    },
  },
]

const catalogByType = new Map(cardioCatalog.map((c) => [c.type, c]))

export function getCardioDef(type: string): CardioDefinition | undefined {
  return catalogByType.get(type as CardioType)
}

export function isCardioType(type: string): type is CardioType {
  return catalogByType.has(type as CardioType)
}
