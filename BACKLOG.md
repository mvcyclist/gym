# Backlog

Tracked issues to revisit. Not blocking current work unless noted.

---

## P1 — Cross-account history leakage (shared browser)

**Status:** Open  
**Verified:** Yes (code review)

### Problem

When a different Google user signs in on the same browser, User B can inherit User A's cached workout history.

### Root cause

- Sign-out only clears in-memory ledger state (`resetLedgerRepository()`), not `localStorage`.
- Single global key: `workout-deck-ledger` (not scoped per `user_id`).
- On sign-in, `hydrateLedgerFromCloud()` merges that shared local cache with the new user's cloud ledger and writes the result back to disk.
- "Sync to cloud" pushes the entire local ledger into the signed-in account.

### Relevant files

- `src/contexts/AuthProvider.tsx` — `handleSignedOut`, `signOut`
- `src/services/ledgerRepository.ts` — `refreshMergedLedgerFromCloud`, `hydrateLedgerFromCloud`, `pushDeviceHistoryToCloud`
- `src/adapters/localLedgerStorage.ts` — global `LEDGER_KEY`
- `src/utils/ledgerStats.ts` — `mergeLedgers` (no user boundary)

### Suggested fix (when prioritized)

Cloud source of truth + **per-user local cache** + clear in-memory on auth change:

- Namespace storage: `workout-deck-ledger:<userId>`
- Never call unscoped `loadLocalLedger()` without a bound `userId`
- Clear in-memory + React workout state on sign-out / account switch
- One-time migration from legacy global key (with import prompt scoped to current user)
- Optional: pending sync queue + offline indicator for gym connectivity (separate from this security fix)

---

## P1 — `useAccurateTimer` fails ESLint (blocks CI)

**Status:** Open  
**Verified:** Yes — `npm run lint` exits non-zero

### Problem

`tick` is referenced inside its own `useCallback` before the hook linter considers it stably declared (`react-hooks/immutability`). Blocks a clean lint/ship path.

### Relevant files

- `src/hooks/useAccurateTimer.ts` (around line 61–74)

### Suggested fix (when prioritized)

Restructure the RAF loop so the frame callback does not self-reference via `useCallback` in a way that trips the rule — e.g. store `tick` in a ref, use a plain function inside `useEffect`, or split start/stop lifecycle from the callback identity.

---

## P1 — `EditActivityModal` fails ESLint (blocks CI)

**Status:** Open  
**Verified:** Yes — `npm run lint` exits non-zero

### Problem

Synchronous `setState` inside `useEffect` when `day` changes (`react-hooks/set-state-in-effect`). Same lint failure blocks release validation.

### Relevant files

- `src/components/EditActivityModal.tsx` (around line 23–37)

### Suggested fix (when prioritized)

Derive draft state without an effect — e.g. key the modal on `day.date` and initialize state from props, use a small reset helper on open, or compute drafts during render when `day` is non-null (pattern per React docs: avoid syncing props to state via effect).

---

## P1 — Workout sanctity (no lost logs, no background disruption)

**Status:** Partially addressed — not robust enough for “under no circumstance”  
**Priority:** High when hardening for daily trust / multi-device / mobile

### Policy

While a workout is `active`:

- **Data:** Set logs must never disappear once saved.
- **UX:** Background processes must not kick the user to home or remount the app.
- **Rule:** Only the workout logger may write/merge the ledger during an active session. Cloud sync is async and never blocks the UI.

### What’s already in place

| Safeguard | Status |
|-----------|--------|
| Local write before cloud on every set (`upsertSession` → `persistLedger` first) | Done |
| Auth token refresh no longer re-hydrates ledger for same user | Done |
| `AuthGate` loading only blocks on first ledger load, not background refresh | Done |
| Auto-resume today’s `active` session from ledger after remount | Done (`workoutResume.ts`) |

### Remaining gaps

| Gap | Risk |
|-----|------|
| No **workout lock** — tab-focus still runs `refreshMergedLedgerFromCloud()` during `active` sessions | Low data race on in-memory ledger; not zero |
| UI state (screen, exercise index, **timer**) lives only in React — remount loses timer/position | Disruption even when sets restore |
| Mid-workout cloud failures are silent (`console.error` only) | Data local-safe; user thinks they’re synced |
| **Finish / save partial** `await` cloud — UX breaks on network fail (local usually has `completed`/`partial`) | Trust / flow disruption |
| **“Refresh from cloud”** replaces local ledger with no guard during active workout | Can wipe unsynced sets if cloud is behind |
| No `beforeunload` warning on active workout with logged sets | Accidental refresh/close |
| Cross-account cache (see P1 above) | Wrong account, not mid-workout loss |

### Robustness assessment (current)

| Scenario | OK? |
|----------|-----|
| Solo user, same account, normal use | Mostly yes (after auth + resume fixes) |
| Tab switch / token refresh | Much better |
| Surprise remount | Recoverable via auto-resume |
| Bad Wi‑Fi during workout | Local data OK; cloud may lag |
| “Under no circumstance” / production-grade | **Not yet** |

### Target architecture (when prioritized)

**Layer 1 — Workout lock (highest impact)**  
- Derive `isWorkoutActive` from ledger or app state (`status === 'active'`).  
- While active: skip focus merge, skip auth re-hydrate, block pull-from-cloud.  
- Only `upsertSession` for the current session id may write.

**Layer 2 — Local-first finish**  
- Finish / partial: commit to disk immediately, show success UI always.  
- Cloud flush in background + retry queue.  
- Never `await` cloud in the set-logging path.

**Layer 3 — UI continuity**  
- Keep auto-resume.  
- Add `sessionStorage` for `sessionId`, exercise index (timer optional).  
- `AuthGate` never unmounts children when `isWorkoutActive`.

**Layer 4 — Dangerous user actions**  
- Disable or confirm “Refresh from cloud” while workout is active.

**Layer 5 — Observability**  
- Pending sync queue + “Saved locally · not synced” when queue non-empty.

### Suggested implementation order

1. Workout lock (pause background merge while `active`)
2. Local-first finish (don’t block completion on network)
3. Block/confirm pull-from-cloud during active workout
4. Sync queue + offline indicator
5. `sessionStorage` for nav/timer
6. Per-user cache (security item above)

### Relevant files

- `src/contexts/AuthProvider.tsx` — focus merge, auth hydrate, loading gate
- `src/services/ledgerRepository.ts` — `upsertSession`, `refreshMergedLedgerFromCloud`, `pullLedgerFromCloud`
- `src/hooks/useWorkoutLog.ts` — `persistSession`, finish/partial await
- `src/App.tsx` — screen state, auto-resume
- `src/utils/workoutResume.ts` — resume helpers
- `src/components/UserMenu.tsx` — sync buttons

---

## Verification command

```bash
npm run lint
```

Last confirmed failing: 2 errors (`useAccurateTimer.ts`, `EditActivityModal.tsx`).
