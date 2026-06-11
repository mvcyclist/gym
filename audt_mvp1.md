Please audit the current app against this MVP0 prerequisite checklist.

Context:
We are preparing to build MVP1: strength-first coaching.
MVP1 depends on reliable workout history, especially being able to answer:
"What did I lift last time for this same exercise?"

Before adding coaching logic, confirm whether the existing MVP0 foundation supports the following.


1. Workout session lifecycle

[n] Abandoned/deleted workouts are not treated as valid history for future recommendations.
[n] User can abandon/delete a workout.

2. Partial workout reliability

[n] User can navigate away and return to the active workout.
[n] App gives the user a way to resume or discard an in-progress workout.
[n] Partial workouts do not pollute completed workout history unless explicitly completed.


6. Workout history

[n] User can view prior completed workouts.
[n] Workout history is sorted correctly by date.
[n] App can fetch recent completed workouts.
[n] App can fetch the last completed workout by workout type.
[n] App can fetch the last completed performance for a specific exerciseId.
[n] App can retrieve all prior sets for a specific exercise within a previous session.
[n] History queries exclude abandoned/deleted workouts.
[n] History queries handle partial/in-progress workouts correctly.
[n] History lookup still works if the user edited a previous workout.
[n] History lookup works even if an exercise appears in more than one workout type.

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

[n] User can correct a mistaken set after logging it.
[n] User can correct a mistaken workout after completion.
[n] User can delete bad workouts.
[n] User can distinguish manually edited history from normal logged history if needed.
[n] Corrections are reflected in future history lookups.
[n] App does not cache stale history after edits.

9. Post-workout foundation

[ ] After completing a workout, app shows a basic summary.
[ ] Summary includes exercises performed.
[ ] Summary includes sets, reps, and weights.
[n] Summary can be extended later to compare against last time.
[n] Completed workout is immediately available in history after save.

10. Basic recommendation surface

[ ] Home screen or dashboard has a place to show a recommendation.
[ ] Recommendation card can show the next workout type.
[ ] Recommendation card can later show exercise-level targets.
[ ] Active workout screen has room to show next-set guidance.
[ ] Post-workout screen has room to show next-time guidance.
[ ] Existing UI can support coaching cards without a major rewrite.

12. Manual activity history

[ ] App supports recent activity history.
[ ] User can manually add/edit non-lifting activities if already implemented.
[ ] Non-lifting activities such as swim, bike, walk, mobility are stored separately or distinguishably from strength workouts.
[ ] These activities do not break strength workout history queries.
[ ] These are nice-to-have for MVP1, but must not interfere with strength progression history.




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