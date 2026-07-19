# Movement-Pattern Refactor & Feeling-Based Recommendations — Spec

## Product outcome

Today, a workout is a fixed list — Push, Pull, Leg, and Full Body each hardcode which exercise fills each slot. The goal of this work is to turn that into a flexible system with four user-facing capabilities:

1. **Create my own Push / Pull / Leg routine for the day** — browse exercises by movement pattern (and accessory group) and assemble the session manually, rather than being locked into the static default.
2. **Create my own Full Body routine** — same idea, across the six primary movement patterns (squat, hinge, horizontal push, horizontal pull, vertical push, vertical pull).
3. **Get a recommendation based on how I'm feeling** — a quick check-in (overall energy + how specific body regions feel) produces a session where load/volume and exercise selection are adjusted per pattern, instead of one generic template applied regardless of how the day actually feels.
4. **Save a combo I built as a routine** — once a custom session is assembled (manually or via recommendation), optionally save it so it's available again later instead of rebuilding from scratch each time.

None of these are possible today because the data model ties each template slot to one specific exercise (`push-3` is always `overhead_press`). Everything in this spec exists to remove that constraint: replace fixed slots with a **pool of exercises organized by movement pattern**, so any slot can resolve to *any* exercise that fits that pattern — picked by the user, by history, or by a recommendation engine reading a check-in.

The phases below are the technical path to that outcome, in dependency order. Phase 1 (catalog schema) unlocks everything else; the other phases build the pool, the check-in logic, the recommendation source, and the save flow on top of it.

## Context

Today, routines (`workouts.ts`) hardcode a specific `catalogExerciseId` per slot (e.g. `push-3` is always `overhead_press`). This works for static Push/Pull/Leg/Full Body templates, but it can't support:

- Building a custom combo per session by movement pattern
- Recommending exercises based on how a body part feels that day (e.g. swap squat to a low-impact variant if knees are achy)

This spec breaks the work into five ordered phases. Each phase depends on the one before it — do not skip ahead.

**Reference docs:** `13-exercises-routines-storage.md`, `exerciseCatalog.ts`, `workouts.ts` (existing architecture — read these first if unfamiliar with the codebase).

---



## Phase 1 — Catalog schema changes

**File:** `src/data/exerciseCatalog.ts`

This is the foundation. Nothing else in this spec works without it.

### 1.1 New fields on `CatalogExercise`

```typescript
export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'accessory'

export type LoadTier = 'heavy' | 'moderate' | 'low_impact'

export type AccessoryGroup =
  | 'biceps'
  | 'triceps'
  | 'rear_delt'
  | 'calves'
  | 'core'
  | 'forearms'
  // extend as needed

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface CatalogExercise {
  id: string
  name: string
  coachingMode: CoachingMode
  movementClass?: MovementClass          // existing — keep, drives rep ranges/rest
  weightIncrementLbs?: number
  restSeconds?: number

  // NEW
  movementPattern: MovementPattern       // required on every entry going forward
  loadTier?: LoadTier                    // required if movementPattern !== 'accessory'
  accessoryGroup?: AccessoryGroup        // required if movementPattern === 'accessory'
  equipment?: string                     // moved here from workouts.ts createExercise()
  difficulty?: Difficulty                // recommended on every entry — see rationale below
}
```

`loadTier` **and** `difficulty` **are two different axes, not one.** `loadTier` answers "how much weight" — that scales fairly continuously, so a barbell lift being `heavy` doesn't itself say much about how hard the movement is to execute well. `difficulty` answers "how much skill/coordination" — and that varies within every tier, not just `low_impact`:

- **Within** `heavy`**:** Barbell Back Squat carries real technical demand (bar path, bracing, depth) that a straightforward `heavy`-tier tag doesn't capture — a beginner shouldn't be handed it by default just because their check-in came back "good to go."
- **Within** `moderate`**:** Single-Arm DB Row requires meaningfully more balance and anti-rotation control than Chest-Supported Row, despite both being dumbbell/`moderate` tier.
- **Load and difficulty can point opposite directions:** Barbell Hip Thrust is heavy-loaded but relatively low-skill; TRX Pistol Squat is bodyweight (`low_impact`) but genuinely advanced.

TRX (1.2.1) is where the *range* is most extreme within a single tier, which is why it was the first place this became obvious — but the underlying axis applies everywhere. Recommend populating `difficulty` on every catalog entry, not just `low_impact` ones, so the recommendation engine (Phase 3/4) can eventually filter on skill level independently of load — e.g. respecting a user's experience level, not just their check-in tier.

**Rules:**

- `movementPattern` is required on every catalog entry (including accessories — tag them `'accessory'`).
- `loadTier` is required for the 6 primary patterns, omitted/irrelevant for accessories.
- `accessoryGroup` is required when `movementPattern === 'accessory'`, omitted otherwise.
- `equipment` was previously only on `workouts.ts` `Exercise` objects — it's exercise identity, not routine identity, so move it to the catalog. `Exercise.equipment` in `workouts.ts` can be dropped or left as a display override (TBD in Phase 2).



### 1.2 Backfill existing entries

Every current entry in `exerciseCatalog` needs `movementPattern` (and `loadTier` or `accessoryGroup`) added. Suggested mapping based on current names — **verify against actual biomechanics, don't just pattern-match names**:


| Pattern           | Heavy (barbell) | Moderate (dumbbell) | Low impact (TRX/bodyweight) |
| ----------------- | --------------- | ------------------- | --------------------------- |
| `squat`           | see 1.2.2       | see 1.2.3           | see 1.2.1                   |
| `hinge`           | see 1.2.2       | see 1.2.3           | see 1.2.1                   |
| `horizontal_push` | see 1.2.2       | see 1.2.3           | see 1.2.1                   |
| `horizontal_pull` | see 1.2.2       | see 1.2.3           | see 1.2.1                   |
| `vertical_push`   | see 1.2.2       | see 1.2.3           | see 1.2.1                   |
| `vertical_pull`   | see 1.2.2       | see 1.2.3           | see 1.2.1                   |


Everything else (`lateral_raises`, `barbell_curls`, `standing_calf_raise`, core/mobility entries, etc.) → `movementPattern: 'accessory'` with an appropriate `accessoryGroup`.

### 1.2.1 Low-impact (TRX) tier — full backfill

TRX naturally produces a *range* of difficulty within the same pattern rather than one fixed variant, so this tier needs the `difficulty` field to be usable (see 1.1) — a beginner and an advanced entry under the same pattern/tier are not interchangeable the way two `heavy`-tier barbell lifts roughly are.

**Existing catalog IDs to reconcile:** `trx_pistol_squat` doesn't exist yet (flagged as a gap in the prior draft of this spec — filled below). `trx_pike` and `trx_tricep_extension` already exist and just need `movementPattern`/`difficulty` added, not new rows.


| Pattern           | Exercise                         | Suggested id                      | Difficulty            | Notes |
| ----------------- | -------------------------------- | --------------------------------- | --------------------- | ----- |
| `squat`           | TRX Assisted Squat               | `trx_assisted_squat`              | beginner              |       |
| `squat`           | TRX Crossing/Curtsy Lunge        | `trx_curtsy_lunge`                | intermediate          |       |
| `squat`           | TRX Jump Squat                   | `trx_jump_squat`                  | intermediate          |       |
| `squat`           | TRX Pistol Squat                 | `trx_pistol_squat`                | advanced              |       |
| `squat`           | TRX Bulgarian Split Squat        | `trx_bulgarian_split_squat`       | advanced              |       |
| `hinge`           | TRX Hip Press / Glute Bridge     | `trx_hip_press`                   | beginner              |       |
| `hinge`           | TRX Hamstring Curl               | `trx_hamstring_curl`              | intermediate          |       |
| `hinge`           | TRX Single-Leg RDL               | `trx_single_leg_rdl`              | intermediate          |       |
| `hinge`           | TRX Suspended Single-Leg Hinge   | `trx_suspended_hinge`             | advanced              |       |
| `horizontal_push` | TRX Chest Press                  | `trx_chest_press`                 | beginner              |       |
| `horizontal_push` | TRX Chest Fly                    | `trx_chest_fly`                   | intermediate          |       |
| `horizontal_push` | TRX Clock Press                  | `trx_clock_press`                 | advanced              |       |
| `horizontal_push` | TRX Atomic Push-up               | `trx_atomic_pushup`               | advanced              |       |
| `horizontal_pull` | TRX Inverted Row                 | `trx_rows` (existing)             | beginner              |       |
| `horizontal_pull` | TRX Single-Arm Row               | `trx_single_arm_row`              | intermediate          |       |
| `horizontal_pull` | TRX Power Pull                   | `trx_power_pull`                  | advanced              |       |
| `horizontal_pull` | TRX Face Pull                    | `trx_face_pull`                   | intermediate          |       |
| `vertical_push`   | TRX Pike Press                   | `trx_pike` (existing)             | advanced              |       |
| `vertical_push`   | TRX Triceps Press / Skullcrusher | `trx_tricep_extension` (existing) | beginner–intermediate |       |
| `vertical_push`   | TRX Kneeling Rollout-to-Press    | `trx_rollout_press`               | intermediate          |       |
| `vertical_pull`   | TRX Kneeling Lat Pulldown        | `trx_kneeling_lat_pulldown`       | beginner              |       |
| `vertical_pull`   | TRX Assisted Pull-up             | `trx_assisted_pull_up`            | intermediate          |       |
| `vertical_pull`   | TRX Y-Fly                        | `trx_y_fly`                       | intermediate          |       |
| `vertical_pull`   | TRX Alligator / W-Pull           | `trx_alligator_pull`              | advanced              |       |


**Three entries above are flagged as judgment calls, not settled decisions:** Face Pull, Kneeling Rollout-to-Press, and Y-Fly all appear in the source library under a primary pattern, but read more like accessory/isolation movements than exercises that should anchor a full-body pattern slot. Recommend accessory classification for all three, but confirm before implementing — reclassifying them later as primary-pattern entries would change what the recommendation engine (Phase 3/4) is allowed to serve up as someone's *only* vertical push or pull for the day, which matters more than it would for a normal accessory swap.

### 1.2.2 Heavy (barbell) tier — full backfill


| Pattern           | Exercise                    | Suggested id                           | Difficulty            | Notes                                   |
| ----------------- | --------------------------- | -------------------------------------- | --------------------- | --------------------------------------- |
| `squat`           | Barbell Back Squat          | `barbell_back_squat` (existing)        | intermediate–advanced |                                         |
| `squat`           | Barbell Front Squat         | `barbell_front_squat`                  | advanced              |                                         |
| `squat`           | Box Squat                   | `box_squat`                            | intermediate          |                                         |
| `hinge`           | Romanian Deadlift           | `barbell_romanian_deadlift` (existing) | intermediate          |                                         |
| `hinge`           | Conventional Deadlift       | `barbell_conventional_deadlift`        | advanced              |                                         |
| `hinge`           | Barbell Hip Thrust          | `barbell_hip_thrust` (existing)        | beginner–intermediate |                                         |
| `horizontal_push` | Barbell Bench Press         | `barbell_bench_press` (existing)       | intermediate          |                                         |
| `horizontal_push` | Incline Barbell Bench Press | `inclined_barbell_press` (existing)    | intermediate          |                                         |
| `horizontal_push` | Floor Press                 | `barbell_floor_press` (existing)       | intermediate          |                                         |
| `horizontal_pull` | Bent-Over Barbell Row       | `barbell_rows` (existing)              | intermediate–advanced |                                         |
| `horizontal_pull` | Pendlay Row                 | `pendlay_row`                          | advanced              |                                         |
| `horizontal_pull` | T-Bar Row                   | `t_bar_row`                            | intermediate          |                                         |
| `vertical_push`   | Standing Overhead Press     | `overhead_press` (existing)            | intermediate–advanced |                                         |
| `vertical_push`   | Push Press                  | `push_press`                           | advanced              |                                         |
| `vertical_pull`   | Barbell High Pull           | `barbell_high_pull`                    | advanced              |                                         |
| `vertical_pull`   | Pull ups                    | `pull_up`                              | advanced              | note it is body weight . Let us discuss |




### 1.2.3 Moderate (dumbbell) tier — full backfill


| Pattern           | Exercise                           | Suggested id                          | Difficulty            | Notes |
| ----------------- | ---------------------------------- | ------------------------------------- | --------------------- | ----- |
| `squat`           | Goblet Squat                       | `goblet_squat` (existing)             | beginner              |       |
| `squat`           | Dumbbell Bulgarian Split Squat     | `dumbbell_bulgarian_split_squat`      | advanced              |       |
| `squat`           | Dumbbell Lunges                    | `dumbbell_lunges`                     | intermediate          |       |
| `hinge`           | Dumbbell Romanian Deadlift         | `dumbbell_romanian_deadlift`          | intermediate          |       |
| `hinge`           | Dumbbell Single-Leg RDL            | `dumbbell_single_leg_rdl`             | advanced              |       |
| `hinge`           | Dumbbell Swing                     | `dumbbell_swing`                      | intermediate          |       |
| `horizontal_push` | Dumbbell Flat Bench Press          | `dumbbell_flat_press` (existing)      | beginner              |       |
| `horizontal_push` | Dumbbell Incline Press             | `dumbbell_incline_press` (existing)   | beginner–intermediate |       |
| `horizontal_push` | Dumbbell Floor Press               | `dumbbell_floor_press`                | beginner              |       |
| `horizontal_pull` | Single-Arm Dumbbell Row            | `single_dumbbell_arm_rows` (existing) | intermediate          |       |
| `horizontal_pull` | Chest-Supported Dumbbell Row       | `chest_supported_row` (existing)      | beginner              |       |
| `horizontal_pull` | Dumbbell Renegade Row              | `dumbbell_renegade_row`               | advanced              |       |
| `vertical_push`   | Seated Dumbbell Shoulder Press     | `seated_dumbbell_shoulder_press`      | beginner–intermediate |       |
| `vertical_push`   | Arnold Press                       | `arnold_press`                        | intermediate          |       |
| `vertical_push`   | Standing Single-Arm Dumbbell Press | `standing_single_arm_db_press`        | advanced              |       |
| `vertical_pull`   | Dumbbell Pullover                  | `dumbbell_pullover` (existing)        | beginner–intermediate |       |




### 1.3 Designed for growth: adding exercises should stay cheap

The catalog will keep growing after this refactor ships — new exercises, plus richer coaching content per exercise (cues, common mistakes, progression targets) over time. Two implications worth deciding now, even though the full coaching-content buildout is a later project:

- `Exercise` in `workouts.ts` already has `instructions` / `cues` / `commonMistakes` fields (currently boilerplate placeholder text). These describe the *movement*, not the template slot, and today get duplicated if the same exercise appears in multiple routines. Worth moving them onto `CatalogExercise` instead — one place to fill in real coaching content per exercise, and Phase 2's `TemplateSlot` no longer needs to carry them at all.
- Adding a new exercise should never require touching template or routine logic — only adding one row to `exerciseCatalog` with the right `movementPattern` / `loadTier` / `accessoryGroup`. This is already true structurally once Phase 2 lands, since the pool is queried by pattern rather than enumerating specific IDs — flagging it here as a constraint to protect through implementation, not something to re-derive later if it starts slipping.



### 1.4 This catalog is the substrate a future audio-guide spec will read from

Separate conversation, separate spec — but worth being explicit here about what this catalog needs to guarantee so that future spec doesn't have to duplicate work or invent its own categorization.

**What the audio-guide system will likely need from this catalog, once it exists:**

- Stable `id` per exercise (already true today — `catalogExerciseId` is the anchor for history/ledger, and would be the same anchor for audio content)
- `movementPattern` / `loadTier` / `difficulty` (this spec) — to know *which* exercise is playing and roughly how it should be cued (a beginner TRX assisted squat needs different pacing/cueing than an advanced pistol squat)
- Timing defaults already in the catalog today — `getDefaultRestSeconds()`, `REP_RANGES` via `movementClass` — so audio segment length/pacing can be derived from data that already exists rather than re-specified
- Some structured place to hang audio content per exercise — likely more than the single `audioGuideId?: string` placeholder below, since "right timing, cues, rest times, everything" implies multiple segments per exercise (setup/intro, per-set work cues, rest transitions), not one asset. That structure is this spec's placeholder only — the real shape should be defined in the audio-guide spec itself, informed by whether that system ends up curated/pre-rendered (today's BusyDad Gym approach) or dynamically composed per session.

**What this spec commits to now, without overbuilding:**

```typescript
export interface CatalogExercise {
  ...
  audioGuideId?: string   // placeholder pointer; the audio-guide spec will likely replace this with a richer structure once its own architecture (curated vs. dynamic) is decided
}
```

No behavior change here — tier resolution (Phase 3/4) still just returns a `catalogExerciseId`. This field exists so the two specs have an agreed contract point (the catalog `id`) to build against, without this spec trying to design the audio system it isn't scoped to solve.

### 1.5 New catalog query helpers

```typescript
export function getExercisesByPattern(pattern: MovementPattern, tier?: LoadTier): CatalogExercise[]
export function getExercisesByAccessoryGroup(group: AccessoryGroup): CatalogExercise[]
```

---



## Phase 2 — Movement-pattern pool (replaces hardcoded slots)

**Files:** `src/data/workouts.ts`, `src/types/workout.ts`

### 2.1 Template shape changes

Static templates stop hardcoding `catalogExerciseId` per slot. Replace with pattern/group references:

```typescript
interface TemplateSlot {
  id: string                              // e.g. 'full_body-1' — stays for backward compat with ExerciseLog
  slotType: 'pattern' | 'accessory'
  movementPattern?: MovementPattern       // if slotType === 'pattern'
  accessoryGroup?: AccessoryGroup         // if slotType === 'accessory'
  sets: string
  reps: string                            // display only, as today
  suggestedRestSeconds: number
}
```

- **Full Body**: exactly 6 `pattern` slots — one per primary movement pattern.
- **Push/Pull/Leg**: mix of `pattern` slots (primary lifts) and `accessory` slots (curls, lateral raises, calf raises, core work) — accessories are browsable by group, not gated by check-in tier.



### 2.2 Slot resolution

A `TemplateSlot` resolves to a specific `catalogExerciseId` at session-build time via one of:

- Manual pick (Phase 5 — user browses the pool filtered by pattern/group)
- Recommendation engine (Phase 4 — filtered by check-in tier output)
- Existing sources (`history`, `default`, `generated`, `random`) — these still need a **default resolution rule** per pattern slot (e.g. `default` source picks the `heavy` tier for that pattern unless otherwise specified) so existing template sources keep working without a check-in.

**Migration note:** existing `ExerciseLog` history keys on `catalogExerciseId`, which doesn't change — history and progression coaching are unaffected by this refactor.

---



## Phase 3 — Check-in logic

**New file suggestion:** `src/services/checkInService.ts`

### 3.1 Data model

```typescript
type GlobalFeeling = 'good' | 'meh' | 'beat_up' | 'skip'

type RegionStatus = 'fine' | 'sore' | 'stiff' | 'achy'

type BodyRegion =
  | 'knees'
  | 'hips'
  | 'lower_back'
  | 'front_shoulder'
  | 'upper_back'
  | 'elbows_wrists'

interface CheckIn {
  global: GlobalFeeling
  regions: Record<BodyRegion, RegionStatus>
}
```



### 3.2 Region → pattern mapping

```typescript
const REGION_TO_PATTERNS: Record<BodyRegion, MovementPattern[]> = {
  knees: ['squat'],
  hips: ['squat', 'hinge'],
  lower_back: ['hinge'],
  front_shoulder: ['horizontal_push', 'vertical_push'],
  upper_back: ['horizontal_pull', 'vertical_pull'],
  elbows_wrists: ['horizontal_push', 'horizontal_pull'],
}
```



### 3.3 Two independent tiers, not one

**Resolved per the discussion that produced this spec:** fatigue and pain are different axes and shouldn't be merged into a single tier. This section replaces the earlier merged-tier draft.

- `LoadTier` (`heavy` / `moderate` / `low_impact`) — **which exercise** gets picked for a pattern. Driven **only** by region (pain) status. Global feeling never touches this.
- `VolumeTier` (`full` / `reduced` / `minimal`) — **how much** of that exercise (sets, and a load discount on top of the existing progression suggestion). Driven by global feeling, with a per-pattern reduction if a *specific* region is flagged `sore` (localized muscular fatigue, not pain — see the fatigue-vs-pain distinction from the earlier design discussion).

This means a "beat up" day with no pain still does the same barbell exercises as any other day — just fewer sets, at a lighter suggested weight. A "good to go" day with an achy knee still swaps the squat to a TRX variant, at full volume everywhere else. The two dials genuinely don't interact.

```typescript
// ---- LoadTier: pain axis only ----

function resolveLoadTier(
  pattern: MovementPattern,
  regions: Record<BodyRegion, RegionStatus>,
): LoadTier {
  const gatingRegions = Object.entries(REGION_TO_PATTERNS)
    .filter(([, patterns]) => patterns.includes(pattern))
    .map(([region]) => region as BodyRegion)

  let tier: LoadTier = 'heavy'   // default — no pain signal means no reason to downgrade
  for (const region of gatingRegions) {
    const status = regions[region]
    if (status === 'achy') tier = 'low_impact'                          // hard floor, overrides everything
    else if (status === 'stiff' && tier !== 'low_impact') tier = 'moderate'
    // 'sore' and 'fine' have no effect on LoadTier — sore is fatigue, handled below
  }
  return tier
}

// ---- VolumeTier: fatigue axis only ----

const GLOBAL_VOLUME_TIER: Record<Exclude<GlobalFeeling, 'skip'>, VolumeTier> = {
  good: 'full',
  meh: 'reduced',
  beat_up: 'minimal',
}

const VOLUME_ORDER: VolumeTier[] = ['full', 'reduced', 'minimal']

function resolveVolumeTier(
  pattern: MovementPattern,
  global: Exclude<GlobalFeeling, 'skip'>,
  regions: Record<BodyRegion, RegionStatus>,
): VolumeTier {
  const gatingRegions = Object.entries(REGION_TO_PATTERNS)
    .filter(([, patterns]) => patterns.includes(pattern))
    .map(([region]) => region as BodyRegion)

  let tier = GLOBAL_VOLUME_TIER[global]
  for (const region of gatingRegions) {
    if (regions[region] === 'sore') {
      // localized fatigue drops this pattern's volume one further tier than the session baseline
      tier = VOLUME_ORDER[Math.min(VOLUME_ORDER.indexOf(tier) + 1, 2)]
    }
  }
  return tier
}
```



### 3.4 VolumeTier → actual sets/weight

```typescript
type VolumeTier = 'full' | 'reduced' | 'minimal'

const VOLUME_SET_COUNT: Record<VolumeTier, (templateSets: number) => number> = {
  full: (s) => s,
  reduced: (s) => Math.max(1, s - 1),
  minimal: () => 1,
}

const VOLUME_LOAD_FACTOR: Record<VolumeTier, number> = {
  full: 1.0,
  reduced: 0.9,
  minimal: 0.75,
}
```

`VOLUME_LOAD_FACTOR` is applied **on top of** the existing `getProgressionRecommendation()` output from `sessionCoaching.ts` — it doesn't replace or duplicate the progression case logic (cases 1–5 stay exactly as they are today). This is additive: `suggestedWeightLbs * VOLUME_LOAD_FACTOR[volumeTier]`, rounded to the nearest `weightIncrementLbs`, and **only applied for** `recommended`**-source sessions** — manually built or default/history/generated sessions are unaffected.

### 3.5 Skip case

`global: 'skip'` (sick / sharp pain) → no session offered, short-circuit before any pattern resolution.

---



## Phase 4 — New template source: `recommended`

**File:** `src/services/workoutTemplateService.ts`

### 4.1 Add to source union

```typescript
type TemplateSource = 'history' | 'default' | 'generated' | 'random' | 'recommended'
```



### 4.2 New resolver

```typescript
function getExercisesForRecommendedSource(
  category: WorkoutCategory,
  checkIn: CheckIn,
): Exercise[] {
  // For each pattern slot in the category's template shape:
  //   1. loadTier = resolveLoadTier(pattern, checkIn.regions)
  //   2. volumeTier = resolveVolumeTier(pattern, checkIn.global, checkIn.regions)
  //   3. getExercisesByPattern(pattern, loadTier) -> pick one (first, or rotate/history-aware pick)
  //   4. sets = VOLUME_SET_COUNT[volumeTier](templateDefaultSets)
  //   5. at session-coaching time, suggestedWeightLbs *= VOLUME_LOAD_FACTOR[volumeTier] (see 3.4)
  // Accessory slots: unaffected by check-in, resolve via existing default/random logic
}
```



### 4.3 Persistence rule

Sessions built via `recommended` are **always one-off**:

- Logged through the normal draft → ledger pipeline (`catalogExerciseId` frozen at session start, same as today)
- **Never** written to `profile.templateSources[category]`
- Not eligible for the "save as routine" prompt (Phase 5) — today's tiers reflect today's check-in and shouldn't become tomorrow's default

---



## Phase 5 — "Build my own" + save flow



### 5.1 Manual build

Same pattern-slot structure as Phase 4, but the user picks from `getExercisesByPattern()` / `getExercisesByAccessoryGroup()` per slot instead of the engine picking. No check-in involved.

### 5.2 Save prompt

After a **manually-built** session (not recommended — see 4.3): prompt "Save this as a routine?"

- **Yes** → write to `savedRoutines` (Phase 6 schema)
- **No** → session still logs normally via existing draft/ledger pipeline; `templateSources` untouched

---



## Phase 6 — Saved routines schema (data-only, no UI yet)

**File:** `src/types/userProfile.ts`

```typescript
interface SavedRoutine {
  id: string                    // uuid
  category: WorkoutCategory
  name?: string                 // optional — UI can default to category label if unset
  slots: {
    slotType: 'pattern' | 'accessory'
    movementPattern?: MovementPattern
    accessoryGroup?: AccessoryGroup
    catalogExerciseId: string
  }[]
  createdAt: string
  source: 'manual' | 'recommended'   // track even though 'recommended' isn't save-able yet — costs nothing now, useful later
}
```

Add to `UserProfile`:

```typescript
savedRoutines: SavedRoutine[]
```

**Deliberately a list, not a singular overwritable field** (e.g. not `templateSources[category] = 'custom'`) — avoids a future migration if/when the UI grows to support multiple named routines per category (e.g. "Push A" / "Push B"). The UI may initially only expose one save slot per category; the schema doesn't need to match that limitation.

**No resolution logic changes required in this phase** — `resolveTemplateSource()` doesn't need a `'custom'` branch yet. This phase is purely: give future work a place to write to and read from.

---



## Build order & dependencies

```
Phase 1 (catalog schema)
   │
   ▼
Phase 2 (pattern pool / template shape)
   │
   ├──▶ Phase 3 (check-in logic) ──▶ Phase 4 (recommended source)
   │
   └──▶ Phase 5 (manual build + save prompt)
              │
              ▼
        Phase 6 (saved routines schema — can land any time after Phase 2)
```

Phases 3 and 5 can be worked in parallel once Phase 2 lands. Phase 6 has no hard dependency beyond Phase 2 and can be done whenever convenient.

## Non-goals for this pass

- Saved-routines picker UI (multiple named routines per category)
- Recommended sessions being save-able
- Changes to `getLastExercisePerformance` / `sessionCoaching.ts` **progression case logic** (cases 1–5) — untouched, still keys on `catalogExerciseId`. Note: 3.4 adds an *additive* `VOLUME_LOAD_FACTOR` multiplier applied after `getProgressionRecommendation()` returns, for `recommended`-source sessions only — this is a new small integration point, not a change to the progression math itself.

