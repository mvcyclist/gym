Please audit the current app against this MVP0 prerequisite checklist.

Context:
We are preparing to build MVP1: strength-first coaching.
MVP1 depends on reliable workout history, especially being able to answer:
"What did I lift last time for this same exercise?"

Before adding coaching logic, confirm whether the existing MVP0 foundation supports the following.

1. User and persistence foundation

[ ] App supports signed-in users.
[ ] Workout data is associated with the signed-in user.
[ ] Workout data is persisted in Supabase.
[ ] Workout history survives page refresh.
[ ] Workout history survives logout/login.
[ ] Workout history can be loaded across devices for the same signed-in user.
[ ] Supabase errors are handled gracefully.
[ ] User does not lose workout data if a save/sync fails temporarily.

2. Workout session lifecycle

[ ] User can start a new workout session.
[ ] Each workout session has a stable session ID.
[ ] Each workout session has a workout type: push, pull, legs, core.
[ ] Each workout session has a startedAt timestamp.
[ ] Completed workouts have a completedAt timestamp.
[ ] Workout session status is tracked clearly:
    - in_progress
    - completed
    - abandoned or deleted
[ ] Completed workouts are distinguishable from partial/in-progress workouts.
[ ] Abandoned/deleted workouts are not treated as valid history for future recommendations.
[ ] User can complete a workout.
[ ] User can abandon/delete a workout.
[ ] App does not accidentally create duplicate workout sessions on refresh or navigation.

3. Partial workout reliability

[ ] Active workouts autosave.
[ ] Autosave happens after logging or editing a set.
[ ] User can refresh the page during a workout and resume without losing data.
[ ] User can navigate away and return to the active workout.
[ ] App can detect an existing in-progress workout.
[ ] App gives the user a way to resume or discard an in-progress workout.
[ ] Partial workouts do not pollute completed workout history unless explicitly completed.
[ ] Rest timer state does not corrupt or block workout saving.

4. Exercise identity and definitions

[ ] Each exercise has a stable exerciseId.
[ ] ExerciseId is used for history lookup, not just exercise name.
[ ] Exercise names are displayed to the user but not relied on as the only identifier.
[ ] Exercises belong to a workout type: push, pull, legs, core.
[ ] Exercises have a stable order within each workout.
[ ] The same exercise across sessions resolves to the same exerciseId.
[ ] Existing workout templates use stable exercise definitions.
[ ] Exercise definitions are not recreated with new IDs every time a workout starts.

5. Set logging

[ ] User can log weight and reps for each set.
[ ] Each set has a setNumber or stable ordering.
[ ] Each set belongs to the correct exercise.
[ ] Each exercise belongs to the correct workout session.
[ ] User can add a set.
[ ] User can edit a set.
[ ] User can delete a set.
[ ] Edited sets persist correctly.
[ ] Deleted sets do not reappear after refresh.
[ ] Weight and reps are stored as numeric values.
[ ] App handles bodyweight exercises where external weight may be blank, zero, or optional.
[ ] App prevents obviously invalid set values where reasonable, such as negative reps or negative weight.

6. Workout history

[ ] User can view prior completed workouts.
[ ] Workout history is sorted correctly by date.
[ ] App can fetch recent completed workouts.
[ ] App can fetch the last completed workout by workout type.
[ ] App can fetch the last completed performance for a specific exerciseId.
[ ] App can retrieve all prior sets for a specific exercise within a previous session.
[ ] History queries exclude abandoned/deleted workouts.
[ ] History queries handle partial/in-progress workouts correctly.
[ ] History lookup still works if the user edited a previous workout.
[ ] History lookup works even if an exercise appears in more than one workout type.

7. Required history query for MVP1

Please confirm whether the app can support this query cleanly:

Given:
- signed-in user
- current exerciseId
- current workout session

Return:
- most recent completed workout containing the same exerciseId
- date of that workout
- all completed sets for that exercise
- weight and reps for each set
- total reps
- best set
- total volume if easy to compute

Example return shape:

{
  exerciseId: "bench_press",
  exerciseName: "Bench Press",
  lastPerformedAt: "2026-06-01",
  sets: [
    { setNumber: 1, weight: 135, reps: 10 },
    { setNumber: 2, weight: 135, reps: 8 },
    { setNumber: 3, weight: 135, reps: 7 }
  ],
  totalReps: 25,
  topSet: { weight: 135, reps: 10 },
  totalVolume: 3375
}

8. Editing and data correction

[ ] User can correct a mistaken set after logging it.
[ ] User can correct a mistaken workout after completion.
[ ] User can delete bad workouts.
[ ] User can distinguish manually edited history from normal logged history if needed.
[ ] Corrections are reflected in future history lookups.
[ ] App does not cache stale history after edits.

9. Post-workout foundation

[ ] After completing a workout, app shows a basic summary.
[ ] Summary includes exercises performed.
[ ] Summary includes sets, reps, and weights.
[ ] Summary can be extended later to compare against last time.
[ ] Completed workout is immediately available in history after save.
[ ] Completing a workout does not lose set-level detail.

10. Basic recommendation surface

[ ] Home screen or dashboard has a place to show a recommendation.
[ ] Recommendation card can show the next workout type.
[ ] Recommendation card can later show exercise-level targets.
[ ] Active workout screen has room to show next-set guidance.
[ ] Post-workout screen has room to show next-time guidance.
[ ] Existing UI can support coaching cards without a major rewrite.

11. Rest timer preservation

[ ] Rest timer works during active workout.
[ ] Rest timer does not interfere with logging sets.
[ ] Rest timer does not interfere with autosave.
[ ] Rest timer state does not need to be perfect for MVP1, but workout data must remain safe.

12. Manual activity history

[ ] App supports recent activity history.
[ ] User can manually add/edit non-lifting activities if already implemented.
[ ] Non-lifting activities such as swim, bike, walk, mobility are stored separately or distinguishably from strength workouts.
[ ] These activities do not break strength workout history queries.
[ ] These are nice-to-have for MVP1, but must not interfere with strength progression history.

13. Technical structure

[ ] Workout data types are defined clearly.
[ ] Exercise data types are defined clearly.
[ ] Set data types are defined clearly.
[ ] Supabase read/write logic is reasonably isolated.
[ ] History query logic is reusable.
[ ] Workout session state is not scattered across too many components.
[ ] There is a clear place to add future coaching logic.
[ ] Existing recommendation logic, if any, is isolated enough to replace or extend.

14. MVP1 readiness gate

Please mark the app as ready for MVP1 only if all of these are true:

[ ] A user can complete two Push workouts on different days.
[ ] Both workouts persist correctly.
[ ] The app can identify the most recent completed Push workout.
[ ] The app can identify the most recent Bench Press performance.
[ ] The app can return Bench Press sets from last time.
[ ] The app can display those prior sets during a new Push workout.
[ ] The app can survive refresh during an active workout.
[ ] The app can edit incorrect set data.
[ ] Partial or abandoned workouts are not used as completed history.
[ ] Data remains tied to the correct signed-in user.

Output requested:
1. Which checklist items are already implemented?
2. Which are partially implemented?
3. Which are missing?
4. Any bugs or risky assumptions?
5. Recommended fixes before starting MVP1 strength coaching.