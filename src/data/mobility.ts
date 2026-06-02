export interface MobilityExercise {
  id: string
  name: string
  duration: string
  focus: string
}

export const mobilityExercises: MobilityExercise[] = [
  { id: 'mob-1', name: 'World\'s Greatest Stretch', duration: '30–45 sec each side', focus: 'Hips, thoracic spine' },
  { id: 'mob-2', name: 'Hip Flexor Stretch', duration: '45–60 sec each side', focus: 'Hip flexors' },
  { id: 'mob-3', name: 'Thoracic Rotation', duration: '8–10 each side', focus: 'Upper back' },
  { id: 'mob-4', name: 'Hamstring Stretch', duration: '45–60 sec each side', focus: 'Hamstrings' },
  { id: 'mob-5', name: 'Shoulder CARs', duration: '5–8 each direction', focus: 'Shoulders' },
  { id: 'mob-6', name: 'Cat-Cow', duration: '10–12 reps', focus: 'Spine' },
  { id: 'mob-7', name: 'Deep Squat Hold', duration: '30–60 sec', focus: 'Ankles, hips' },
  { id: 'mob-8', name: 'Band Pull-Aparts', duration: '15–20 reps', focus: 'Upper back, posture' },
]
