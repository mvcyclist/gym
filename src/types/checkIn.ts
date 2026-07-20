export type GlobalFeeling = '100' | 'not_100' | 'skip'

export type RegionStatus = 'fine' | 'bothering'

export type BodyRegion =
  | 'knees'
  | 'hips'
  | 'lower_back'
  | 'front_shoulder'
  | 'upper_back'
  | 'elbows_wrists'

export interface CheckIn {
  global: GlobalFeeling
  /** Only meaningful when global === 'not_100'; defaults fine otherwise. */
  regions: Record<BodyRegion, RegionStatus>
}

export const BODY_REGIONS: Array<{ id: BodyRegion; label: string }> = [
  { id: 'knees', label: 'Knees' },
  { id: 'hips', label: 'Hips' },
  { id: 'lower_back', label: 'Lower back' },
  { id: 'front_shoulder', label: 'Front of shoulder' },
  { id: 'upper_back', label: 'Upper back' },
  { id: 'elbows_wrists', label: 'Elbows / wrists' },
]

export const REGION_STATUSES: RegionStatus[] = ['fine', 'bothering']

export const REGION_STATUS_LABELS: Record<RegionStatus, string> = {
  fine: 'Fine',
  bothering: 'Bothering me',
}

export function emptyCheckInRegions(): Record<BodyRegion, RegionStatus> {
  return {
    knees: 'fine',
    hips: 'fine',
    lower_back: 'fine',
    front_shoulder: 'fine',
    upper_back: 'fine',
    elbows_wrists: 'fine',
  }
}
