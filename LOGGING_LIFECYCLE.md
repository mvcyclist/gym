# Logging lifecycle — draft vs history

Context: In-progress workouts today write immediately to `TrainingLedger.sessions` and Supabase. That produces **noisy history** — empty `active` rows, auto-saved `partial` sessions on “End workout,” and calendar clutter the user never confirmed.

This document defines the **target model** before MVP1 coaching. Implementation is a **prerequisite** to the history query layer ([MVP1_BACKEND_REQUIREMENTS.md](./MVP1_BACKEND_REQUIREMENTS.md)).

Related: [BACKLOG.md](./BACKLOG.md) (workout sanctity, per-user cache, sync hardening).

---

## Problem (today)

| Behavior | Effect |
|----------|--------|
| `startSession()` upserts to ledger + cloud immediately | Empty `active` rows persist upstream |
| Every set edit syncs to ledger + cloud | High write volume; half-finished sessions in merge path |
| “End workout” with ≥1 completed set → auto `partial` | Calendar history without user confirmation |
| `SaveProgressDialog` exists but is **not wired** | Opt-in save was designed but bypassed |
| `active` / `paused` rows can linger after today | Stale rows in ledger; resume only filters by today |
| `partial` included in calendar + recommendations | Noisy 7-day strip and workout-type hints |

**Verdict:** Robust for **not losing sets mid-workout**; not robust for **trustworthy history** — which MVP1 coaching requires.

---

## Design: two storage layers

| Layer | Purpose | Storage | In `TrainingLedger.sessions`? | Calendar? | Cloud sync? |
|-------|---------|---------|----------------------------------|-----------|-------------|
| **Draft** | In-progress workout for today | React state + local draft persistence (crash recovery) | **No** | **No** | **No** |
| **History** | Confirmed workouts | `TrainingLedger.sessions` + Supabase | **Yes** | **Yes** (see statuses below) | **Yes** |

**Rule:** Nothing enters the history ledger or cloud until the user **explicitly confirms** (Finish or Save progress). Discard removes the draft with no history row.

### Draft persistence

- Separate key from history ledger, e.g. `workout-deck-draft:<userId>` (align with per-user cache in [BACKLOG.md](./BACKLOG.md)).
- Survives refresh / remount; **not** merged on tab-focus cloud refresh.
- Internal status may include `active` | `paused` for resume UX — still draft-only.

### History statuses

| Status | How created | Calendar? | Coaching queries? |
|--------|-------------|-----------|-------------------|
| `completed` | User taps **Finish workout** | Yes | Yes (`completed` only) |
| `partial` | User taps **End workout** → **Save progress** (opt-in) | Yes | **No** — progression uses `completed` only |
| `active` / `paused` | — | **Must not appear in history ledger** | No |

---

## User flows

### Start / log sets

1. User starts workout → create **draft** only (no ledger upsert, no cloud).
2. Set edits, complete set, add/delete set, skip exercise → update **draft** only.
3. Pause → draft with `paused` status; still not in history.

### Finish workout (normal completion)

User taps **Finish workout** when done for the day (skipped exercises are OK).

- Requires **≥1 completed set** (unchanged).
- Does **not** require every template exercise — skipping is normal.
- Promotes draft → **`completed`** in history ledger + cloud sync.
- Clears draft.
- No extra confirmation dialog (Finish = intentional save).

### Leave / end early

User backs out or chooses **End workout** from leave dialog.

| User choice | Result |
|-------------|--------|
| **Save progress** | Promote draft → **`partial`** in history + calendar; clear draft |
| **Discard** | Delete draft; nothing in ledger or calendar |
| **Cancel** | Stay in workout; draft unchanged |
| **Pause and resume later** | Draft stays `paused`; not in history or calendar |

**Never** auto-save `partial` on End workout. Wire [SaveProgressDialog](../src/components/SaveProgressDialog.tsx) (or equivalent) as the gate.

### Switch workout mid-session

When user selects a different workout while a draft exists → same leave/save/discard flow before starting the new draft.

### Resume

- On app load: if **today’s draft** exists → auto-resume (current behavior, scoped to draft store).
- Draft from a **prior calendar day** on next open → one-shot prompt: save as partial, discard, or review. If dismissed/ignored → **discard** (default cleanup).

---

## Product decisions (locked)

1. **Partial is opt-in.** If the user does not save, partial does not appear in ledger or calendar.
2. **Overnight pause:** No strong policy — draft expires at day boundary with prompt-then-discard default (see Resume above).
3. **Minimum bar for save:** None for now — any completed set is enough to offer Save progress.
4. **Finish with skipped exercises:** Normal — Finish → `completed`, not blocked by skipped template slots.

---

## Implications for consumers

| Consumer | Rule |
|----------|------|
| Calendar / 7-day strip | `completed` + opt-in `partial` only — **never** draft |
| Workout-type recommendations | Derived from calendar entries above |
| **Progression / last lift (MVP1)** | **`completed` only** — exclude `partial`, draft, `active`, `paused` |
| In-progress resume | Draft store only; `findTodaysResumableSession()` reads draft, not `loadLedger().sessions` |
| Cloud merge on sign-in / tab focus | Merge **history sessions only**; do not overwrite or merge draft |
| Workout lock ([BACKLOG.md](./BACKLOG.md)) | While draft is active: skip background merge into history; draft writes are local-only |

---

## Migration from current behavior

One-time on load (or version bump):

1. **`active` / `paused` in ledger** → move to draft if from today; else discard.
2. **`partial` rows** — keep (user already has them in history). Future partials require opt-in only.
3. Stop writing `active` / `paused` to `workout_sessions` in Supabase for new sessions.

Optional: offer to delete orphan `active`/`paused` cloud rows during cleanup.

---

## Suggested modules (implementation)

```
workoutDraftStorage.ts     — load/save/clear draft (local; per-user key) ✅ module only (Slice 2)
useWorkoutLog.ts           — draft-only during logging; promote on finish/save
trainingLedgerService.ts   — history queries unchanged scope; no draft reads
App.tsx                    — wire SaveProgressDialog; End → save/discard/cancel
historyQueryPolicy.ts      — completed-only for coaching; completed+partial for calendar
```

Build **before** `exerciseHistoryService` and exercise identity work — history layer should only contain intentional workouts.

---

## Implementation slices

| Slice | Scope | Status |
|-------|--------|--------|
| **1** | Opt-in partial — wire `SaveProgressDialog`; End workout no longer auto-saves | **Done** |
| **2** | `workoutDraftStorage.ts` module (no wiring) | **Done** |
| **3** | In-progress → draft only; promote on Finish / Save | **Done** |
| **4** | Stale `active`/`paused` cleanup | **Done** |
| **5** | Prior-day draft prompt; per-user draft key | **Done** |

---

## Acceptance criteria

- [x] Starting a workout does **not** add a row to `TrainingLedger.sessions` or Supabase. *(Slice 3)*
- [x] Set logging during workout does **not** sync to cloud. *(Slice 3)*
- [ ] **Finish workout** → single `completed` row; appears on calendar.
- [x] **End workout** with sets → SaveProgressDialog; **Save** → `partial` on calendar; **Discard** → no row. *(Slice 1)*
- [x] **End workout** with 0 completed sets → discard draft (no dialog or discard-only). *(Slice 1)*
- [x] **Pause** → draft only; resume today works after remount. *(Slice 3)*
- [x] Prior-day draft → prompt; default discard if unresolved. *(Slice 5 — Discard button; no keep-open cancel)*
- [ ] `getLastExercisePerformance` (when built) reads **`completed` only**.
- [x] No `active` / `paused` rows in history ledger after implementation + migration. *(Slice 4)*

---

## Build order relative to MVP1

```
0. Draft vs history split (this document)     ← first
1. exerciseIdentity.ts                       — Option A or B
2. setParsing.ts
3. historyQueryPolicy.ts
4. exerciseHistoryService.ts
5. sessionLifecycle.ts                       — edit/delete completed
6. sync hardening (BACKLOG)                  — can overlap; draft split reduces merge risk
```
