import { getWorkoutById } from '../data/workouts'
import type { Exercise, ExerciseLog, SetLog, WorkoutCategory } from '../types/workout'
import { ExerciseCarousel } from './ExerciseCarousel'

interface WorkoutDeckProps {
  workoutId: WorkoutCategory
  exercises: Exercise[]
  currentExerciseIndex: number
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  onUpdateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onPrefillSets: (exerciseId: string, weight: string, reps: string) => void
  onCompleteSet: (
    exerciseId: string,
    setNumber: number,
    updates?: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onAddSet: (exerciseId: string) => void
  onDeleteSet: (exerciseId: string, setNumber: number) => void
  onSkipExercise: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onReorderExercises: (newOrder: string[]) => void
  onJumpToExercise: (index: number) => void
  isExerciseLogged: (exerciseId: string) => boolean
  isExerciseSkipped: (exerciseId: string) => boolean
  onPrevious: () => void
  onNext: () => void
  onBack: () => void
  onFinish: () => void
}

export function WorkoutDeck({
  workoutId,
  exercises,
  currentExerciseIndex,
  getExerciseLog,
  onUpdateSet,
  onPrefillSets,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onSkipExercise,
  onRemoveExercise,
  onReorderExercises,
  onJumpToExercise,
  isExerciseLogged,
  isExerciseSkipped,
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
      exercises={exercises}
      currentIndex={currentExerciseIndex}
      getExerciseLog={getExerciseLog}
      onUpdateSet={onUpdateSet}
      onPrefillSets={onPrefillSets}
      onCompleteSet={onCompleteSet}
      onAddSet={onAddSet}
      onDeleteSet={onDeleteSet}
      onSkipExercise={onSkipExercise}
      onRemoveExercise={onRemoveExercise}
      onReorderExercises={onReorderExercises}
      onJumpToExercise={onJumpToExercise}
      isExerciseLogged={isExerciseLogged}
      isExerciseSkipped={isExerciseSkipped}
      onPrevious={onPrevious}
      onNext={onNext}
      onBack={onBack}
      onFinish={onFinish}
    />
  )
}
