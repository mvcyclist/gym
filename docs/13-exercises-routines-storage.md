# Exercises & Routines — Storage and UI

How exercises and routines are stored today, and how they reach the UI.

---

## Overview

There are **three layers** of exercise data, plus **session logs**:

| Layer | Location | Purpose |
|-------|----------|---------|
| Exercise catalog | `src/data/exerciseCatalog.ts` | Immutable movement identity + coaching |
| Static routines | `src/data/workouts.ts` | Built-in Push / Pull / Leg / Core defaults |
| User profile | `UserProfile` → localStorage + Supabase | Personalized templates & preferences |
| Session logs | Draft + ledger + Supabase | What the user actually logged |

---

## 1. Exercise catalog (immutable identity)

**File:** `src/data/exerciseCatalog.ts`

Canonical list of movements (`barbell_bench_press`, `pull_ups`, etc.). Each entry defines:

- Name, coaching mode (`weighted` / `bodyweight_reps` / `time`)
- `movementClass` → rep range floors/ceilings (`REP_RANGES`)
- `weightIncrementLbs` → progression step size
- Optional `restSeconds` override
- `getDefaultRestSeconds()`, `getRepRangeForCatalog()`, `parseTemplateSetCount()`

Used for **history, progression coaching, rep targets, and rest timers** — not for “what’s in today’s routine.”

---

## 2. Static routines (built-in defaults)

**File:** `src/data/workouts.ts`

Hard-coded **Push / Pull / Leg / Core** templates. Each exercise has:

| Field | Purpose |
|-------|---------|
| `id` | Slot in template (`push-1`, `push-2`, …) |
| `catalogExerciseId` | Link to catalog |
| `name`, `sets`, `reps`, muscles, rest | Display + defaults |

Before onboarding completes, the UI uses these static lists as-is.

---

## 3. User profile (personalized routines)

**Type:** `src/types/userProfile.ts`  
**Storage:** localStorage (`userProfile:<userId>`) + Supabase `user_profiles`

| Field | What it holds |
|-------|----------------|
| `equipment`, `canBench`, etc. | Onboarding inputs |
| `generatedTemplates` | Push/pull/leg/core lists from equipment (`workoutGeneratorService.ts`) |
| `templateSources` | Per category: `history` \| `default` \| `generated` \| `random` |
| `defaultWeeklyPlan` | Planned activity types by weekday |

Set during **onboarding** (`OnboardingFlow.tsx`) or **Edit routine** (`UserMenu`).

---

## 4. Template resolution (which routine you get)

**File:** `src/services/workoutTemplateService.ts`

After onboarding, `getWorkoutById('push')` calls `getWorkoutExercises()`:

1. `resolveTemplateSource(category)` — pick source
2. `getExercisesForSource(source)` — build exercise list

| Source | Where exercises come from |
|--------|---------------------------|
| **history** | Last **completed** session for that type (catalog IDs + order from ledger) |
| **default** | Static list in `workouts.ts` |
| **generated** | `profile.generatedTemplates` from onboarding |
| **random** | Shuffled pool from default + generated + history |

**Default picker logic:**

1. Explicit `templateSources[category]` if set
2. Else **history** if a completed session exists
3. Else **generated** if onboarding complete + equipment
4. Else **default**

**Note:** History, random, and generated sources **renumber slot IDs** (`push-1`, `push-2`, …) by index. Catalog IDs stay stable; slot numbers do not.

---

## 5. Session logs (what you actually did)

| State | Storage |
|-------|---------|
| In progress | `workout-deck-draft:<userId>` (localStorage) |
| Completed / partial | `workout-deck-ledger:<userId>` (localStorage) + Supabase `workout_sessions` |

Each session stores `ExerciseLog[]`:

```typescript
{
  exerciseId: 'push-2',                  // slot at session start
  catalogExerciseId: 'overhead_press',   // frozen at start
  exerciseName: 'Overhead Press',
  sets: [{ weight, reps, completed, ... }]
}
```

History and coaching use **`catalogExerciseId`**, not slot id.

---

## Target weights, reps, and rest

Targets come from **different places** depending on what they mean. Nothing stores a fixed “target weight” in the routine template — suggested weight is **computed at session time** from history.

### Summary

| Target | Defined in | Stored? | Shown / used in UI |
|--------|------------|---------|-------------------|
| **Template sets** | `Exercise.sets` on each template exercise | Yes (routine) | Set row count at session start; preview on WorkoutStartView |
| **Template reps (display)** | `Exercise.reps` string (e.g. `"6–10"`, `"10 each leg"`) | Yes (routine) | WorkoutStartView list only — **not** used for coaching math |
| **Coaching rep range** | `REP_RANGES` in `exerciseCatalog.ts` by `movementClass` | Code constant | SetLogger “Target reps” column; set feedback; progression |
| **Suggested weight** | `sessionCoaching.ts` from last ledger performance | No — computed | ExerciseCard “Suggested weight”; pre-fills set row on Complete |
| **Rest timer** | `getDefaultRestSeconds()` in `exerciseCatalog.ts` | Derived from catalog | Rest timer preset when you land on / complete a set |

---

### 1. Template sets & reps (routine level)

**Files:** `src/data/workouts.ts`, `src/services/workoutGeneratorService.ts`, resolved templates in `workoutTemplateService.ts`

Each `Exercise` in a routine includes:

| Field | Example | Purpose |
|-------|---------|---------|
| `sets` | `"3"`, `"4"` | Parsed by `parseTemplateSetCount()` → number of set rows |
| `reps` | `"6–10"`, `"30–45 sec"` | **Display only** on preview screen |
| `suggestedRestSeconds` | `120`, `90` | Fallback rest if catalog lookup fails |

When a session starts (`useWorkoutLog.createSession`), it creates that many empty set rows per exercise (default **3** if parse fails).

**WorkoutStartView** shows `sets × reps` from the template. These strings are **not** what drives in-session coaching targets.

---

### 2. Coaching rep range (catalog level)

**File:** `src/data/exerciseCatalog.ts`

Rep targets for logging and progression come from **`movementClass`**, not from the template `reps` string:

| Movement class | Floor | Ceiling |
|----------------|-------|---------|
| `compound_upper` | 6 | 10 |
| `compound_lower` | 6 | 10 |
| `isolation_upper` | 10 | 15 |
| `isolation_lower` | 10 | 15 |

```typescript
getRepRangeForCatalog(catalogExercise) → { floor, ceiling }
```

**Used by:** `sessionCoaching.ts` → `ExerciseCard` → `SetLogger` as the **“Target reps”** column (e.g. `6–10`).

**Set feedback** (`getSetFeedback`) compares logged reps to `repFloor` / `repCeiling` after each completed set.

**Timed exercises** (`coachingMode: 'time'`) and some catalog entries without `movementClass` skip numeric rep ranges.

---

### 3. Suggested weight (computed from history)

**File:** `src/services/sessionCoaching.ts`  
**Inputs:** `exerciseCatalog` (coaching mode, `weightIncrementLbs`), `getLastExercisePerformance(catalogExerciseId)` from ledger

`getProgressionRecommendation()` returns `suggestedWeightLbs`, `repFloor`, `repCeiling`, coaching copy, and a progression **case** (1–5):

| Case | Meaning | Suggested weight |
|------|---------|------------------|
| 5 | First session (no history) | `null` — user picks weight |
| 1 | Hit rep ceiling last time | Previous top weight + increment |
| 2 | Building reps | Hold previous top weight |
| 3 | Performance dropped | Hold weight, focus on form |
| 4 | Stale (&gt;14 days) | ~90% of previous top weight |

**Weight increment** per exercise: `catalogExercise.weightIncrementLbs` (e.g. 5 lb bench, 2.5 lb OHP).

**UI flow:**

1. `ExerciseCard` calls `getProgressionRecommendation()` → shows **Suggested weight** input (editable override)
2. `SetLogger` shows that value in the weight field when the set has no saved weight yet
3. On **Complete**, user’s typed weight wins; suggested weight is only applied if the set weight is still empty
4. After all sets complete, **Next session** card uses `getPostSessionNextCard()` for the following workout’s hint

Suggested weights are **never stored in the routine template** — only computed from completed session history in the ledger.

---

### 4. Rest times

**File:** `src/data/exerciseCatalog.ts` — `getDefaultRestSeconds(catalogExercise)`

Priority order:

1. Per-exercise override: `catalogExercise.restSeconds` (e.g. pull-ups → 180s)
2. Bodyweight / time mode → **60s**
3. Compound movement class → **180s**
4. Isolation movement class → **90s**

Template exercises also carry `suggestedRestSeconds` (from static `workouts.ts` or generator). At runtime:

```typescript
// App.tsx — when exercise changes or set completes
catalog ? getDefaultRestSeconds(catalog) : exercise.suggestedRestSeconds
```

**Catalog wins** when the movement is in the catalog; template value is fallback.

**UI:** Rest timer preset updates in `App.tsx` when you switch exercises; completing a set calls `startWithDuration(seconds)` with the same logic.

User can still change rest duration manually on the timer bar (30s–3m presets, ±15s).

---

### Targets flow (during a workout)

```
Exercise (template)
  ├─ sets string        → parseTemplateSetCount → # of set rows in draft
  └─ reps string        → WorkoutStartView display only

CatalogExercise (by catalogExerciseId)
  ├─ movementClass      → REP_RANGES → repFloor / repCeiling
  ├─ weightIncrementLbs → progression steps
  ├─ coachingMode       → weighted | bodyweight | time
  └─ restSeconds / class → getDefaultRestSeconds → rest timer

Ledger (last performance)
  └─ getLastExercisePerformance → sessionCoaching → suggestedWeightLbs

ExerciseCard + SetLogger
  ├─ Target reps column     ← repFloor–repCeiling (catalog)
  ├─ Suggested weight input ← suggestedWeightLbs (coaching)
  ├─ Weight / reps inputs   ← user log (draft → ledger)
  └─ Set feedback           ← getSetFeedback vs floor/ceiling
```

---

## Two ID systems

| ID | Example | Stable? | Used for |
|----|---------|---------|----------|
| **Slot** | `push-3` | No — changes when template source/order changes | In-session routing, set storage |
| **Catalog** | `overhead_press` | Yes | History, “last workout”, progression |

Old sessions looked “swapped” when the UI mapped slots through a **different** template than the one used at session start. Active sessions now use the **session snapshot** for display; history uses **catalog id**.

**Identity helpers:** `src/services/exerciseIdentity.ts`

---

## How it surfaces in the UI

```
HomeScreen
  └─ Start Push/Pull/Leg
       └─ WorkoutStartView (preview)
            ├─ getWorkoutById() → workoutTemplateService
            │    ├─ UserProfile + templateSources
            │    ├─ Last completed session (ledger)
            │    ├─ workouts.ts defaults
            │    └─ generatedTemplates
            └─ Start workout
                 └─ useWorkoutLog.startSession()
                      ├─ Draft → localStorage
                      └─ ExerciseLog[] (catalogExerciseId + name frozen)
                           └─ WorkoutDeck / ExerciseCarousel
                                ├─ buildDisplayExercisesForSession (active session)
                                └─ ExerciseCard
                                     ├─ exerciseCatalog (coaching)
                                     └─ getLastExercisePerformance (ledger)
```

| Screen | Data source |
|--------|-------------|
| **Home** | Recommendations, weekly plan, activity history |
| **WorkoutStartView** | `getWorkoutById()` → resolved template; reorder/remove; “Try another set” cycles source |
| **WorkoutDeck** (logging) | `buildDisplayExercisesForSession(session)` — names/catalog from session snapshot |
| **ExerciseCard** | Coaching from catalog + last performance from ledger by `catalogExerciseId` |
| **CoreView / Mobility** | Core via `getWorkoutById('core')`; mobility uses a separate static list |

**App flow** (`App.tsx`):

1. Pick workout → `WorkoutStartView` (preview)
2. Tap Start → `startSession(workoutType, customOrder?)` → draft created
3. `workoutStarted` → `WorkoutDeck` with `effectiveExercises`

---

## What is *not* stored

There is no separate “my routines” table. A “routine” is:

```
templateSources[push] + generatedTemplates + last completed session
```

…resolved at runtime, then **frozen into the session** when a workout starts.

---

## Key files

| Area | Files |
|------|-------|
| Catalog | `src/data/exerciseCatalog.ts` |
| Static routines | `src/data/workouts.ts` |
| Template resolution | `src/services/workoutTemplateService.ts` |
| Generated routines | `src/services/workoutGeneratorService.ts` |
| Profile storage | `src/services/userProfileRepository.ts`, `src/adapters/supabaseProfileStorage.ts` |
| Session / draft | `src/hooks/useWorkoutLog.ts`, `src/adapters/workoutDraftStorage.ts` |
| Ledger / cloud | `src/services/ledgerRepository.ts`, `src/adapters/supabaseLedgerStorage.ts` |
| Exercise identity | `src/services/exerciseIdentity.ts` |
| Session display | `src/utils/sessionExercises.ts` |
| History queries | `src/services/exerciseHistoryService.ts` |
| Coaching / suggested weight | `src/services/sessionCoaching.ts` |
| Rep ranges & rest defaults | `src/data/exerciseCatalog.ts` (`REP_RANGES`, `getDefaultRestSeconds`) |
| In-session UI | `src/components/ExerciseCard.tsx`, `src/components/SetLogger.tsx` |
| Rest timer wiring | `src/App.tsx` (`setDurationPreset`, `startWithDuration`) |
