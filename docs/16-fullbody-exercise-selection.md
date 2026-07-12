# Full Body — Exercise Selection (v0 static template)

**Purpose:** Concrete content for the quick-build `full_body` template (doc 15
migration plan). Static list, 2 sets per main lift, no rotation yet — pick now, tune
after real usage.

---

## Main lifts — 6 patterns, 2 sets each, 6–10 reps


| Slot | Pattern         | Exercise                        | Equipment         | Notes                                                                                                                                                                                                                                                  |
| ---- | --------------- | ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Squat           | Barbell back squat              | Barbell + rack    |                                                                                                                                                                                                                                                        |
| 2    | Hip hinge       | Barbell Romanian deadlift       | Barbell           |                                                                                                                                                                                                                                                        |
| 3    | Vertical push   | Standing barbell overhead press | Barbell           |                                                                                                                                                                                                                                                        |
| 4    | Vertical pull   | Pull-up                         | Pull-up bar       | Bodyweight, `coachingMode: bodyweight_reps`                                                                                                                                                                                                            |
| 5    | Horizontal push | **Dumbbell flat press**         | Dumbbells + bench | Chose DB over barbell bench — no spotter in a home gym means a barbell bench failure has real risk (bar across chest); DB press can just be dropped to the sides on a missed rep. Revisit if your rack has adjustable safety pins set at chest height. |
| 6    | Horizontal pull | Barbell bent-over row           | Barbell           |                                                                                                                                                                                                                                                        |




## Core — 2 slots


| Exercise          | Type                                       | Notes                               |
| ----------------- | ------------------------------------------ | ----------------------------------- |
| Weighted plank    | Hold-based, `coachingMode: time`           | Anti-extension                      |
| Hanging leg raise | Rep-based, `coachingMode: bodyweight_reps` | Dynamic flexion, reuses pull-up bar |


*Alternate if wanted later: Pallof press (anti-rotation, needs a band) — not included
in v0 since it needs equipment not yet confirmed on hand.*

## Mobility — 4-movement flow (~5–7 min)

Chosen to target the joints actually loaded by the 6 main patterns above, not a
generic stretch list — since every Full Body session trains everything, this flow
stays fixed rather than varying day to day.


| Exercise                 | Targets                        | Why it's here                                |
| ------------------------ | ------------------------------ | -------------------------------------------- |
| World's greatest stretch | Hip flexor, hamstring, t-spine | Efficient — covers three regions in one flow |
| 90/90 hip switch         | Hip internal/external rotation | Directly supports squat + hinge              |
| Thoracic rotation        | Upper back                     | Complements the pressing/pulling volume      |
| Ankle rocks              | Dorsiflexion                   | Directly supports squat depth                |


---

**Session shape:** 12 exercises total in one `full_body` template — mobility flow → main lifts → core (recommended slot order for in-gym flow; see [15-full-body-program-migration.md](./15-full-body-program-migration.md)).
