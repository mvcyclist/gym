# Foundation roadmap — web now, mobile later

This document is the **north star for foundational work**. The goal: keep shipping the desktop/web app while building a data and domain layer that can move to mobile without a rewrite.

It complements (does not replace):

- [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md) — draft vs history write path
- [MVP1_BACKEND_REQUIREMENTS.md](./MVP1_BACKEND_REQUIREMENTS.md) — coaching query layer and cloud read phases
- [BACKLOG.md](./BACKLOG.md) — known security/sync gaps

---

## Goal

**One domain model, multiple surfaces.**

- Web remains the primary product for now.
- Business logic, types, and history contracts live in a **platform-agnostic core**.
- Persistence and sync are **adapters** — swappable without changing coaching, progression, or recommendations.
- When mobile is ready, the work is mostly **UI + native storage/sync**, not re-deriving workout rules.

---

## Key principles

Use these for every future tech decision. If a change violates a principle, pause and fix the foundation first or explicitly accept debt with a ticket.

### 1. Domain before UI

Coaching, progression, recommendations, and calendar logic must not depend on React, DOM APIs, routing, or Tailwind. UI calls into services; services never import components.

### 2. One front door for history reads

All “what happened?” questions go through a **history query layer** (e.g. `exerciseHistoryService`, `trainingLedgerService` query helpers). No feature should scan `loadLedger().sessions` directly or maintain a parallel exercise log.

**Allowed queries (examples):**

- Last performance for exercise X (progression)
- Sessions for calendar date Y
- Last 7 days of activity (recommendations)
- Session by id (resume / edit)

### 3. Three storage buckets — never mix them


| Bucket          | Contents                                   | Sync?    | Used for coaching?      |
| --------------- | ------------------------------------------ | -------- | ----------------------- |
| **Draft**       | In-progress workout for today              | No       | No                      |
| **History**     | Confirmed `completed` (+ opt-in `partial`) | Yes      | Yes (with status rules) |
| **Preferences** | Palette, UI flags, low-stakes settings     | Optional | No                      |


See [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md) for draft vs history rules.

### 4. Write path is explicit

```
Start workout → Draft only
Log sets      → Draft only (local persist for crash recovery)
Finish        → History (completed) → then sync
Save progress → History (partial, opt-in) → then sync
Discard       → Delete draft, no history row
```

Nothing enters history or cloud without user confirmation.

### 5. Status policy is centralized

Calendar, progression, and recommendations may use different subsets of history. That policy lives in **one module** (e.g. `historyQueryPolicy.ts`) — not duplicated in components or services.

Current intent:

- **Progression:** `completed` only
- **Calendar / 7-day strip:** `completed` + `partial`
- **Recommendations:** derived from calendar-level activity, not raw ledger scans

### 6. Storage is an adapter, not a pattern

`localStorage` is fine for web MVP **only behind an interface**. Domain code imports repositories, not `localStorage`.

Target shape:

```
UI / hooks
  → services (domain)
    → ledgerRepository / draftRepository / preferencesRepository
      → adapters (localStorage today, AsyncStorage / SQLite tomorrow)
      → supabaseAdapter (cloud)
```

### 7. Per-user isolation by default

Every persisted key is namespaced by `userId` when signed in. Sign-out clears in-memory state. Never merge ledgers across accounts. See [BACKLOG.md](./BACKLOG.md).

### 8. Be honest about freshness

Phase 1 (web, single device): coaching reads the **merged local cache**. Document that in code and UI when relevant.

Phase 2 (multi-device / mobile): **authoritative cloud reads** or hydrate-before-coaching. Do not pretend local merge is global truth.

### 9. Single exercise identity

One stable key (`historyExerciseKey`) for “same exercise over time.” Progression, history queries, and future cloud RPCs all use the same key. Catalog/template IDs are mapped, not invented per feature.

### 10. Pure functions for rules; repositories for facts

Scoring (recommendations, overload) = pure functions over typed inputs.

Facts (sessions, sets, manual activities) = repository reads.

Do not embed storage or side effects inside rule engines.

### 11. Consolidate before you extend

Before adding a new recommendation engine, progression path, or history store, **merge or replace** the existing one. Two parallel systems (e.g. separate progression store + session history) is the fastest path to mobile pain.

### 12. Local-first finish, background sync

Finish/save commits to local history immediately; cloud sync is async with retry. Never block set logging or finish UX on network. See [BACKLOG.md](./BACKLOG.md) workout sanctity section.

---

## Current gaps (why this doc exists)


| Gap | Status |
| --- | --- |
| Multiple write/read paths (`exerciseProgressionStore` vs session ledger) | **Resolved** — progression derived from `historyQueryService` / session ledger |
| `localStorage` accessed from domain services | **Resolved** — adapters only (`localKeyValueStorage`, `localLedgerStorage`, `workoutDraftStorage`) |
| Global / legacy storage keys | **Mostly resolved** — ledger, draft, palette, import prompt namespaced by `userId` |
| Coaching reads merged cache without a documented contract | **Documented** — see `historyQueryService.ts` header; device-ledger scoped until Phase 6 |
| Two recommendation systems | **Resolved** — `recommendationEngine` + thin `recommendationService` facade |
| `App.tsx` orchestrates storage + domain + navigation | **Open** — defer until mobile shell or provider extraction |
| Cloud sync blocks finish UX / no retry queue | **Resolved** — local-first writes + `syncQueueService` with retry |
| Recommendation variety (e.g. consecutive Walk days) | **Open** — engine tuning, not framework |

---

## History query API (Phase 3 — canonical reads)

All coaching and calendar reads go through **`historyQueryService`**:

| Query | Used for |
| --- | --- |
| `getLastExercisePerformance(historyExerciseKey)` | Last lift for an exercise (`completed` only) |
| `getExerciseHistoryForProgression(historyExerciseKey, …)` | Progressive overload engine input |
| `getRecentCompletedSessions()` / `getLastCompletedSessionByWorkoutType()` | Session-level coaching |
| `getLastSevenDays()` | Calendar strip, recommendations |
| `getSessionsForDate(date)` | Today summary, day detail |
| `getSessionById(id)` | Resume / edit confirmed sessions |
| `getManualActivitiesForDate(date)` | Manual activity entries |

Writes: `trainingLedgerService` + `ledgerRepository` + `workoutDraftStorage`.

**Freshness:** results reflect the merged local cache on this device until Phase 6 authoritative cloud reads.

---

## Game plan

Work in phases. **Complete the gate for each phase before layering new product features** (new coaching UI, weekly plan tweaks, etc.) on top.

### Phase 0 — Align on contracts (no big refactor)

**Outcome:** Everyone (including future-you) knows the boundaries.

- [x] Treat this doc + linked docs as the decision record.
- [x] List the canonical history queries the app needs (see Principle 2).
- [x] Map each existing feature to its query source (audit: who reads what today).
- [x] Decide: progression is **derived from session history**, not a separate log (target state).

**Gate:** Written query list + audit table (can live in this file or a short appendix).

---

### Phase 1 — History quality & write path

**Outcome:** Trustworthy history on web; draft never pollutes coaching.

Prerequisite spec: [LOGGING_LIFECYCLE.md](./LOGGING_LIFECYCLE.md)

- [x] Draft storage fully separate from history ledger; no `active` rows in history.
- [x] Finish → `completed`; End → opt-in `partial` only via Save progress.
- [x] `historyQueryPolicy` enforced everywhere sessions are read or written.
- [x] Workout lock during active session: no destructive cloud merge mid-workout ([BACKLOG.md](./BACKLOG.md)).

**Gate:** Calendar and progression reflect only confirmed history; refresh mid-workout does not lose sets or corrupt ledger.

---

### Phase 2 — Repository layer & per-user cache

**Outcome:** All persistence behind adapters; safe multi-account web use.

- [x] `LedgerRepository` is the only writer/reader for history ledger (memory + local + cloud orchestration).
- [x] `DraftRepository` for in-progress workouts only (`workoutDraftStorage` adapter).
- [x] `PreferencesRepository` for palette and similar (no coaching impact).
- [x] Namespace all keys: `workout-deck-ledger:<userId>`, etc.
- [x] Sign-out / account switch: clear memory, bind repositories to new user.
- [x] Remove direct `localStorage` usage from domain services (`recommendationEngine`, `exerciseProgressionStore`, etc.).

**Gate:** No domain `.ts` file imports `localStorage` except adapters.

---

### Phase 3 — Unified history query layer (Phase B1)

**Outcome:** One API for all coaching/calendar reads; reusable on mobile with same interface.

Spec detail: [MVP1_BACKEND_REQUIREMENTS.md](./MVP1_BACKEND_REQUIREMENTS.md) §1

- [x] `getLastExercisePerformance(historyExerciseKey)` — completed sessions only.
- [x] `getSessionsForDate(date)` / `getLastSevenDays()` — via `historyQueryService`, not ad hoc ledger scans in UI/hooks.
- [x] Progression reads from session history (`exerciseProgressionStore` removed).
- [x] Document: **results are ledger-scoped** until Phase 6.

**Gate:** ExerciseCard, recommendations, and calendar all use the query layer; zero direct ledger scans in UI/hooks.

---

### Phase 4 — Sync hardening (still web, mobile-ready)

**Outcome:** Reliable enough that a second client (mobile) can trust cloud data.

- [x] Local-first finish + background sync queue with retry.
- [x] Hydrate from cloud on sign-in / app foreground with merge rules documented.
- [x] Stale/sync-failure surfaced in UI when coaching may be wrong.
- [x] Hydrate-before-coaching when online (`AuthGate` loading + sign-in hydrate before `ledgerReady`).

**Gate:** Sign in on a fresh browser → history matches cloud after sync; offline finish never blocks user.

---

### Phase 5 — Extract portable core (when mobile starts)

**Outcome:** Shared package consumed by web and mobile.

Suggested layout (future):

```
packages/core/     types, data, services, utils (no DOM, no storage)
packages/storage-web/    localStorage adapters
packages/storage-native/ AsyncStorage / SQLite adapters (mobile)
apps/web/
apps/mobile/
```

- [ ] Move platform-agnostic code into `packages/core`.
- [ ] Web app imports `@gym/core`; adapters injected at bootstrap.
- [ ] Mobile app same core, different adapters + RN UI.

**Gate:** Core package builds and tests without browser globals.

---

### Phase 6 — Authoritative cloud reads (multi-device coaching)

**Outcome:** Same coaching answer on web and phone after sync.

Spec detail: [MVP1_BACKEND_REQUIREMENTS.md](./MVP1_BACKEND_REQUIREMENTS.md) Phase B2

- [ ] Supabase RPC or query path keyed by `user_id` + `historyExerciseKey`.
- [ ] Query layer can read local cache **or** cloud based on policy (online, freshness).
- [ ] Mobile uses same query interface; adapter chooses source.

**Gate:** Last-lift answer consistent across two devices for the same account.

---

## What to keep building on desktop (safe parallel work)

While Phases 1–3 are in progress, these are **low debt** if principles are followed:

- Workout logging UX (sets, timer, skip, resume) — as long as writes go through draft/history repos
- Exercise catalog / template content in `data/`
- UI polish, accessibility, keyboard shortcuts (web-only is fine)
- Recommendation **rules** as pure functions (consolidate engines, don’t add a third)

## What to defer until foundation gates pass

- New coaching surfaces that read ledger directly
- Second progression/history store
- Mobile-specific features (widgets, health kit, etc.)
- Heavy investment in weekly plan / recommendation UX until read path is unified (Phase 3)

---

## Decision checklist (use before merging)

Ask for every PR that touches data:

1. Does this read history through the query layer (or move us toward it)?
2. Does this write to draft or history correctly? Any new cloud write on set log?
3. Is storage access only in an adapter/repository?
4. Is exercise identity using `historyExerciseKey`?
5. Are session statuses filtered via `historyQueryPolicy`?
6. If signed-in, is data scoped to `userId`?
7. Is new logic pure (rules) or repository (facts) — not both in one function?
8. Does this add a parallel store? If yes, reject or plan consolidation.

---

## Definition of done — “foundation ready for mobile”

You can start mobile UI when:

- [x] Phases 1–3 complete (history quality, repositories, unified queries)
- [x] Phase 4 minimally complete (sync queue + per-user cache + workout lock)
- [ ] Core types and services have no web imports
- [x] One recommendation + one progression path
- [x] Documented freshness contract for coaching

You do **not** need Phase 6 to start mobile — local cache + sync is enough for v1 mobile if freshness is honest. Phase 6 is required for **trustworthy multi-device coaching**.

---

## Anti-patterns (accumulate debt fast)

- `loadLedger()` or `localStorage` in a React component or hook (except a dedicated bootstrap/provider)
- Duplicating “last exercise performance” logic in ExerciseCard and a store
- Writing `partial` or `active` sessions on every set change
- Global storage keys without user id
- New recommendation engine without removing/replace old one
- Cloud `await` on the set-logging hot path
- Merge-from-cloud during an active workout
- Feature-specific exercise IDs that don’t map to catalog/history keys

---

## Suggested immediate focus (next 2–4 weeks)

1. **Recommendation tuning** — consecutive recovery variety, weekly plan coherence (pure engine changes).
2. **App shell** — thin provider layer so `App.tsx` stops orchestrating storage + domain (mobile prep).
3. **Phase 5** — extract `packages/core` when mobile work starts.
4. Continue desktop feature work — Phases 1–4 foundation gates are met.