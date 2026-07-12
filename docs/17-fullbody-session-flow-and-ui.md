# Full Body — Session Flow & UI Spec (v1 handoff)

**Supersedes:** ordering shown in current build. **Extends:** doc 16 (exercise
selection) with warm-up content that doc 16 didn't cover.

**Related:** [15-full-body-program-migration.md](./15-full-body-program-migration.md), [16-fullbody-exercise-selection.md](./16-fullbody-exercise-selection.md)

---

## 1. Session order (locked)

```
1. Warm-up   (guided segment)
2. Main Lifts (logged session — unchanged)
3. Core      (guided segment)
4. Mobility  (guided segment)
```

**Bug in current build, not just an ordering issue:** the warm-up slot is currently
showing mobility content ("World's Greatest Stretch"). Reordering the existing 12
items won't fix this — warm-up needs its own distinct content (see Section 3), not
mobility content moved earlier in the sequence.

---

## 2. Two interaction patterns — not one

### Logged Session (Main Lifts only — unchanged)
Exactly what's already built: weight/reps grid, suggested weight from history, full
progression coaching, Add Set / Remove Set controls. No changes here.

### Guided Segment (Warm-up, Core, Mobility)
Replaces the SetLogger-style grid entirely for these three. No manual weight/rep
entry, no per-set grid, no "Target Reps / Done / Action" columns.

**Three states:**
1. **Preview** — movement names, count, estimated total time (e.g. "4 movements · ~5 min"). One Start button.
2. **In progress** — timer-driven (or manual Done for rep-based movements), one movement at a time. Timer is the v1 stand-in for future audio narration (Phase 5).
3. **Complete** — brief confirmation, **one segment log** (see §7), then transition to next part.

**Core trade-off (confirmed):** No weight-progression coaching in guided core v1.
Segment-level completion + duration only.

---

## 3. Warm-up content (new — not in doc 16)

Dynamic activation — not static holds (those belong in end-of-session Mobility).

| Movement | Type | Target |
|---|---|---|
| Arm circles | Dynamic, ~30–45 sec | Shoulders |
| Leg swings | Dynamic, ~30–45 sec | Hips |
| Bodyweight squat to stand | Dynamic, ~10–15 reps | Full body / squat prep |
| Glute bridges | Dynamic, ~10–15 reps | Hip hinge prep |

Zero equipment. Fixed flow every full-body day.

---

## 4. Time budget (~60 min target)

| Segment | Est. time |
|---|---|
| Warm-up | ~5 min |
| Main Lifts | ~34 min |
| Core | ~7–8 min |
| Mobility | ~5 min |
| **Total** | **~52 min** (+ ~8 min buffer) |

---

## 5. What doesn't change

- Main lift exercises (doc 16), core movements (weighted plank, hanging leg raise), mobility flow (doc 16) — content unchanged; only order + UI pattern changes.
- One `WorkoutSession` for the full day (doc 15).
- **Scope:** `programType === 'full_body'` only. PPL sessions keep existing all-logged carousel.

---

## 6. In-progress UX (movements) vs ledger (segments)

**In progress:** User still steps through individual movements inside each guided segment (timers / Done per movement per §2). This is presentation only.

**Ledger:** One simple log per guided segment when the user finishes or leaves that segment — not per movement, not per set.

| Segment | Ledger entry |
|---------|----------------|
| Warm-up | Did warm-up + duration |
| Core | Did core + duration |
| Mobility | Did mobility + duration |

Rep-based vs time-based still matters **in the UI** (timer auto-advance vs tap Done); it does **not** change what gets stored.

---

## 7. Locked implementation decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | **Segment transitions** | Short preview → Continue at each boundary (warm-up → main lifts → core → mobility). |
| 2 | **Overview sidebar** | Full session plan with segment headers; completed segments + current segment jumpable; future segments greyed (or jump with confirm). |
| 3 | **Guided logging** | **One log per guided segment** (warm-up, core, mobility). Fields: segment completed (or partial) + **elapsed duration**. Applies to all guided segments. Main lifts unchanged (per-exercise `ExerciseLog` + sets). |
| 4 | **Skip / leave mid-segment** | Allowed. Log **time spent** in that segment (partial completion + duration), then user can resume later or move on per existing session rules. |
| 5 | **Scope** | Full Body program only. |

### Implied simplifications (from §3)

- No per-movement `ExerciseLog` rows for guided segments.
- No per-set core history or weighted-plank progression in v1.
- No separate catalog/template slot logging for each warm-up movement — movements are **display content** inside the segment; template metadata can list them for preview without 16 ledger rows.
- Segment router: `warmup` → `main` (6 lifts) → `core` → `mobility`.

### Session ledger shape (sketch)

```typescript
// Main lifts — unchanged
ExerciseLog { exerciseId, catalogExerciseId, sets: SetLog[] }

// Each guided segment — one row, e.g.
ExerciseLog {
  exerciseId: 'segment-warmup' | 'segment-core' | 'segment-mobility',
  catalogExerciseId?: 'warmup_segment' | 'core_segment' | 'mobility_segment',
  exerciseName: 'Warm-up',
  sets: [], // or single synthetic completed marker
  segmentDurationSeconds?: number,
  segmentStatus?: 'completed' | 'partial',
}
```

Exact field names TBD at implementation; semantics are locked above.

---

*Last updated: decisions locked from review session.*
