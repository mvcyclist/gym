# Phase 1–2: Pattern Pool + UI Compatibility Audit

**Status:** Phase 1–2 implemented (catalog pools + TemplateSlot resolver + generator rewrite)  
**Parent spec:** [movement-pattern-refactor-spec.md](./movement-pattern-refactor-spec.md)  
**Scope for this doc:** Phase 1 (catalog schema) + Phase 2 (template slots / resolution) only  
**Non-goals here:** Check-in UI, `recommended` source, build-my-own picker, saved-routines UI (Phases 3–6)

---

## 1. Goal for Phase 1–2

Keep **all existing strength UI** working while changing the data model underneath:

| Today | After Phase 2 |
|-------|----------------|
| Template slot → hardcoded `catalogExerciseId` | Template slot → `movementPattern` / `accessoryGroup` → **resolved** `catalogExerciseId` |
| UI reads `Exercise[]` | UI still reads `Exercise[]` (same shape) |

**Success criterion:** `WorkoutStartView`, set logger, Full Body main-lift carousel, onboarding routine preview, and history/coaching behave the same for current sources (`history` / `default` / `generated` / `random`) — ideally identical defaults for the classic templates.

---

## 2. Compatibility strategy (UI stays, backend swaps)

### 2.1 Contract the UI already depends on

Screens do **not** care how a slot was chosen. They need a resolved `Exercise`:

| Field | Required by current UI? | Notes |
|-------|-------------------------|-------|
| `id` | **Yes** | Session log key, reorder, skip/remove |
| `catalogExerciseId` | **Yes** | Coaching, history, rest timer, SetLogger mode |
| `name` | **Yes** | Headers, overview, onboarding list |
| `sets` | **Yes** | Initial set count + preview |
| `reps` | Display | Preview/onboarding; coaching uses catalog `REP_RANGES` |
| `suggestedRestSeconds` | Fallback | App prefers catalog `getDefaultRestSeconds` when present |
| `primaryMuscles` | CoreView only | Strength carousel does not show this |
| `equipment` | **No UI use today** | Safe to move to catalog |
| `instructions` / `cues` / `commonMistakes` | **No UI use today** | Placeholder boilerplate; safe to move to catalog |

### 2.2 Single choke point (do not change component props)

Insert resolution here so UI keeps calling the same APIs:

```
TemplateSlot[]  (new shape in workouts / types)
      │
      ▼
resolveSlot(source, profile) → catalogExerciseId
      │
      ▼
exerciseFromCatalog(...) → Exercise[]     [workoutTemplateService.ts]
      │
      ▼
getWorkoutById() / getWorkoutExercises()  ← UI entry points unchanged
      │
      ▼
WorkoutStartView / App / WorkoutDeck / FullBodyWorkoutFlow / OnboardingFlow
```

**Session boundary already helps:** `useWorkoutLog` freezes `catalogExerciseId` + `exerciseName` at session start. Once preview/start resolve correctly, in-session UI is insulated.

### 2.3 Do not touch in Phase 1–2

- Guided Full Body segments (`warmup_segment` / `core_segment` / `mobility_segment` + audio player)
- `sessionCoaching` progression cases (still keyed on `catalogExerciseId`)
- Ledger / history keys
- Home recommendation engine (workout **type**, not exercise list)

---

## 3. Existing UI surface audit

### 3.1 Surfaces that consume resolved workouts

| Surface | File(s) | What it reads | Fixed count / ID assumptions? |
|---------|---------|---------------|----------------------------------|
| Workout start / reorder | `WorkoutStartView.tsx` | title, description, duration; per exercise `id`, `name`, `sets`, `reps` | PPL: variable length OK. Full Body: treats list as main lifts; no reorder. Customization compared via `e.id` order. |
| PPL session | `WorkoutDeck` → `ExerciseCarousel` → `ExerciseCard` → `SetLogger` | `id`, `name`, `sets`; card loads catalog via `catalogExerciseId` for coaching mode / progression | Dynamic `N of M`. Slot IDs are opaque keys. |
| Full Body session | `FullBodyWorkoutFlow`, `FullBodySessionOverview` | `mainExercises`: `id`, `name` | Progress UI uses list length. Copy assumes **6 lifts** (`MAIN_LIFTS_TRANSITION` in `fullBodySessionPlan.ts`). Guided segments separate. |
| App wiring | `App.tsx` | `effectiveExercises` from session or `getWorkoutById`; rest from catalog | No hard count. Prefers session snapshot over live template. |
| Onboarding preview | `OnboardingFlow.tsx` | exercise **names** via `formatExerciseList`; Full Body shows `length` + “main lifts” | Same resolution path as start view. |
| Core standalone | `CoreView.tsx` | `id`, `name`, `sets`, `reps`, `primaryMuscles` | **Bug risk:** `getWorkoutById('core')` at **module import** — frozen snapshot, not reactive to template source later. |
| Workout cards | `WorkoutCard.tsx` | title, description, duration, `exercises.length` | Count badge only. |
| Post-workout summary | `workoutSummary.ts` | session logs + workout **title** | Uses logged names, not live template fields. |

### 3.2 Surfaces that do **not** depend on main-lift `Exercise[]`

- Guided audio player / chapter UI
- Mobility standalone list (`MobilityView` — separate data)
- Home “today / next 7 days” (activity types, not exercises)

---

## 4. Issues you need to be aware of

### 4.1 Critical — decide before coding Phase 2 defaults

| # | Issue | Why it matters | Decision |
|---|--------|----------------|----------|
| **A** | **Pull-ups ID / tier** | Catalog id is `pull_ups` (`coachingMode: bodyweight_reps`). A parent-spec table typo once suggested `pull_up` — **ignore; do not rename.** The real modeling question was whether bodyweight ⇒ `low_impact`. That conflates modality with intensity: pull-ups are a hard primary vertical pull. Putting them in `low_impact` would wrongly serve them as the “achy region” regression. Full Body default still needs an equipment fallback when the user has no bar. | **Locked:** keep id `pull_ups`. `movementPattern: 'vertical_pull'`, `loadTier: 'heavy'`, `difficulty: advanced` (or intermediate–advanced), `equipmentKeys` includes `pullup`. `loadTier` is **not** “barbell only” — bodyweight can be heavy. `low_impact` vertical pulls are assisted/TRX regressions. Default Full Body: use `pull_ups` if profile has `pullup`; otherwise fall back to another available `vertical_pull`. |
| **B** | **Default resolution vs `loadTier`** | Same class of bug as A if we treat parent-spec tables as gospel: those tables group **Heavy = barbell / Moderate = DB / Low impact = TRX**. That is an **equipment** layout, not a true load-tier model. Today’s Full Body default (squat, bench, pull-ups, RDL, OHP, chest-supported row) can all be legitimate `heavy` (or mostly heavy) primaries across different equipment — the issue is not “mixed tiers,” it’s “which specific exercise is the classic default for this slot.” Picking `getExercisesByPattern(pattern, 'heavy')[0]` will not reliably reproduce today’s list. | **Locked (model):** `loadTier` ≠ equipment. Barbell / DB / TRX / bodyweight are filtered via `equipmentKeys` (+ `coachingMode`). `loadTier` is the pain-regression ladder for a pattern (`heavy` → `moderate` → `low_impact`). **Locked (Phase 2 default source):** each `TemplateSlot` carries `defaultCatalogExerciseId` for parity with current templates; pools + tier filters are for recommend / fallback / manual build, not for inventing today’s defaults. |
| **C** | **Catalog equipment shape** | Profile already uses `EquipmentKey[]` for filtering. Exercise free-text (`'Barbell, bench'`) was display-only and never a second source of truth. Pattern-pool fallbacks need the same enum on catalog rows. | **Locked:** catalog stores `equipmentKeys?: EquipmentKey[]` (AND = all required; omit/empty = no gear required). Optional `equipmentLabel?: string` for display only — otherwise derive a label from keys. Profile `equipment` + `canBench` stay as-is; do not put `canBench` on catalog. |
| **D** | **History source ≠ pattern slots** | History returns an ordered list of past `catalogExerciseId`s, not “one per pattern.” Re-fitting into slots would change what “Your last session” means and isn’t needed for Phase 1–2. Full Body ledgers also store guided segment placeholders — those must not appear in the main-lifts template list. | **Locked:** `history` = **replay** ordered main exercises from the last completed session (ignore pattern structure). Full Body: exclude guided segment catalog ids (`warmup_segment` / `core_segment` / `mobility_segment`); segments stay on bindings. Product value of this source can be revisited later — do not build re-fit in Phase 1–2. |
| **E** | **Random source destroys structure** | `buildRandomExercises` shuffles a pool and renumbers `${category}-${n}`. Within-slot random is a later product change. | **Locked:** leave `random` as today (shuffle pool, renumber). Do not switch to within-slot random in Phase 1–2. |

### 4.2 High — UI / product copy traps

| # | Issue | Detail |
|---|--------|--------|
| **F** | **“6 exercises” hardcoded** | `fullBodySessionPlan.ts` subtitle assumes 6. If history returns ≠6, overview/copy lies. Phase 2 Full Body template should stay 6 slots; history path still can diverge. |
| **G** | **`FULL_BODY_MAIN_LIFT_SLOT_IDS` unused** | Exported constant, not wired. Don’t treat it as an invariant until TemplateSlot ids are the source of truth. |
| **H** | **Guided segments must stay out of the pool** | Warm-up / core / mobility use catalog ids `warmup_segment`, `core_segment`, `mobility_segment` and separate session logs (`isGuidedSegment`). Pattern pool is for **main lifts / PPL exercises only**. |
| **I** | **CoreView import-time snapshot** | Will keep serving stale core list after template changes unless fixed when you touch templates. Small fix when Phase 2 lands. |

### 4.3 Medium — content / catalog quality

| # | Issue | Detail |
|---|--------|--------|
| **J** | **New catalog rows need full coaching fields** | `ExerciseCard` shows “Unknown exercise” / weak coaching if `coachingMode` / `movementClass` missing. Phase 1 backfill of *new* TRX/DB/barbell rows must include those fields, not only `movementPattern`. |
| **K** | **Judgment-call classifications** | Tag = permission to fill a primary pattern slot (“could this be the only lift for that pattern today?”). Biomechanics-looking tags that fail the session-role test poison Phase 4 recommend. Classic Push can still hardcode pullover via `defaultCatalogExerciseId` even if catalog says accessory. | **Locked:** Face Pull → accessory `rear_delt`; Y-Fly → accessory `rear_delt`; Kneeling Rollout-to-Press → accessory `core`; Dumbbell Pullover → accessory (not primary `vertical_pull`; group TBD — extend `AccessoryGroup` with `lats`/`chest` or temporary park); TRX Pike → primary `vertical_push`, `low_impact`, `advanced`. Ongoing rule: session-role test when tagging new rows. |
| **L** | **Thin v1 pool vs full matrix** | Parent spec lists a large TRX/DB/barbell matrix. Thin v1 would only cover defaults + one alternate; full matrix is catalog content work (not a UI blocker) if new rows include coaching fields and K tags. | **Locked:** Phase 1 ships the **full** parent-spec matrix (TRX / barbell / DB tables), not a thin parity-only slice. Every new row gets `coachingMode` / `movementClass` / `equipmentKeys` / pattern tags (rich cues can stay placeholder). Apply B (`loadTier` ≠ equipment) and K (session-role) when backfilling. Defaults still use `defaultCatalogExerciseId` — fat catalog does not auto-change classic templates. |
| **M** | **Generator is a second hardcoded graph** | `workoutGeneratorService.ts` picks fixed `catalogId`s by equipment — a second graph beside templates. Leaving it alone works for UI parity; rewriting onto pattern + `equipmentKeys` + (later) `loadTier` is the shared resolver path recommend / build-my-own will want. | **Locked:** rewrite generator in Phase 2 to resolve slots via pattern pools + profile equipment (same substrate as defaults/fallbacks). Public API stays `Exercise[]` for `generated`. Prefer parity with today’s equipment picks where tests/fixtures care; acceptable if generated lists improve as pools fill. Do not leave a parallel hardcoded ID graph. |

### 4.4 Low — safe / already compatible

| # | Note |
|---|------|
| **N** | Moving `instructions` / `cues` / `commonMistakes` to catalog does not affect current UI (unused). |
| **O** | Moving display `equipment` to catalog does not affect current strength UI (unused on cards). |
| **P** | `catalogExerciseId` history/progression path already matches the parent-spec migration note. |
| **Q** | `audioGuideId` placeholder can land as optional — no behavior — fine for Phase 1. |

### 4.5 Legacy / identity footguns

| # | Issue | Detail |
|---|--------|--------|
| **R** | **Slot IDs are not stable across sources** | History/random renumber to `${category}-${index+1}`. Only `catalogExerciseId` is the real identity. Keep TemplateSlot ids for *default* templates and new sessions; don’t assume `push-3` always means OHP in old logs. |
| **S** | **`exerciseIdentity` / slot→catalog map** | Built from **static** `workouts.ts`. If static templates lose concrete catalog IDs, legacy log repair breaks unless you keep a frozen default map. |
| **T** | **Never introduce duplicate IDs** | Keep existing ids (`pull_ups`, etc.). Additive new exercises only; no rename/alias migrations. |

---

## 5. Proposed Phase 1–2 build plan (when you implement)

### Phase 1 — Catalog only (no UI change)

1. Add types: `MovementPattern`, `LoadTier`, `AccessoryGroup`, `Difficulty` on `CatalogExercise`.
2. Backfill **all existing** catalog rows with pattern tags (apply B + K).
3. Add the **full** parent-spec matrix (TRX / barbell / DB) as new rows — each with `coachingMode` / `movementClass` / `equipmentKeys` / pattern tags (rich cues placeholder OK).
4. Add helpers: `getExercisesByPattern`, `getExercisesByAccessoryGroup`.
5. Optional: move coaching text fields; `audioGuideId?: string`.
6. **Acceptance:** app boots; all current workouts still resolve; no unknown-catalog errors on defaults; matrix rows queryable by pattern/tier/group.

### Phase 2 — Template slots + resolver (UI unchanged)

1. Add `TemplateSlot` type; express Push/Pull/Leg/Core/Full Body as slot lists.
2. Per slot, store **compat default** `catalogExerciseId` (or resolve table) so `default` source matches today’s lists.
3. Implement resolve in `workoutTemplateService` (`static` / `default` path first).
4. Rewrite `workoutGeneratorService` to use the same pattern + equipment resolution (retire hardcoded catalog-ID graph).
5. Keep `getWorkoutById` → `Exercise[]` public API.
6. Preserve guided Full Body bindings untouched.
7. Fix `CoreView` to call `getWorkoutById` at render time (small drive-by).
8. **Acceptance:** default Full Body / Push / Pull / Leg / Core match today’s exercise names; history/generated/random still start and log; coaching still finds catalog rows; generated path no longer embeds a parallel ID list.

---

## 6. Decisions checklist (fill before Phase 2 coding)

- [x] **A** Pull-ups: keep `pull_ups`; `vertical_pull` + `loadTier: 'heavy'`; Full Body default equipment-gated with fallback *(locked)*
- [x] **B** `loadTier` ≠ equipment; Phase 2 defaults use per-slot `defaultCatalogExerciseId` *(locked)*
- [x] **C** Catalog `equipmentKeys` (+ optional label); profile enum unchanged *(locked)*
- [x] **D** History = replay ordered list (Full Body: main lifts only; skip guided segments); re-fit deferred *(locked)*
- [x] **E** Random = leave as today (shuffle pool); within-slot random deferred *(locked)*
- [x] **K** Face Pull / Y-Fly / Rollout-to-Press / pullover = accessory; Pike = primary `vertical_push` low_impact advanced *(locked)*
- [x] **L** Phase 1 = full parent-spec matrix (not thin parity-only); coaching fields + K tags required *(locked)*
- [x] **M** Generator rewritten onto pattern + equipment resolution in Phase 2 (no parallel hardcoded graph) *(locked)*

---

## 7. Suggested default answers (opinionated, for speed)

If you want to move fast without reopening every debate:

| Decision | Default |
|----------|---------|
| A | **Locked:** `pull_ups` → `vertical_pull` + `loadTier: 'heavy'` (+ advanced difficulty). Bodyweight ≠ `low_impact`. Full Body default uses `pull_ups` when `pullup` equipment is present; otherwise fall back to another `vertical_pull`. |
| B | **Locked:** three separate axes (see §7.1). Phase 2 `default` source uses `defaultCatalogExerciseId` per slot for parity — not “first heavy in pool.” |
| C | **Locked:** `equipmentKeys?: EquipmentKey[]` on catalog (filter); optional `equipmentLabel`; derive label if omitted. Free-text on `Exercise` is not authoritative. |
| D | **Locked:** History = replay (main lifts only for Full Body; skip guided segments). Re-fit / product rethink later. |
| E | **Locked:** Random = leave as today (shuffle pool). Within-slot random later. |
| K | **Locked:** Face Pull / Y-Fly / Rollout-to-Press / Pullover = accessory; Pike = primary `vertical_push` (`low_impact`, `advanced`). Session-role test for future tags. |
| L | **Locked:** Phase 1 = full matrix from parent-spec tables (with B + K). Coaching fields required; rich cues later. |
| M | **Locked:** Rewrite generator in Phase 2 onto pattern pools + equipment; keep `Exercise[]` API. |

### 7.1 Modeling note — three axes (do not collapse)

Parent-spec backfill tables (§1.2.1–1.2.3) currently read like:

| Table label | Implied meaning (wrong if treated as `loadTier`) |
|-------------|--------------------------------------------------|
| Heavy | Barbell |
| Moderate | Dumbbell |
| Low impact | TRX / bodyweight |

That is a **logic / mapping problem** if copied into `loadTier`. Use three independent axes instead:

| Axis | Answers | Examples |
|------|---------|----------|
| `loadTier` | Pain-regression ladder for a pattern when healthy → irritated | `heavy` = full primary; `moderate` = reduced demand; `low_impact` = joint-friendlier regression |
| `equipmentKeys` | What gear is required | `barbell`+`rack`, `dumbbells`, `trx`, `pullup` |
| `coachingMode` | How we log the set | `weighted` / `bodyweight_reps` / `time` |

**Rules:**

- Do **not** derive `loadTier` from equipment or `coachingMode`.
- Barbell back squat and pull-ups can both be `heavy`.
- A TRX assisted squat can be `low_impact` even though it’s also bodyweight-ish — because of **role in the ladder**, not because TRX = low impact by definition.
- Dumbbell chest-supported row may be `heavy` or `moderate` based on how demanding you treat it as a primary horizontal pull — **not** because “DB ⇒ moderate.”
- Parent-spec exercise matrices should be re-tagged against this model when Phase 1 backfill runs (treat table headers as draft buckets, not schema).

---

## 8. Related files (quick index)

| Area | Path |
|------|------|
| Catalog | `src/data/exerciseCatalog.ts` |
| Static templates | `src/data/workouts.ts` |
| Types | `src/types/workout.ts` |
| Resolution | `src/services/workoutTemplateService.ts` |
| Generator | `src/services/workoutGeneratorService.ts` |
| Session create | `src/hooks/useWorkoutLog.ts` |
| Identity / legacy | `src/services/exerciseIdentity.ts` |
| Full Body plan copy | `src/data/fullBodySessionPlan.ts` |
| Guided bindings | `src/data/guidedSegmentBindings.ts` |
| Parent product spec | `docs/movement-pattern-refactor-spec.md` |

---

## 9. Bottom line

**Yes — Phase 1–2 can maintain existing UI** if you treat `Exercise[]` as the stable contract and put pattern resolution behind `getWorkoutExercises` / `exerciseFromCatalog`.

The work is not “rewrite screens.” The work is:

1. Catalog tagging without renaming IDs  
2. Template slots with **compat defaults** so nothing looks different on day one  
3. Explicit choices on history/random/equipment/pull-ups so Phase 4–5 don’t paint you into a corner  

Use §6 as the gate before implementation.
