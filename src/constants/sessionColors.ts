import type { ActivityType } from '../types/training'

export const SESSION_DOT_COLORS: Record<ActivityType, string> = {
  Push: '#D85A30',
  Pull: '#7F77DD',
  Leg: '#1D9E75',
  'Full Body': '#C2410C',
  Core: '#7F77DD',
  Swim: '#378ADD',
  Bike: '#BA7517',
  Run: '#D4537E',
  Walk: '#3B6D11',
  HIIT: '#ef4444',
  Mobility: '#0F6E56',
  Rest: 'rgba(255,255,255,0.2)',
  Other: 'rgba(255,255,255,0.2)',
}

export const SESSION_DISPLAY_LABELS: Record<ActivityType, string> = {
  Push: 'Push',
  Pull: 'Pull',
  Leg: 'Legs',
  'Full Body': 'Full Body',
  Core: 'Core',
  Swim: 'Swim',
  Bike: 'Bike',
  Run: 'Run',
  Walk: 'Walk',
  HIIT: 'HIIT',
  Mobility: 'Mobility',
  Rest: 'Rest',
  Other: 'Other',
}
