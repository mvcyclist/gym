# Content Foundation — Design (Review)

**Status:** Locked for review — design alignment complete, no implementation yet.

**Related docs:**

- [13-exercises-routines-storage.md](./13-exercises-routines-storage.md) — how exercises and routines work **today** (static files)
- Source spec: `12-content-foundation-service-spec_1.md` (Downloads)

**Scope:** Replace the static local-file exercise system (`exerciseCatalog.ts`, `workouts.ts`, `src/data/mobility.ts`) with Supabase-backed tables that an admin tool writes and the app reads. Existing catalog rows are **not auto-migrated** — tuned values from static files are used as a **seed reference** when populating new tables.

**Out of scope:** Session logs, drafts, ledger, and strength progression coaching (`sessionCoaching.ts`). Those key off `catalogExerciseId` slugs and stay unchanged.

---

## 1. Goals

1. Author and publish exercise + routine content outside the app codebase.
2. Preserve stable `catalogExerciseId` slugs so existing ledger history keeps working.
3. Support offline training via a persisted content snapshot (garage gym, unreliable network).
4. Unify five content pools (Strength, Mobility, Core, Cardio, Warm-up) in one table shape.
5. Fix mobility logging (per-exercise sessions, not duration-only).

---

## 2. Core decisions (locked)

| Decision | Choice |
|----------|--------|
| Exercise IDs | **Slugs** (`overhead_press`, `pull_ups`) — same as today's `catalogExerciseId` |
| Slug editability | Editable in **`draft` only**; **immutable from first `verified` publish** |
| Rep ranges | **`movement_class` → code lookup** (`REP_RANGES`) — not per-row in DB |
| Rest defaults | Same priority as today in code (`getDefaultRestSeconds`) — reads cached exercise row |
| Content pools | **One `exercises` table**, `category` column — not five tables |
| Routines | **Separate authored layer** — `routine_templates` + `routine_template_slots` |
| API (v1) | **Direct Supabase read** + `contentRepository` adapter boundary |
| Cache | **Persisted snapshot** (localStorage v1); sync getters preserved |
| Publish gate (exercises) | **"Mark as verified"** — no separate Publish button |
| Cues in app (v1) | **Not shown** — stored in admin for later |

---

## 3. Schema

### 3.1 `exercises`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text, PK | Slug |
| `name` | text | Display name; editable after verify |
| `category` | enum | `strength` \| `mobility` \| `core` \| `cardio` \| `warmup` |
| `status` | enum | `draft` \| `unpublished` \| `verified` \| **`archived`** |
| `movement_pattern` | enum, nullable | Squat / Hip hinge / Vertical push / Vertical pull / Horizontal push / Horizontal pull — Strength + applicable Core |
| `movement_class` | enum, nullable | `compound_upper` \| `compound_lower` \| `isolation_upper` \| `isolation_lower` — Strength; drives rep range + rest |
| `target_area` | text, nullable | Mobility equivalent (e.g. "Hips", "T-spine") |
| `equipment` | text[] | Free text tags; autocomplete in admin |
| `experience_level` | enum | Beginner / Intermediate / Advanced |
| `coaching_mode` | enum | `weighted` \| `bodyweight_reps` \| `time` |
| `dosage_type` | enum | `sets_reps` \| `hold_time` \| `duration` |
| `default_sets` | int, nullable | Fallback when slot has no `sets_override` |
| `rep_range_override` | text, nullable | Deviation from `movement_class` range |
| `hold_time_seconds` | int, nullable | Mobility / hold-based Core |
| `duration_minutes` | int, nullable | Cardio / Warm-up |
| `weight_increment_lbs` | numeric, nullable | Strength progression step |
| `rest_seconds_override` | int, nullable | Override → mode → class default (in code) |
| `cues` | jsonb | `{ text, reviewed }[]` — admin workflow; **not shown in app v1** |
| `caution_note` | text, nullable | Informational |
| `primary_muscles` | text[], nullable | Nullable at seed; grows over time |
| `instructions` | text, nullable | Long-form how-to |
| `common_mistakes` | text, nullable | Same growth model |
| `created_at`, `updated_at` | timestamptz | |

**Status semantics:**

| Status | Visible to app | Meaning |
|--------|----------------|---------|
| `draft` | No | Work in progress |
| `unpublished` | No | Authoring complete, not ready for users |
| `verified` | **Yes** | Live content |
| `archived` | No | Was live; soft-hidden; slug retained for history |

**Delete button (admin, one UI control):**

- `draft` / `unpublished` → **hard delete** (safe; nothing references yet)
- `verified` → **archive** (`status = archived`); slug and row remain for ledger/history

**Archived exercise + routine slots:**

- Slots **stay in DB** when an exercise is archived
- App **skips** slots whose exercise is not `verified` when building routines
- Admin fixes gaps at leisure

---

### 3.2 `routine_templates` + `routine_template_slots`

Routines are a **curated ordered list**, not a filter over the exercise pool.

| Table | Columns |
|-------|---------|
| `routine_templates` | `id` (e.g. `push`, `pull`, `leg`, `core`, `mobility`), `name`, `program_type` (`ppl` \| `full_body`), `created_at`, `updated_at` |
| `routine_template_slots` | `id`, `routine_template_id`, `position`, `exercise_id` (FK → `exercises.id`), `sets_override` (nullable), `rep_display_override` (nullable), `block_id` (nullable), `created_at`, `updated_at` |

**Routine template lifecycle:** **No status enum.** If slots resolve to `verified` exercises, the template is live. Admin edits apply on next content cache refresh.

**Slot fallbacks:**

- Sets: `sets_override` → exercise `default_sets` → app default (3)
- Rep display: `rep_display_override` → formatted range from `movement_class` (code)

**`block_id`:** Nullable column for future Full Body 4-week rotation. **Schema only in v1** — no rotation engine yet.

**v1 routine templates to seed:** `push`, `pull`, `leg`, `core`, `mobility` (from `workouts.ts` + `mobility.ts` reference).

---

### 3.3 `content_meta`

Single row (or small keyed table) for cache invalidation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | e.g. `global` |
| `version` | bigint or timestamptz | Monotonic; bumped by DB trigger |
| `updated_at` | timestamptz | |

App stores `contentVersion` in the local snapshot; polls `content_meta`; refetches full payload only when version changes.

**Trigger rules (conditional — not "any write"):**

| Target | Bump when |
|--------|-----------|
| **`exercises`** | Row transitions **→ `verified`** (Mark as verified = publish) |
| **`exercises`** | Row transitions **`verified` → `archived`** |
| **`exercises`** | Row **edited while `verified`** |
| **`exercises`** | Draft/unpublished-only edits → **no bump** |
| **`routine_templates`** | **Any write** |
| **`routine_template_slots`** | **Any write** |

Rationale: draft authoring must not spam client refetches for invisible changes. Routine tables have no draft lifecycle — every edit is immediately live.

---

### 3.4 Constants (code, not tables)

- `REP_RANGES` by `movement_class` (unchanged)
- `getDefaultRestSeconds()` priority (unchanged; reads cached exercise)
- `parseTemplateSetCount()` (unchanged)

---

### 3.5 RLS

| Actor | Access |
|-------|--------|
| **App (anon)** | Read `verified` exercises; read routine templates + slots (app skips non-verified slot exercises at resolve time) |
| **App (authenticated)** | Same content read; workouts/sessions still require sign-in |
| **Admin** | Read/write all rows, all statuses |

**Auth model:** Content prefetch can happen **before sign-in** (anon read). Starting/logging workouts requires **sign-in** (unchanged app gate).

---

## 4. API & cache strategy

### 4.1 Data access (v1)

```
Supabase (exercises, routines, content_meta)
        ↓
supabaseContentStorage.ts   (adapter — matches profile/ledger pattern)
        ↓
contentRepository.ts        (hydrate, refresh, version check)
        ↓
exerciseCatalog.ts          (sync getters over in-memory cache)
workoutTemplateService.ts   (default source → routine cache)
```

No REST/Edge Function layer in v1. Repository boundary allows a future swap without UI changes.

### 4.2 Snapshot shape

Persist to **localStorage v1** (migrate to IndexedDB only if size becomes an issue):

```typescript
{
  contentVersion: number | string,
  fetchedAt: string,
  exercises: CatalogExercise[],      // all verified, all categories
  routineTemplates: RoutineTemplate[],
  routineSlots: RoutineTemplateSlot[],
}
```

Sync exports (`getCatalogExerciseById`, etc.) read from this cache — **not** async per call site.

### 4.3 First launch & offline

| Scenario | Behavior |
|----------|----------|
| **First launch, empty cache** | **Blocking shell** until fetch succeeds |
| **Fetch failure** | "Couldn't load content — **Retry**" — **no bundled fallback** |
| **Subsequent launches** | Serve from snapshot immediately; background version check + refetch if stale |
| **Offline with snapshot** | Full content available from last fetch |

Loading state lives at **app shell**, not per-card spinners.

---

## 5. Template sources (v1)

| Workout type | Sources in v1 |
|--------------|---------------|
| **Push / Pull / Leg / Core** | `history`, `default`, `generated`, `random` (unchanged logic) |
| **Default source** | **`routine_templates` + slots** (replaces `workouts.ts`) |
| **Generated source** | Same hardcoded slot rules in `workoutGeneratorService.ts`; pool from Supabase |
| **Mobility** | **`default` only** — authored mobility routine template; no history/generated/random |

---

## 6. Mobility (v1)

### Today

- Static list: `src/data/mobility.ts` (`mob-1`, …)
- `MobilityView.tsx` — display only
- Logs one **duration** via `appendManualActivity` — no per-exercise history

### Target

| Aspect | Decision |
|--------|----------|
| Content | `category = mobility` rows + **mobility routine template** |
| UI | Checklist — mark exercises complete with hold time or reps |
| Persistence | **`WorkoutSession`** with `workoutType: 'mobility'`; same ledger + Supabase sync as strength |
| Identity | `catalogExerciseId` slugs on each `ExerciseLog` |
| Template sources | Default routine only (v1) |

**Implication:** `useWorkoutLog`, session types, and `MobilityView` **do change** — not "explicitly untouched."

Deferred: mobility history source, audio narration (Phase 5).

---

## 7. Category seed scope (v1)

| Category | Schema | Seed in v1 | Rationale |
|----------|--------|------------|-----------|
| **Strength** | Yes | **Yes** — full seed from static reference | Core app experience |
| **Core** | Yes | **Yes** | Part of PPL |
| **Mobility** | Yes | **Yes** — exercises + routine template | New session model |
| **Cardio** | Yes | **Yes — minimal set** | Swim/Bike/Walk logging UI already exists |
| **Warm-up** | Yes | **Opportunistic** — no completeness requirement | No consuming UI yet (Phase 3/5) |

All five categories exist in the enum from day one — no artificial restriction.

---

## 8. Call sites

### 8.1 Changes

| File | Current | Target |
|------|---------|--------|
| `src/data/exerciseCatalog.ts` | Static array + sync helpers | Cache layer over **all verified exercises** |
| `src/data/workouts.ts` | Hard-coded PPL/Core | **Retired** |
| `src/data/mobility.ts` | Static mobility list | **Retired** |
| `src/services/workoutTemplateService.ts` | Default reads `workouts.ts` | Default reads **routine cache** (templates + slots) |
| `src/services/workoutGeneratorService.ts` | Pool from static catalog | Pool from **Supabase cache**; rules unchanged |
| `src/services/contentRepository.ts` | — | **New** — snapshot hydrate/refresh |
| `src/adapters/supabaseContentStorage.ts` | — | **New** — Supabase fetch |
| `src/components/MobilityView.tsx` | Display + duration log | Checklist + **mobility WorkoutSession** |
| `src/App.tsx` | Mobility → manual activity | Mobility → session start/complete flow |
| `ExerciseCard`, `SetLogger`, `App.tsx` (rest) | Sync catalog getters | Same signatures; cache-backed |

### 8.2 Mostly untouched (strength)

| File | Why |
|------|-----|
| `sessionCoaching.ts` | Ledger-based suggested weight |
| `exerciseIdentity.ts` | Slug resolution |
| Draft/ledger adapters | User data, not content |
| `exerciseHistoryService.ts` | Reads ledger, not catalog files |

---

## 9. Build sequence

```
Phase A — Database
  1. exercises + routine_templates + routine_template_slots + content_meta
  2. RLS (anon read verified content; admin write)
  3. Conditional content_meta trigger

Phase B — Admin tool
  4. Exercise authoring (all categories)
  5. Routine authoring (PPL + core + mobility)
  6. Mark as verified gate (cues reviewed — admin workflow)
  7. Seed: strength, core, PPL routines, mobility routine, minimal cardio
     (warm-up opportunistic)

Phase C — App content layer
  8. contentRepository + supabaseContentStorage + localStorage snapshot
  9. ContentProvider / blocking shell + retry
 10. Swap exerciseCatalog.ts internals (test: coaching, rest, rep range)

Phase D — Template resolution (one step at a time, test between each)
 11. workoutTemplateService default → routine cache; retire workouts.ts
 12. workoutGeneratorService → Supabase pool
 13. Mobility: WorkoutSession type + MobilityView checklist + ledger sync

Phase E — Later
 14. Full Body rotation (block_id engine)
 15. Cues in session UI
 16. Warm-up consuming UI
 17. Mobility history/generated sources
 18. IndexedDB if snapshot size requires it
 19. Equipment-specific generated routine templates (same slot schema)
```

Steps 10–13 are highest risk — do not batch.

---

## 10. Resolved decision log

| # | Topic | Decision |
|---|--------|----------|
| 1 | Routines | `routine_templates` + `routine_template_slots` |
| 2 | API | Direct Supabase + repository boundary |
| 3 | Cache | Persisted snapshot; sync signatures |
| 4 | Mobility logging | Per-exercise `WorkoutSession`, now |
| 5 | Exercise delete (verified) | **`archived`** status; slug kept |
| 6 | Archived + slots | Skip at runtime; slots remain in DB |
| 7 | Routine template status | None — live when slots resolve |
| 8 | Cache invalidation | `content_meta` + conditional DB trigger |
| 9 | Snapshot storage | localStorage v1 |
| 10 | Full Body | `block_id` schema only in v1 |
| 11 | Mobility sources | Default template only |
| 12 | First launch | Blocking shell + retry; no fallback bundle |
| 13 | Content auth | Anon read; sign-in for workouts |
| 14 | Cues UI | Not shown v1 |
| 15 | Generator | Same rules; Supabase pool |
| 16 | Publish | Mark as verified = publish; no separate button |
| 17 | Cardio seed | Minimal set now (UI exists) |
| 18 | Warm-up seed | Schema yes; seed opportunistic |

---

## 11. Architecture diagram

```
┌─────────────────┐         ┌──────────────────────────────┐
│   Admin tool    │ write   │         Supabase             │
│  (single user)  │────────▶│  exercises                   │
└─────────────────┘         │  routine_templates           │
                            │  routine_template_slots      │
                            │  content_meta  ◀── trigger   │
                            └──────────────┬───────────────┘
                                           │ anon read (verified)
                                           ▼
                            ┌──────────────────────────────┐
                            │  contentRepository           │
                            │  localStorage snapshot       │
                            └──────────────┬───────────────┘
                                           │ sync getters
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
   workoutTemplateService          exerciseCatalog.ts            MobilityView
   (default → routines)            (coaching, rest, reps)        (mobility session)
              │                            │
              └────────────┬───────────────┘
                           ▼
                  Strength WorkoutSession
                  (draft → ledger → Supabase)
                           │
                           ▼
              catalogExerciseId slugs (unchanged)
```

---

## 12. Review checklist

Use this when reviewing the design:

- [ ] Slug + `archived` semantics match how you want admin to work
- [ ] Conditional trigger rules match publish expectations
- [ ] Mobility as `WorkoutSession` is acceptable scope for v1
- [ ] Blocking first launch (no fallback) is acceptable UX
- [ ] Cardio minimal seed vs warm-up opportunistic matches content plan
- [ ] Build sequence ordering makes sense for your admin tool timeline
- [ ] Anything missing for Full Body / Phase 5 is correctly deferred

---

*Last updated: design alignment session — ready for review.*
