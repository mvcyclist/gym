# QA checklist & roadmap todos

Manual QA focus for **BusyDad Gym** before trusting daily use. Primary concern: **logging** (what gets written, what shows on the calendar, what coaching reads).

Use this after `npm run dev` on your dev account (`busydad94070@gmail.com`) unless noted.

**Legend:** `[ ]` = check manually · `✓` = implemented in code · `—` = deferred / not started

---

## 1. Strength workout logging (highest priority)

### Draft vs history (see [LOGGING_LIFECYCLE.md](../LOGGING_LIFECYCLE.md))

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| L1 | Start Push → **no** new row on home calendar until Finish/Save | [ ] | Draft only until confirm |
| L2 | Log sets mid-workout → refresh page → **today’s session resumes** | [ ] | Draft persistence |
| L3 | **Finish workout** (≥1 completed set) → appears on today in 7-day strip | [ ] | Status `completed` |
| L4 | Finish with skipped exercises → still saves as completed | [ ] | Skip is OK |
| L5 | **End workout** → Save progress → partial on calendar | [ ] | Opt-in partial |
| L6 | **End workout** → Discard → **nothing** on calendar | [ ] | No ghost rows |
| L7 | End workout with **0 completed sets** → discard only (no save dialog) | [ ] | |
| L8 | Pause mid-workout → leave → resume later **same day** → sets intact | [ ] | |
| L9 | Prior-day draft on next open → prompt → Discard → no calendar row | [ ] | |

### Set logging & coaching reads

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| L10 | Complete a set with weight + reps → next visit same exercise shows **last lift** | [ ] | `catalogExerciseId` keyed |
| L11 | Progression hint (↑ / → / form) matches what you actually logged last time | [ ] | Post-session card |
| L12 | Rest timer defaults sensible (bench ~180s, lateral raise ~90s, pull-ups ~180s) | [ ] | See [docs/test-cases.md](./test-cases.md) §4 |
| L13 | Reorder/remove exercises on start screen → session logs in that order | [ ] | Custom `exerciseOrder` |
| L14 | **Try another set ↻** on pre-workout → exercise list changes; Finish still logs correctly | [ ] | Template source |
| L15 | **Use my logged routines** (user menu) → Push matches last logged session exercises | [ ] | History template |

### Workout template / onboarding interaction

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| L16 | After onboarding, Push uses **history** if you have prior Push sessions | [ ] | Not generated-only |
| L17 | Edit routine → change equipment → **Keep current routine** → home unchanged, no partial profile saved | [ ] | Cancel edit |
| L18 | Edit routine → finish all 4 steps → new templates apply; **old sessions still in history** | [ ] | History not wiped |

---

## 2. Manual & cardio logging

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| M1 | Log Run from home → duration/distance saved → shows on today strip | [ ] | |
| M2 | Log Bike / Swim / Walk same way | [ ] | |
| M3 | Log **HIIT** → saves (catalog exists); shows on calendar | [ ] | Tracking UX still basic |
| M4 | Log Rest day or Mobility from home picker | [ ] | |
| M5 | Edit **past** day on snake → change types → saves → strip updates | [ ] | `replaceDayLog` |
| M6 | Edit **future** day → plan override → snake shows override | [ ] | `planOverrides` |
| M7 | Reset future day to recommended → override cleared | [ ] | |
| M8 | Duplicate Run+Run on same day → **deduped** in strip (one Run) | [ ] | |
| M9 | Manual log + completed Push same day → both visible or manual wins per policy | [ ] | See dedupe rules |

---

## 3. Calendar, recommendations & weekly plan

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| R1 | Today recommendation appears after ≥3 active days (or backfill) | [ ] | Readiness gate |
| R2 | Start today’s recommendation → opens correct workout/cardio/core | [ ] | |
| R3 | Weekly plan (future days) respects **plan overrides** from onboarding | [ ] | Only seeds if empty |
| R4 | HIIT in onboarding → appears Thu/Sat (or rotation) on plan strip | [ ] | |
| R5 | Palette includes only cardio you selected (+ strength always) | [ ] | |
| R6 | `wantsMobility: false` in profile → Mobility absent from palette | [ ] | |
| R7 | Core addon nudge after Push/Pull respects `wantsCore` | [ ] | **Not wired yet** — expect fail |

---

## 4. Sync & account safety

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| S1 | Sign in → existing cloud history loads (or import prompt) | [ ] | |
| S2 | Complete workout → Sync to cloud → second browser sees session | [ ] | |
| S3 | **Refresh from cloud** does not wipe unsynced local sets (when idle) | [ ] | Dangerous during active workout |
| S4 | Sign out → sign in **different** Google account → **no** other user’s history | [ ] | Per-user ledger keys |
| S5 | Dev: **Start from scratch** → profile reset; history optional clear | [ ] | Dev menu only |
| S6 | Dev: **Reset profile + history** → clean slate | [ ] | |

---

## 5. Onboarding (smoke)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| O1 | New account → 4-screen onboarding → lands on home | [ ] | |
| O2 | Close app mid-onboarding (new user) → resumes at last step | [ ] | Draft persisted |
| O3 | Bench clarifier (barbell + bench, no rack) blocks Next until answered | [ ] | |
| O4 | Cardio “None” deselects others; Walk + Run multi-select OK | [ ] | |
| O5 | Screen 3 shuffle per strength day changes preview | [ ] | |
| O6 | Screen 4 add-ons (Mobility / Core toggles) saved to profile | [ ] | |

---

## 6. Automated tests (CI sanity)

Run before a release candidate:

```bash
cd gym && npm test && npm run build
```

| Suite | Covers |
|-------|--------|
| `workoutGeneratorService.test.ts` | Equipment → exercise templates, HIIT plan |
| `workoutTemplateService.test.ts` | History-first source, variants |
| `onboardingService.test.ts` | Edit cancel, no partial save |

**Not yet automated:** full workout finish flow, sync, UI e2e.

---

# Roadmap — what’s left

## A. Onboarding V1 (mostly done)

| Item | Status | Notes |
|------|--------|-------|
| UserProfile + local repo | ✓ Done | No Supabase profile sync |
| 4-screen onboarding UI | ✓ Done | |
| Generator + unit tests | ✓ Done | |
| HIIT as full cardio modality | ✓ Done | |
| Auth gate + resume draft (new users) | ✓ Done | |
| User menu (sync, edit, dev reset) | ✓ Done | |
| Template sources (history / classic / generated / random) | ✓ Done | |
| Cancel edit without saving (`Keep current routine`) | ✓ Done | |
| **`wantsCore` → addon nudge behavior** | — Todo | Saved on profile; engine ignores flag |
| **Lightweight settings** (edit equipment/cardio without 4 screens) | — Todo | Full re-onboarding only today |
| **Profile sync to Supabase** | — Deferred | Local-only V1 |
| Onboarding draft includes `templateSources` on resume | — Todo | Minor gap |

---

## B. Logging & history hardening

From [LOGGING_LIFECYCLE.md](../LOGGING_LIFECYCLE.md) acceptance criteria still open or worth re-verifying:

| Item | Status | Notes |
|------|--------|-------|
| Finish workout → single `completed` row on calendar | ✓ Intended | **Re-verify L3** |
| `getLastExercisePerformance` reads **completed only** | ✓ Policy in `historyQueryPolicy` | **Re-verify L10–L11** |
| No `active`/`paused` in history ledger | ✓ Migration done | Spot-check Supabase |

From [BACKLOG.md](../BACKLOG.md):

| Item | Priority | Status |
|------|----------|--------|
| Workout lock during active session (skip cloud merge) | P1 | Partial — draft split helps; confirm under load |
| Local-first finish (don’t block UI on cloud await) | P1 | Todo |
| Block/confirm **Refresh from cloud** during workout | P1 | Todo |
| Sync queue + “Saved locally · not synced” indicator | P2 | Todo |
| `sessionStorage` for nav/timer on remount | P2 | Todo |
| ESLint: `useAccurateTimer` | P1 | Open — blocks clean `npm run lint` |
| ESLint: `EditActivityModal` | P1 | Open — blocks clean `npm run lint` |

---

## C. Foundation roadmap ([FOUNDATION_ROADMAP.md](../FOUNDATION_ROADMAP.md))

| Phase | Status | What’s left |
|-------|--------|-------------|
| **0–4** History, repos, query layer, sync queue, per-user cache | ✓ Done | Maintain; don’t bypass query layer |
| **5** Extract `packages/core` (mobile) | — Not started | When mobile shell begins |
| **6** Authoritative cloud reads (multi-device coaching) | — Not started | Same last-lift on phone + web |

**Safe to build in parallel:** workout UX, catalog content, recommendation **rules** (pure functions), onboarding polish.

**Defer:** new coaching surfaces that bypass `historyQueryService`; heavy weekly-plan UX until reads are unified.

---

## D. Product / UX backlog (post-onboarding)

| Item | Notes |
|------|-------|
| HIIT cardio UX polish | In plan + log; onboarding still says “tracking coming soon” |
| Recommendation engine uses `defaultWeeklyPlan` from profile | Today: dynamic scoring + overrides on home |
| Mobile / PWA layout | Onboarding grids desktop-first |
| Browser e2e tests | Onboarding + finish workout happy path |
| `packages/core` extraction | Phase 5 gate for React Native |

---

## Suggested QA order (30–45 min)

1. **L1–L9** — draft/history sanctity (most important)
2. **L10–L15** — coaching reads your real logs
3. **M1–M8** — manual/cardio + snake edits
4. **L16–L18** + **O*** — onboarding didn’t clobber history
5. **S1–S4** — sync + account isolation (if using Supabase)

Tick boxes in this file as you go. If L1–L11 pass on your account, logging is in good shape for daily training.

---

*Last updated: onboarding V1 + template sources + edit-cancel. Aligns with [FOUNDATION_ROADMAP.md](../FOUNDATION_ROADMAP.md), [BACKLOG.md](../BACKLOG.md), [LOGGING_LIFECYCLE.md](../LOGGING_LIFECYCLE.md).*
