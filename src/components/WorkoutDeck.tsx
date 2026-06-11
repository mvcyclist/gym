import { getWorkoutById } from '../data/workouts'
import type { ExerciseLog, SetLog, WorkoutCategory } from '../types/workout'
import { ExerciseCarousel } from './ExerciseCarousel'

interface WorkoutDeckProps {
  workoutId: WorkoutCategory
  currentExerciseIndex: number
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  onUpdateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onCompleteSet: (exerciseId: string, setNumber: number) => void
  onAddSet: (exerciseId: string) => void
  onDeleteSet: (exerciseId: string, setNumber: number) => void
  onSkipExercise: (exerciseId: string) => void
  isExerciseLogged: (exerciseId: string) => boolean
  onPrevious: () => void
  onNext: () => void
  onBack: () => void
  onFinish: () => void
}

export function WorkoutDeck({
  workoutId,
  currentExerciseIndex,
  getExerciseLog,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onSkipExercise,
  isExerciseLogged,
  onPrevious,
  onNext,
  onBack,
  onFinish,
}: WorkoutDeckProps) {
  const workout = getWorkoutById(workoutId)

  if (!workout) {
    return (
      <div className="px-4 py-12 text-center text-zinc-400">
        Workout not found.
        <button type="button" onClick={onBack} className="ml-2 text-red-400 underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <ExerciseCarousel
      workout={workout}
      currentIndex={currentExerciseIndex}
      getExerciseLog={getExerciseLog}
      onUpdateSet={onUpdateSet}
      onCompleteSet={onCompleteSet}
      onAddSet={onAddSet}
      onDeleteSet={onDeleteSet}
      onSkipExercise={onSkipExercise}
      isExerciseLogged={isExerciseLogged}
      onPrevious={onPrevious}
      onNext={onNext}
      onBack={onBack}
      onFinish={onFinish}
    />
  )
}
