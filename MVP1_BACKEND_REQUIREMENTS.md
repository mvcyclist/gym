# MVP1 — Backend & infrastructure requirements

Context: MVP1 is **strength-first coaching** (“What did I lift last time for this exercise?”). UI is out of scope here. This document summarizes **what backend/infra exists**, **what must be built**, and **what is only a temporary client-side shortcut** — so readers do not confuse domain helpers with authoritative cloud reads.

Related: [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md) (**prerequisite** — draft vs history before coaching), [audt_mvp1.md](./audt_mvp1.md) (full prerequisite checklist), [BACKLOG.md](./BACKLOG.md) (security & workout sanctity).

---

## Already in place

| Component | Notes |
|-----------|--------|
| **Auth** | Google sign-in, per-user Supabase rows |
| **Storage** | `TrainingLedger`: `sessions[]` + `manualByDate` |
| **Session model** | `WorkoutSession` with `status`, timestamps, `exercises[]` → sets (weight, reps, completed) |
| **Cloud sync** | `workout_sessions` JSONB, upsert on save, merge on sign-in / tab focus |
| **Template slot IDs** | IDs in `workouts.ts` (e.g. `push-1`) — **not** immutable exercise catalog IDs (see §8) |
| **Write lifecycle** | `active` → start; `completed` → finish; `partial` → save progress; discard → **delete** row — **see gap:** today writes `active`/edits straight to ledger; target is [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md) (draft until confirm) |
| **Calendar input** | `getLastSevenDays()` from `completed` + `partial` only |
| **Workout-type recommendations** | `recommendationService` (rule-based, last 7 days) |
| **Manual activities** | Separate `manualByDate`, `source: 'manual'` vs `'workout'` |
| **Low-level access** | `getSessionById()`, `getSessionsForDate()`, `loadLedger().sessions` |
| **Authoritative store (cloud)** | Supabase `workout_sessions` per user — source of truth **after sync**, not directly queried for coaching today |

**Verdict:** **Write path + cloud persistence** are ~70% sufficient for sync, but **history quality is not MVP-ready** — in-progress sessions pollute the ledger (auto-`partial`, eager cloud upserts). **Read path for coaching** is not infra yet — it is a **locally merged cache** (`memoryLedger` → `localStorage` ← merge ← Supabase). Missing: **draft vs history split** ([LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md)), **domain query layer (MVP)**, **authoritative read path (later)**, normalization, lifecycle, sync hardening.

---

## Architecture: two layers (do not conflate)

| Layer | What it is | Today | Reliable across devices? |
|-------|------------|-------|-------------------------|
| **A. Cloud persistence** | Supabase `workout_sessions` + RLS | ✅ Writes upsert rows; sign-in/focus **merge** into local ledger | ✅ **If sync is correct** — data exists server-side |
| **B. History query API** | “What did I lift last time?” | ❌ Not built | N/A |
| **B1. MVP (proposed)** | `exerciseHistoryService` scanning `loadLedger().sessions` | Client **domain service** over merged cache | ⚠️ **Only as good as local merge** — not an authoritative cloud read |
| **B2. Target (later)** | Server-side or direct Supabase read (SQL/RPC/Edge) keyed by `user_id` + `historyExerciseKey` (see §8) | Not built | ✅ Same answer on web, mobile, new device after hydrate |

**Important:** Proposed §1 APIs are **B1 — application/domain convenience**, not backend infrastructure. They do **not** call Supabase at query time. Coaching answers reflect whatever this device’s ledger contains after last merge — which may lag or diverge if sync fails (see [BACKLOG.md](./BACKLOG.md)).

For **solo use, one account, sync working**, B1 is a pragmatic MVP. For **reliable coaching across devices and mobile reuse**, plan **B2** or require **hydrate-from-cloud before coaching queries** with a documented freshness contract.

---

## Missing backend components

### 0. Draft vs history logging (prerequisite — do first)

In-progress workouts must **not** write to `TrainingLedger.sessions` or Supabase until the user confirms. Partial saves are **opt-in** only; Finish → `completed` (skipped exercises OK). Full spec: [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md).

| Today | Target |
|-------|--------|
| Start + every set edit → ledger + cloud | Draft store only until Finish or Save progress |
| End workout → auto `partial` | End → SaveProgressDialog; partial only if user saves |
| `active`/`paused` in history ledger | Draft layer only; history = `completed` + opt-in `partial` |

Coaching queries must use **`completed` only**; calendar uses `completed` + opt-in `partial`. Implement before §1 history APIs.

---

### 1. History query layer (highest priority)

Two phases — **do not describe phase 1 as “backend infra complete.”**

#### Phase 1 — Client domain service (MVP shortcut)

A dedicated module (e.g. `exerciseHistoryService.ts`) that scans **`loadLedger().sessions`** — the in-memory / `localStorage` ledger after merge. **No new tables.** **No Supabase read at query time.**

| API | Purpose |
|-----|---------|
| `getRecentCompletedSessions(limit?)` | Recent history, sorted by `completedAt` |
| `getLastCompletedSessionByWorkoutType(type)` | Last Push / Pull / Leg / Core |
| `getLastExercisePerformance(historyExerciseKey)` | Core MVP1 query (see below) — key meaning depends on §8 Option A or B |
| `getExerciseSetsFromSession(sessionId, historyExerciseKey)` | All completed sets for one exercise in one session |

**What this is:** Shared **frontend/domain** logic — same idea as `recommendationService` + `getLastSevenDays()`. Reusable by UI and hooks; portable to mobile **only if** mobile also implements ledger + sync the same way.

**What this is not:** An authoritative history API. Assumes `loadLedger()` is current enough to trust for coaching.

**MVP guardrails (minimum):**

- Document that results are **device-ledger scoped**, not “cloud read.”
- Optionally: `await refreshMergedLedgerFromCloud()` (or equivalent) before coaching queries when online — still merge, but reduces staleness.
- Surface sync failure / stale ledger to UI when queue or merge is behind (see §5).

#### Phase 2 — Authoritative read path (infra; post-MVP or parallel if multi-device coaching is launch criteria)

True cross-client coaching needs reads against **cloud source of truth** (or a server that reads it), not only local merge.

| Approach | Notes |
|----------|--------|
| **Supabase client query** | `from('workout_sessions').select(...).eq('user_id', …)` + filter/sort in app or SQL |
| **Postgres RPC / view** | e.g. `get_last_exercise_performance(user_id, history_exercise_key)` — best for mobile reuse |
| **Edge function** | If aggregation logic must not live on client |

Existing `workout_sessions.exercises` JSONB already holds set-level data — **no new table required for phase 2 either**, but phase 2 **does** require an explicit **cloud read contract** (when to fetch, cache policy, offline fallback to phase 1).

**Recommendation:** Implement **phase 1** for speed; track **phase 2** in backlog if mobile or strict cross-device coaching is in scope for MVP1 launch.

**MVP1 query contract** — given signed-in user, **`historyExerciseKey`** (see §8 — not the same field under Option A vs B), optional current session:

Return:

- Most recent **completed** session whose stored exercise record matches that key (per §8 matching rules)
- Date of that workout
- All **completed** sets: `setNumber`, weight, reps
- Aggregates: `totalReps`, `topSet`, `totalVolume` (when computable)

Example shape (from audit):

```json
{
  "historyExerciseKey": "barbell_bench_press",
  "keyKind": "catalog",
  "exerciseName": "Barbell Bench Press",
  "lastPerformedAt": "2026-06-01",
  "sets": [
    { "setNumber": 1, "weight": 135, "reps": 10 },
    { "setNumber": 2, "weight": 135, "reps": 8 },
    { "setNumber": 3, "weight": 135, "reps": 7 }
  ],
  "totalReps": 25,
  "topSet": { "weight": 135, "reps": 10 },
  "totalVolume": 3375
}
```

---

### 2. Set / weight normalization

| Need | Why |
|------|-----|
| `parseSetLoad(set)` | Weight/reps are stored as **strings** today |
| BW semantics | Handle `"BW"`, `""`, `"0"` for bodyweight |
| Numeric reps | Strip non-digits (sanitization exists in UI; logic should live in domain layer too) |
| Volume / top-set helpers | Shared math for history + future progression |

Suggested module: `setParsing.ts` (or `setMetrics.ts`).

---

### 3. Session lifecycle (server-side semantics)

| Need | Current gap |
|------|-------------|
| Policy for `active` vs `in_progress` naming | Code uses `active` |
| `abandoned` vs **delete** | Discard deletes row; `abandoned` type exists but is unused |
| `updateCompletedSession(session)` | No post-finish correction path |
| `deleteCompletedSession(sessionId)` | Cannot remove bad **completed** workouts from ledger/cloud |

Optional: explicit `abandoned` status instead of hard delete for audit trail.

---

### 4. Centralized history query policy

Filter rules are scattered (calendar vs recommendations vs future progression). Need one place, e.g. `historyQueryPolicy.ts`:

| Consumer | Typical rule |
|----------|----------------|
| Calendar / 7-day strip | `completed` + `partial` |
| Workout-type recommendations | `DayActivity` derived from above |
| **Progression / last lift** | `completed` only; exclude `active`, deleted, optionally `partial` |
| In-progress resume | `active` only (today) |

Prevents coaching queries from duplicating filters and drifting from calendar behavior.

---

### 5. Workout sanctity & sync hardening

See [BACKLOG.md](./BACKLOG.md). Backend-relevant items:

| Need | Purpose |
|------|---------|
| **Workout lock** | Pause `refreshMergedLedgerFromCloud` while `status === 'active'` |
| **Per-user local cache** | `workout-deck-ledger:<userId>`; clear/bind on account change |
| **Pending sync queue** | Retry failed cloud upserts; local-first writes |
| **Local-first finish** | Persist `completed`/`partial` locally before awaiting cloud |

---

### 6. Freshness after edits

| Need | Notes |
|------|-------|
| Phase 1: queries read `loadLedger()` | **Cache read** — freshness = last merge + local writes |
| Phase 2: define when coaching uses cloud vs ledger | e.g. online → cloud RPC; offline → ledger fallback |
| After `upsertSession`, bump `ledgerVersion` | Partially exists |
| After edit, cloud row `updated_at` must advance | Required for merge + phase 2 correctness |

Corrections only affect future lookups once **update completed session** exists and upserts propagate to **both** local ledger and Supabase.

---

### 7. Manual vs strength separation (enforce in code)

| In place | Requirement |
|----------|-------------|
| `manualByDate` vs `sessions` | History/coaching services **must only scan `sessions`** for lift data |
| `source: 'manual' \| 'workout'` | Manual swim/bike/walk must not appear in `getLastExercisePerformance` |

Document in history service module; no schema change.

---

### 8. Exercise identity (required decision before history queries)

**Problem:** Today’s `exerciseId` values (e.g. `push-1`) are **template-slot IDs** — position in the Push workout template — not immutable identifiers for a movement. Sessions snapshot `exerciseId` + `exerciseName` from the template at log time (`useWorkoutLog` → `createExerciseLogs`).

If `push-1` is later changed from Barbell Bench Press to another lift, querying history with that key would **merge unrelated performances** and coaching becomes misleading.

#### Neutral API parameter: `historyExerciseKey`

All history APIs (§1, readiness gates) use **`historyExerciseKey`** — the string passed to `getLastExercisePerformance()` and stored in the response. **What that string means** is fixed by whichever option you choose:

| | **Option A — catalog** | **Option B — slot immutability** |
|---|------------------------|----------------------------------|
| **`historyExerciseKey` example** | `barbell_bench_press` | `push-1` |
| **Matches session field** | `catalogExerciseId` (new field on `ExerciseLog`) | `exerciseId` (today’s template slot id) |
| **Response `keyKind`** | `"catalog"` | `"template_slot"` |
| **Safe when program changes?** | Yes — catalog id is stable | Only if slot ids are **never repurposed** (program rule) |

**Do not use `catalogExerciseId` in API signatures unless Gate A/B explicitly assumes Option A.** Use `historyExerciseKey` so Option B remains valid without renaming APIs.

Example response under **Option B** (same shape, different key):

```json
{
  "historyExerciseKey": "push-1",
  "keyKind": "template_slot",
  "exerciseName": "Barbell Bench Press",
  "lastPerformedAt": "2026-06-01",
  "sets": [ ... ]
}
```

#### Option A — Exercise catalog (recommended for evolving programs)

Introduce a separate **catalog ID** that never changes when templates are edited.

| Layer | Example | Role |
|-------|---------|------|
| **Catalog ID** | `barbell_bench_press` | Immutable; used by history + coaching |
| **Template slot ID** | `push-1` | Where the exercise sits in today’s Push template |
| **Session snapshot** | `catalogExerciseId` + `exerciseName` + slot id (optional) | What was logged that day |

**Infra to add:**

- `exercises` catalog in code or DB (id, name, equipment, …)
- Template entries reference `catalogExerciseId` (not only slot id)
- `ExerciseLog` / persisted session sets store **`catalogExerciseId`** (required for MVP1 queries)
- Migration: backfill existing sessions — map `push-1` → `barbell_bench_press` for historical rows where name matches

History service matches sessions on **`catalogExerciseId`**; callers pass that value as `historyExerciseKey`.

#### Option B — Template slot immutability (minimal change)

Keep `push-1` as `historyExerciseKey` but adopt an explicit **program rule**:

> Once a slot ID (e.g. `push-1`) has logged history, that ID **must never** be assigned to a different movement. To swap exercises, add a new slot ID and retire the old one.

**Infra to add:**

- Documented convention in `workouts.ts` + code comment policy
- Optional lint/check: slot id → movement name map is append-only
- History service matches sessions on **`exerciseId`** (template slot); callers pass that value as `historyExerciseKey`

**Risk:** Easy to violate by accident when editing templates; no guardrail in data model.

#### Not sufficient on its own

- **`exerciseName` matching** — renames break history; duplicate names collide
- **Template slot ID alone** without Option A or B — unsafe when program changes

#### Decision required for MVP1 gate

**Decision (locked): Option A — exercise catalog.**

- `historyExerciseKey` = `catalogExerciseId` (e.g. `barbell_bench_press`)
- Catalog: [`src/data/exerciseCatalog.ts`](./src/data/exerciseCatalog.ts)
- Identity: [`src/services/exerciseIdentity.ts`](./src/services/exerciseIdentity.ts)
- Templates reference `catalogExerciseId` on each [`Exercise`](./src/types/workout.ts)
- `ExerciseLog.catalogExerciseId` persisted at log time; legacy rows backfill via slot → catalog map

Coaching UI can be specified later.

---

## Suggested modules (build order)

```
0. draft vs history split     — ✅ LOGGING_LIFECYCLE.md
1. exerciseIdentity.ts        — ✅ Option A catalog
2. setParsing.ts              — ✅ weight/reps → numbers, BW, volume helpers
3. historyQueryPolicy.ts      — ✅ coaching: completed only
4. exerciseHistoryService.ts  — ✅ phase 1 queries over loadLedger()
5. sessionLifecycle.ts        — update/delete completed; optional abandon
6. syncQueue.ts               — (optional) offline retry; prerequisite for trusting phase 1
7. per-user ledger storage    — (security) namespaced local cache
— later —
8. exerciseHistoryCloud.ts    — phase 2: Supabase RPC or direct authoritative reads
```

---

## Explicitly not required for phase 1 (MVP shortcut)

- **New Supabase tables** — session JSONB is enough for phase 1 **and** phase 2 reads
- **Server/RPC** — deferred if solo-device or “merge then query” is acceptable short-term
- Per-user workout templates in DB (keep `workouts.ts` for now, but add catalog IDs or immutability rule)
- LLM / external coaching API
- Workout-type recommendation rewrite (`recommendationService` stays for “what day is it?”)

**Required for “real” cross-client infra:** phase 2 authoritative reads (or equivalent) — not optional if launch criteria include mobile or strict multi-device coaching without merge ambiguity.

---

## MVP1 readiness gates (split by ambition)

### Gate A — Coaching UI prototype (phase 1 domain layer)

Acceptable for **single-user / sync-trusted** use:

0. **Draft vs history** — [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md) implemented; history ledger contains only confirmed `completed` + opt-in `partial`.
1. **Exercise identity decided** — **Option A (catalog)**; `historyExerciseKey` matching implemented.
2. `getLastExercisePerformance(historyExerciseKey)` implemented over **`loadLedger()`** with §1 contract (response includes `keyKind`).
3. **Single history query policy** (completed-only for progression).
4. Set parsing handles **BW** and numeric weight.
5. Document in code: results are **ledger-scoped**, not authoritative cloud reads.

### Gate B — Reliable coaching infra (cross-device / mobile)

Additionally required:

1. **Phase 2 read path** — Supabase SQL/RPC (or server) keyed by `user_id` + `historyExerciseKey` (same semantics as §8).
2. **Sync hardening** — workout lock, per-user cache, sync queue (§5).
3. **Freshness contract** — when UI uses cloud vs local fallback.
4. (Recommended) Post-completion edit/delete on sessions.

Until **Gate A (0)–(5)** exist, do not ship coaching product logic. **Gate B** is required before claiming backend supports reliable coaching **across devices** — phase 1 alone is a **temporary application-layer** solution over merged cache.
