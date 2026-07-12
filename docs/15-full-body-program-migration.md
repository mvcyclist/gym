# Full Body Program — Migration Summary

**Status:** Implemented — migrate via User menu → Switch to Full Body.

**Related docs:**

- [13-exercises-routines-storage.md](./13-exercises-routines-storage.md) — how routines and templates work today
- [14-content-foundation-design.md](./14-content-foundation-design.md) — Supabase content layer (already has `program_type: 'ppl' | 'full_body'`)
- [16-fullbody-exercise-selection.md](./16-fullbody-exercise-selection.md) — locked v0 exercise list (6 lifts + 2 core + 4 mobility)

---

## 1. What you want

### Weekly rhythm

| Day | Intended slot |
|-----|---------------|
| Monday | Full Body |
| Tuesday | Cardio **or** Rest |
| Wednesday | Full Body |
| Thursday | Cardio **or** Rest |
| Friday | Full Body |
| Saturday | Cardio **or** Rest |
| Sunday | Cardio **or** Rest |

**Floating rest:** Rest is not pinned to a fixed weekday. You take it when schedule or fatigue dictates. Cardio and rest share the off days; strength days stay on the Mon / Wed / Fri cadence in intent, but the app should adapt recommendations based on what you actually logged.

### Full Body routine

- **Static** exercise list — see [16-fullbody-exercise-selection.md](./16-fullbody-exercise-selection.md).
- **One session, one Start:** mobility flow (4) → main lifts (6 patterns, 2 sets) → core (2) — all in a single `full_body` `WorkoutDeck`.
- **Cardio** stays on off days (Tue / Thu / Sat / Sun flex slots), not inside the strength session.

### Constraints

- Keep the **recommendation framework** (`recommendationEngine.ts` scoring, buckets, reasons, weekly projection).
- Prefer **incremental changes** inside the current paradigm (profile → palette → templates → history → UI).
- Defer fundamental architecture changes until usage proves they're needed.

---

## 2. How the app works today (relevant pieces)

```
UserProfile
  ├─ defaultWeeklyPlan     → onboarding preview + initial planOverrides seed
  ├─ generatedTemplates    → push / pull / leg / core (equipment-based)
  ├─ templateSources       → history | default | generated | random (per category)
  └─ cardioModalities      → which cardio types appear in palette

paletteFromProfile()  →  UserPalette.types  →  recommendationEngine.getRecommendation()
                                                      ↓
                                              scores Push, Pull, Leg, Core, cardio, Rest…

workoutTemplateService  →  resolves exercises for push | pull | leg | core
workouts.ts             →  static default templates

Activity history (ledger)  →  what you actually did drives tomorrow's scores
planOverrides (ledger)     →  optional pins for future calendar display only
```

**Important distinction:** The recommendation engine does **not** read `defaultWeeklyPlan` or `planOverrides`. It scores workout types purely from **activity history** + **palette**. Plan overrides only affect how future days are **displayed** on Home (and sync to cloud); they do not change engine math.

Today's default week (`weeklyPlanFromProfile.ts`) is PPL:

```
Sun Rest · Mon Push · Tue Walk/Rest · Wed Pull · Thu Cardio · Fri Leg · Sat Cardio
```

Today's palette always includes `Push`, `Pull`, `Leg`, `Core` plus user-selected cardio and optional `Mobility` / `Rest`.

---

## 3. What stays the same

| Piece | Why it carries over |
|-------|---------------------|
| `recommendationEngine.ts` structure | Scoring steps (recovery, leg fatigue, weekly load, balance, rest urgency) still apply |
| History-driven adaptation | Logging Rest or Cardio updates scores for the next day — this is the core of "floating rest" |
| `workoutTemplateService` source model | `history → default → generated → random` per strength category |
| Session / ledger model | `WorkoutSession` + `catalogExerciseId` slugs unchanged |
| `sessionCoaching.ts` | Progression still keyed on catalog exercise, not workout type |
| Cardio / Mobility / Core **views** | Existing flows for non-strength modalities |
| `planOverrides` | Manual "I'm resting Thursday" without code changes to the engine |

---

## 4. Minimal-change migration plan

### 4.1 Add a program type to the profile

**File:** `src/types/userProfile.ts`

Add something like:

```typescript
programType: 'ppl' | 'full_body'   // default 'ppl' for backward compatibility
```

Branch onboarding, weekly plan generation, palette derivation, and template categories on this flag. Existing users stay on PPL until they switch (edit routine or re-onboard).

### 4.2 New activity + workout types

**Files:** `src/types/training.ts`, `src/types/workout.ts`, `src/utils/workoutCategoryMap.ts`

| Today | Add |
|-------|-----|
| `WorkoutCategory`: `push \| pull \| leg \| core` | `full_body` |
| `ActivityType` / `WorkoutType`: `Push`, `Pull`, `Leg`… | `Full Body` (display) mapped to `full_body` (session id) |
| `RecommendedWorkoutType` | Include `Full Body` |

**Load profile** for `Full Body` in `LOAD_PROFILES`:

| Field | Suggested starting value | Rationale |
|-------|--------------------------|-----------|
| `recoveryHours` | 48–72 | Hits full body; similar to Leg |
| `legPoolContribution` | 2–3 | Squat/hinge patterns contribute to leg fatigue pool |
| `isHardSession` | `true` | Counts toward weekly hard-session load |
| `isLowLoad` | `false` | — |

Tune after a few weeks of real usage.

### 4.3 Static Full Body template

**File:** `src/data/workouts.ts` (today) → `routine_templates` + slots (after content foundation)

Add a `full_body` entry with **12 slots** per [16-fullbody-exercise-selection.md](./16-fullbody-exercise-selection.md):

| Block | Slots | Notes |
|-------|-------|-------|
| Mobility flow | 4 | `coachingMode: 'time'` holds — log seconds in `SetLog.reps` (see time-mode convention) |
| Main lifts | 6 | One per movement pattern; 2 sets each in template |
| Core | 2 | Weighted plank (`time`) + hanging leg raise (`bodyweight_reps`) |

**Recommended slot order in template:** mobility → main lifts → core (warm-up before loading).

Set `templateSources.full_body = 'default'` (static). **Only `default` and `history`** for Full Body — no `generated` or `random` (see §11 decision 4). Some catalog rows may need to be added (RDL, DB flat press, hanging leg raise, mobility slugs).

**Prerequisite fix:** time-mode sets must parse for history without a weight value (today `parseSetLoad` drops them) — required for plank and mobility holds.

Update `StrengthTemplateKey` / `STRENGTH_CATEGORIES` in `workoutTemplateService.ts` to include `full_body` when `programType === 'full_body'`.

### 4.4 New default weekly plan

**File:** `src/services/weeklyPlanFromProfile.ts`

Add `generateFullBodyWeeklyPlan(profile)`:

```
Sun  → Cardio (or Walk if only recovery cardio) / Rest flex
Mon  → Full Body
Tue  → Cardio / Rest flex
Wed  → Full Body
Thu  → Cardio / Rest flex
Fri  → Full Body
Sat  → Cardio / Rest flex
```

"Flex" slots: store as the user's primary cardio modality with meta `"Cardio or Rest"`, or use a placeholder type the UI labels as flexible. The engine will still pick among cardio types + `Rest` on those days once history exists.

Wire into `completeOnboarding()` and onboarding Screen 4 preview (`OnboardingFlow.tsx`).

### 4.5 Palette swap

**File:** `src/services/paletteFromProfile.ts`

| `programType` | Strength types in palette |
|---------------|---------------------------|
| `ppl` (today) | `Push`, `Pull`, `Leg`, `Core` |
| `full_body` | `Full Body` only |

Keep user-selected cardio modalities + `Rest`. **Do not** add standalone `Core` or `Mobility` to the palette on `full_body` — both are inside the session template. Suppress engine addon suggestions for Core/Mobility after Full Body.

### 4.6 Recommendation engine tweaks (small)

**File:** `src/services/recommendationEngine.ts`

1. **`MUSCLE_GROUPS`** — replace `push` / `pull` / `legs` groups with a `full_body: ['Full Body']` group when on full-body program (or add alongside for shared code path).
2. **Leg fatigue** — include `Full Body` in the leg-fatigue penalty branch (with `Run`, `Bike`, `Leg`).
3. **Addon detection** — revisit `detectAddon()`: today it suggests Core/Mobility after Push/Pull/Leg. For Full Body, either suppress Core addon (if core is on off days) or keep Mobility addon only.

**File:** `src/services/recommendationService.ts`

- Remove or gate the **post-generation Core insert** (`hasCore` block). That logic exists because PPL often skips Core; a full-body program may not need it.

### 4.7 Navigation + UI wiring

| File | Change |
|------|--------|
| `src/utils/recommendationNavigation.ts` | `Full Body` → `{ action: 'workout', workoutId: 'full_body' }` |
| `src/constants/sessionColors.ts` | Color + label for `Full Body` |
| `src/components/HomeScreen.tsx` | `ALL_SESSION_TYPES`, primary button label, future-day display |
| `src/components/ChooseAnotherModal.tsx` | Fallback option + `typeToAction` |
| `src/components/WorkoutSelector.tsx` | Show Full Body instead of PPL tiles when `programType === 'full_body'` |
| `src/App.tsx` | `handleSelectWorkout('full_body')` path (same as push/pull today) |
| `src/components/OnboardingFlow.tsx` | Program picker or infer from plan; update copy |
| `src/components/EducationWelcomeScreen.tsx` | Marketing copy |

### 4.8 Tests to update

- `src/services/workoutGeneratorService.test.ts` — palette + weekly plan expectations
- Any recommendation engine tests (if present)
- Onboarding completion → `seedPlanOverridesFromProfile` produces Full Body Mon/Wed/Fri

---

## 5. Full-day session shape (locked)

**Decision:** Core and mobility are part of the Full Body day — not separate off-day sessions or engine addons.

| Modality | When | How |
|----------|------|-----|
| **Mobility + strength + core** | Mon / Wed / Fri | Single `full_body` template → one `WorkoutDeck` (12 exercises) |
| **Cardio** | Off days (flex) | Existing cardio log / timer; palette includes user's cardio types |
| **Rest** | Off days (flex) | Log `Rest` or let engine recommend it; swap from seeded cardio |

### Implementation within current paradigm

No new session type. Fold mobility and core into the `full_body` template and run everything through existing `WorkoutDeck` + `SetLogger`:

- **Weighted / bodyweight lifts** — unchanged
- **Hold-based** (plank, mobility holds) — `coachingMode: 'time'`, seconds in `SetLog.reps`
- **Rep-based core** (hanging leg raise) — `coachingMode: 'bodyweight_reps'`

`CoreView` and `MobilityView` remain for users on `programType: 'ppl'` or ad-hoc standalone mobility; not the primary path on full-body days.

### Small fixes required (not architectural)

1. **Time-mode history parsing** — allow reps-only sets so holds count in `getLastExercisePerformance`
2. **Catalog seed** — add any missing `catalogExerciseId` slugs from doc 16 (RDL, DB flat press, hanging leg raise, four mobility movements)
3. **Optional UI polish** — block headers in `WorkoutDeck` ("Mobility", "Main lifts", "Core") via `block_id` or slot metadata later; not required for v0

---

## 6. Floating rest — how it works with minimal changes

### What already works

1. **You log Rest** on a day → `activityHistory` includes `Rest` → engine's `daysSinceLastRestLike` and `hardSessionCount` update → next day scores shift toward Full Body or Cardio appropriately.
2. **You log Cardio instead of Rest** → same history-driven adaptation.
3. **You pin a day** via `planOverrides` on Home → calendar display shows your intent; clearing override resets to engine projection.
4. **Rest urgency** (`hardSessionCount >= 5 && daysSinceLastRestLike >= 4`) already boosts Rest / Mobility / Walk.

### What does *not* happen automatically today

- The engine does **not** know "Tuesday is always flex; never put Full Body there."
- If you skip Monday Full Body and rest, Wednesday's recommendation is based on **recovery since last Full Body**, not "catch up Monday's slot."
- `planOverrides` do **not** feed back into `getRecommendation()`.

### Practical workflow (no architecture change)

1. Onboarding seeds Mon/Wed/Fri = `Full Body`, flex days = **primary cardio modality** in `planOverrides` (engine/user swaps to `Rest` when needed).
2. On a flex day you feel tired → log **Rest** (or override that day to Rest on Home).
3. Engine sees extra recovery → next Full Body day scores higher.
4. If you miss a Full Body day entirely, the balance bonus (`MUSCLE_GROUPS.full_body` — no session in 5+ days) nudges the next recommendation toward Full Body.

This is **good enough** for floating rest on off days. Strength-day drift (missing Mon, doing Thu instead) is handled by recovery scoring, not calendar enforcement.

---

## 7. Architecture changes to explore later (if usage demands)

| Gap | Possible evolution | Trigger to build |
|-----|-------------------|----------------|
| Calendar-anchored strength days | **Cadence layer**: soft bonus on Mon/Wed/Fri for Full Body when last FB was ≥2 days ago; penalty for FB on consecutive days | You want the app to *discourage* strength on Tue/Thu/Sat/Sun even when recovered |
| Flex-day typing | **`CardioOrRest`** pseudo-type in weekly plan; engine expands to cardio ∪ Rest only on those weekdays | Off days keep recommending Full Body when you're "supposed" to rest |
| planOverrides → engine | Merge overrides into `getRecommendation()` input as soft constraints | You rely heavily on overrides and want them to drive scores |
| Program switch mid-history | Migration: map old Push/Pull/Leg sessions → `Full Body` for display only; keep `catalogExerciseId` history | You switch programType with months of PPL logs |
| Static → rotating Full Body | `block_id` on `routine_template_slots` (already in content-foundation design) | You want 4-week exercise rotation |
| Single composite session | Multi-phase `WorkoutSession` or unified deck | Option B in §5 |
| Equipment-based Full Body | `generateFullBodyExercises()` in `workoutGeneratorService.ts` | You want static patterns but swappable implementations per equipment |

---

## 8. Content foundation alignment

When [14-content-foundation-design.md](./14-content-foundation-design.md) lands, the static file changes above map cleanly:

| Static today | Supabase target |
|--------------|-----------------|
| `workouts.ts` → `full_body` array | `routine_templates` row `id = full_body`, `program_type = full_body` |
| 12 exercises (doc 16) | 12 `routine_template_slots` with `position` 1–12 |
| `movement_pattern` (not in static catalog today) | `exercises.movement_pattern` column — one row per pattern |

**v1 seed:** `push`, `pull`, `leg`, `core`, `mobility` templates OR replace PPL seeds with `full_body` for your profile only. Admin tool gets a program-type filter.

**No `block_id` rotation** until you ask for it — your routine stays static.

---

## 9. Suggested implementation order

```
1. Types + programType on UserProfile (default 'ppl')
2. full_body static template in workouts.ts (12 exercises per doc 16) + catalog slugs
2b. Fix time-mode set parsing for hold history
3. workoutTemplateService + category map + navigation
4. generateFullBodyWeeklyPlan + palette branch
5. recommendationEngine load profile + muscle group tweaks
6. UI: WorkoutSelector, HomeScreen, colors, onboarding copy
7. Gate recommendationService Core-insert for full_body program
8. Tests + manual QA: log Rest on Tue → Wed recommends Full Body
9. (Later) content foundation seed + admin authoring
```

Do **not** batch steps 4–6 with content foundation migration — template resolution is already the highest-risk area per doc 14.

---

## 10. Manual QA checklist

- [ ] Onboarding shows Mon/Wed/Fri Full Body, flex days labeled Cardio/Rest
- [ ] `getWorkoutById('full_body')` returns 12 exercises (mobility → lifts → core)
- [ ] Plank / mobility holds persist in per-exercise history after fix
- [ ] Starting Full Body creates session with `workoutType: 'full_body'`; ledger activity type is `Full Body`
- [ ] Completing Full Body feeds history; next-day recommendation changes
- [ ] Logging Rest on a flex day increases Full Body score within ~48–72h
- [ ] `catalogExerciseId` coaching / suggested weight works per exercise (unchanged)
- [ ] planOverride pin + reset on Home still works for flex days
- [ ] Existing PPL users (`programType: 'ppl'`) unaffected

---

## 11. Locked decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | **Core + mobility** | Part of the full-day `full_body` session (12-slot template). Not separate palette types or off-day sessions. Content: [16-fullbody-exercise-selection.md](./16-fullbody-exercise-selection.md). |
| 2 | **Flex-day planOverrides** | Seed flex days with **primary cardio** modality; swap to `Rest` (log or override) when fatigued or schedule dictates. |
| 3 | **Program switch** | **One-time migration UI** for existing users moving `ppl` → `full_body` (not dev-only flag). |
| 4 | **Template sources for Full Body** | **`default` + `history` only** — always the static list from doc 16. No equipment-generated Full Body variant. |

### What decision 4 meant

Today each PPL category can resolve exercises from four sources (`workoutTemplateService.ts`):

| Source | Meaning |
|--------|---------|
| `default` | Static list in `workouts.ts` |
| `history` | Exercises + order from your last completed session |
| `generated` | Built from onboarding equipment via `workoutGeneratorService.ts` |
| `random` | Shuffled mix of the above |

**"Generated Full Body"** asked whether onboarding should auto-build a Full Body template from equipment (like it does for Push/Pull/Leg today), or whether you always use your hand-picked static routine.

**Answer:** Static only. You've already chosen exact exercises in doc 16; equipment-based generation adds complexity without value for v0. `generatedTemplates.full_body` is not needed; hide "Try another set" cycling to `generated` / `random` for `full_body`.

### Migration UI (decision 3) — scope sketch

One-time flow when user selects Full Body program:

- Set `programType: 'full_body'`, regenerate `defaultWeeklyPlan`, refresh palette, set `templateSources.full_body: 'default'`
- Reseed `planOverrides` for current week (or prompt to reset calendar)
- **Do not rewrite** past ledger sessions — old Push/Pull/Leg logs stay as-is; coaching history remains keyed on `catalogExerciseId`
- Optional: show summary of what changes (PPL tiles → Full Body, new weekly rhythm)

---

*Last updated: decisions locked — composite full-day session, static template, cardio-seeded flex days.*
