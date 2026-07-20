# Workout builder — categories, time-fit, and session editing

**Status:** current. Covers everything built across the last several mocks: category tile grid with tags, time-target auto-fit, and the free-form session editor (reorder / swap / remove / add-back / core-mobility toggle).

**Pairs with:** [21-checkin-binary-model.md](./21-checkin-binary-model.md) (feeling/region resolver — unchanged, this spec builds on top of it), [22-checkin-ui-spec.md](./22-checkin-ui-spec.md) (dropdown mechanic — unchanged), [23-catalog-corrections.md](./23-catalog-corrections.md) (catalog tier data this all reads from).

**Reference mock:** `home-tags-and-autofit.html` — visual and interaction source of truth.

**Read this first if you're implementing:** almost every numeric/heuristic piece in this spec is marked **STUB** — a working default that unblocks the UI now, not a tuned final answer. Build the architecture so each stub can be swapped independently without touching the UI layer. The boundary between "UI contract" (stable, build against this) and "stub logic behind it" (expected to change) is called out explicitly in every section.

---

## 1. Flow order

```
Category tile grid
  → Time target (30 / 45 / 60 / no limit)
      → [if category === 'trx'] skip straight to session (no feeling/pain questions — see 21-checkin-binary-model.md §"TRX Day is a modifier")
      → [else] Feeling (100% / Not quite)
          → [if Not quite] Regions (Fine / Bothering, per pattern gated)
      → Auto-fit applied automatically against the time target
      → Session editor (fully editable — reorder, swap, remove, add-back, toggle core/mobility)
      → Finalize & start
```

Time is asked **before** feeling, deliberately — it's a calendar fact, not a readiness signal, and doesn't depend on anything the check-in produces. See §3 for why it must never influence tier/exercise selection.

---

## 2. Categories

**New concept, not in the original catalog spec** — a category is a named subset of the six primary movement patterns, used to scope both the tile grid and the exercise list.

```typescript
type CategoryId = 'full_body' | 'push' | 'pull' | 'leg' | 'upper' | 'trx'

interface CategoryDef {
  id: CategoryId
  label: string
  patterns: MovementPattern[]   // subset of the 6 primary patterns from movement-pattern-refactor-spec.md
}

const CATEGORIES: Record<CategoryId, CategoryDef> = {
  full_body: { id: 'full_body', label: 'Full Body', patterns: ['squat','hinge','horizontal_push','horizontal_pull','vertical_push','vertical_pull'] },
  push:      { id: 'push',      label: 'Push',       patterns: ['horizontal_push','vertical_push'] },
  pull:      { id: 'pull',      label: 'Pull',        patterns: ['horizontal_pull','vertical_pull'] },
  leg:       { id: 'leg',       label: 'Leg',         patterns: ['squat','hinge'] },
  upper:     { id: 'upper',     label: 'Upper Push-Pull', patterns: ['horizontal_push','vertical_push','horizontal_pull','vertical_pull'] },
  trx:       { id: 'trx',       label: 'TRX Day',     patterns: [/* same 6 as full_body */] },
}
```

`trx` is a **modifier category, not a pattern subset** — it uses all six patterns but forces `loadTier: 'low_impact'` on every one of them regardless of check-in answers, and skips the feeling/region steps entirely. Implement this as a flag on the category (`forceTier: 'low_impact', skipCheckIn: true`), not as a special-cased branch scattered through the flow logic.

**Accessory slots (Push/Pull/Leg's curls, laterals, etc.) are out of scope for this spec**, same boundary as [22-checkin-ui-spec.md] §6 — categories here only govern primary pattern slots.

---

## 3. Tile tags — **STUB, needs real training history**

Four tag types, visually distinct (see mock for exact styling):

| Tag | Meaning | Data needed |
|---|---|---|
| `recommended` | Single best pick today | Longest-untrained pattern set + recovery status |
| `recently_covered` | Overlaps significantly with a recently-trained category | Last N days of session history, pattern-set overlap calculation |
| `fine_today` | No strong signal, neutral | Default when neither of the above fires |
| `info` (TRX Day only) | Not a readiness judgment — describes modality, not timing | Static — TRX Day always shows this tag, never computed |

**STUB for now:** hardcode tag assignment (e.g. Full Body always `recommended`, Push/Upper always `recently_covered`, Pull/Leg always `fine_today`) to unblock the UI. **Real implementation** needs to read actual session history (the ledger, per `13-exercises-routines-storage.md`) and compute: (a) days since each pattern set was last trained, (b) overlap between a category's pattern list and what a recent session covered. This is a genuinely separate service (`categoryRecommendationService.ts` or similar) — keep the tile grid component reading from a simple `getTag(categoryId): TagType` function so the stub can be swapped for the real computation without touching the grid UI.

---

## 4. Time estimation — **STUB formula, needs real per-exercise data**

### 4.1 Current stub

```typescript
const WORKING_SET_SECONDS = 45   // STUB — flat estimate, not exercise-specific
const REST_BY_TIER: Record<LoadTier, number> = {
  heavy: 180, moderate: 120, low_impact: 60   // matches getDefaultRestSeconds()'s compound/bodyweight defaults — reused, not invented
}

function estimateSessionMinutes(session: SessionRow[], core: boolean, mobility: boolean): number {
  let seconds = 5 * 60   // warm-up, fixed
  session.forEach(row => {
    seconds += row.sets * (WORKING_SET_SECONDS + REST_BY_TIER[row.currentTier])
  })
  if (core) seconds += 10 * 60
  if (mobility) seconds += 10 * 60
  return Math.round(seconds / 60)
}
```

### 4.2 What's stubbed and what should replace it

- **`WORKING_SET_SECONDS = 45` is a flat guess for every exercise regardless of what it is.** A bodyweight TRX chest press and a barbell back squat do not take the same time per rep, and rep ranges already vary by `movementClass` (`REP_RANGES` in the catalog — 6-10 for compound, 10-15 for isolation). Real version should derive working-set time from the exercise's actual rep range and a per-rep tempo assumption, not one constant for everything.
- **`REST_BY_TIER` is already correctly sourced** from `getDefaultRestSeconds()`'s existing compound/isolation/bodyweight buckets — this part doesn't need new data, just needs to actually call that function per-exercise instead of using a tier-level flat lookup, since some catalog entries have a `restSeconds` override that a tier-level bucket would miss (e.g. `pull_ups` overrides to 180s regardless of tier bucket logic).
- **Warm-up (5 min), core (10 min), mobility (10 min) are all flat constants.** These segments don't have per-exercise catalog data behind them yet at all — worth deciding whether they ever will (i.e. should warm-up duration vary by category, the way main lifts do) or whether flat constants are actually fine here since these segments are more fixed-content than the main lifts are.

**Recommendation: land the stub as-is now** (it's good enough for the auto-fit UI to function and be tested), but track `estimateSessionMinutes` as a named function with a single call site so replacing its internals later doesn't require touching the auto-fit algorithm or the UI — they only depend on "give me a number of minutes for this session," not on how that number is computed.

---

## 5. Auto-fit algorithm

Runs automatically once a time target and (for non-TRX categories) the check-in resolve. Fully re-editable afterward — this is a starting point, not a lock.

```typescript
function autoFitToTarget(session: SessionRow[], target: number | null): AutoFitResult {
  let core = true, mobility = true
  const changes: string[] = []
  if (target === null) return { core, mobility, changes, session }   // "no limit" — skip entirely

  // Step 1: mobility off
  if (estimateSessionMinutes(session, core, mobility) > target) {
    mobility = false; changes.push('Mobility off')
  }
  // Step 2: core off
  if (estimateSessionMinutes(session, core, mobility) > target) {
    core = false; changes.push('Core off')
  }
  // Step 3: downgrade tier, biggest rest-time savings first, never past what the
  // check-in already allows (session rows only ever move toward low_impact, per
  // the same "resolved tier or more conservative" rule as the dropdown — 22-checkin-ui-spec.md §4)
  while (estimateSessionMinutes(session, core, mobility) > target) {
    const candidates = session.filter(r => !r.forceTrx && r.currentTier !== 'low_impact')
    if (candidates.length === 0) break
    candidates.sort((a, b) => REST_BY_TIER[b.currentTier] - REST_BY_TIER[a.currentTier])
    downgradeTier(candidates[0])   // heavy -> moderate -> low_impact, one step
    changes.push(`${candidates[0].patternLabel} → ${tierName(candidates[0].currentTier)}`)
  }
  // Step 4: drop a pattern, last resort only, never below 1 remaining
  while (estimateSessionMinutes(session, core, mobility) > target && session.length > 1) {
    const dropped = session.pop()
    changes.push(`${dropped.patternLabel} removed`)
  }

  return { core, mobility, changes, session }
}
```

**This cut order (mobility → core → tier downgrade → pattern drop) is a product decision, not an engineering default** — confirmed in conversation, but flagging that it's a real priority call: it assumes losing mobility costs less than losing a full lift, which is defensible but not automatically "correct." If this needs retuning later, it's isolated to this one function — the UI just renders whatever `AutoFitResult` comes back.

**Step 4 (pattern drop) will rarely fire in practice** — steps 1–3 usually buy back enough time on realistic target/session combinations. It's built as a real fallback rather than an assumed-unreachable case, but worth deciding later whether it's worth keeping given how rarely it triggers, versus simplifying to "3 steps, and if still over, just show the number in red and let the person manually remove something."

**Manual override always wins.** Once a person touches any dropdown, toggle, or remove/add-back control after auto-fit runs, that specific change is treated as intentional and won't be re-overridden by auto-fit again (auto-fit only runs once, at build time — it does not re-run reactively as the person edits).

---

## 6. Session editor state

```typescript
interface SessionRow {
  patternKey: MovementPattern
  currentName: string              // catalog exercise name, currently selected
  currentTier: LoadTier
  resolvedTier: LoadTier           // the check-in's original answer — dropdown ceiling, never changes after build
  sets: number
  reps: string                     // display string from the pattern, unaffected by tier/exercise swap
  forceTrx: boolean                // true only for TRX Day category
  autoAdjusted: boolean            // true if auto-fit touched this row and it hasn't been manually edited since
}

interface SessionState {
  category: CategoryId
  timeTarget: number | null
  rows: SessionRow[]               // order matters — this is also the reorder state
  removedPatterns: MovementPattern[]   // patterns cut via auto-fit step 4 or manual remove; still eligible for "add back"
  core: boolean
  mobility: boolean
}
```

**Reorder, remove, and add-back are pure client-side state operations** — no backend/resolver involvement:
- Reorder: swap two entries in `rows`
- Remove: move a row from `rows` to `removedPatterns`
- Add-back: move a pattern from `removedPatterns` back into `rows`, re-resolving its tier fresh via `resolveLoadTier()` (not restoring whatever tier it had before removal — if the check-in state hasn't changed, this produces the same result anyway, but re-resolving rather than caching keeps a single source of truth)

**Add-back is scoped to the category's original pattern list only** — confirmed in conversation as the default (Push can't add-back Squat, since Squat was never in Push's pattern list to begin with). If this needs to open up to any pattern regardless of category later, that's a scope change to `CategoryDef.patterns`, not a change to the add-back mechanism itself.

**Finalize** freezes `SessionState` into the existing `Exercise[]` shape the ledger already expects (per `13-exercises-routines-storage.md`) — no new persistence model needed. Same one-off, non-`templateSources`-writing behavior as the existing Recommended flow.

---

## 7. Component/file mapping

| Piece | File | Status |
|---|---|---|
| Category tile grid + tags | New: `src/components/CategoryPicker.tsx` | New component |
| Tag computation | New: `src/services/categoryRecommendationService.ts` | **Stub** — hardcoded per §3 |
| Time target step | New: `src/components/TimeTargetStep.tsx` | New component |
| Time estimation | New: `src/services/timeEstimateService.ts` | **Stub formula** — per §4 |
| Auto-fit | New: `src/services/autoFitService.ts` | Real logic, tunable priority order — per §5 |
| Session editor (reorder/remove/add-back/toggles) | New: `src/components/SessionEditor.tsx` | New component, extends the dropdown mechanic from `RecommendedWorkoutFlow.tsx` (22-checkin-ui-spec.md) |
| Feeling/region check-in | `src/components/RecommendedWorkoutFlow.tsx` | Existing, unchanged — reused as a step inside this larger flow |
| Load tier resolver | `src/services/checkInService.ts` | Existing, unchanged (21-checkin-binary-model.md) |
| Exercise pool queries | `src/data/exerciseCatalog.ts` | Existing, unchanged (post 23-catalog-corrections.md fix) |

---

## 8. Explicit stub list — what's safe to ship now, what needs a follow-up pass

| Item | Stubbed as | Real version needs |
|---|---|---|
| Tile tags (`recommended`/`recently_covered`/`fine_today`) | Hardcoded per category | Real session history + pattern-overlap calculation |
| Working-set time estimate | Flat 45s for every exercise | Per-exercise/rep-range-derived estimate |
| Rest-time estimate | Tier-level flat bucket | Should call `getDefaultRestSeconds()` per exercise (already mostly correct, just needs per-exercise granularity instead of tier-level) |
| Warm-up/core/mobility duration | Flat 5/10/10 min constants | Decide if these should ever vary, or confirm flat is fine long-term |
| Auto-fit cut order | Mobility → core → tier → pattern-drop | Confirmed product decision, but worth revisiting after real usage data |
| Pattern-drop step | Implemented, rarely triggers | Decide if worth keeping vs. simplifying to a 3-step auto-fit |

Nothing in this list blocks shipping the UI — every stub has a single, named call site, so the UI layer never needs to change when any of these get their real implementation.
