# Check-in binary model — v2

**Status:** supersedes the check-in resolver described in [movement-pattern-refactor-spec.md](./movement-pattern-refactor-spec.md) §3 and the worked examples in [20-recommended-workout-e2e.md](./20-recommended-workout-e2e.md) §4–§7. Those documents remain as historical context for *why* the original three/four-level model was built; this document is the current source of truth for `checkInService.ts` and the Recommended flow UI.

**Why this superseded the original model:** the original resolver had two fatigue levels (`meh` / `beat_up`) and four region levels (`fine` / `sore` / `stiff` / `achy`). Walking real scenarios through it surfaced two problems: (1) `meh` and `beat_up` always produced identical workouts once volume floored at 1 set on a 2-set template, and (2) `sore` and `stiff` were no-ops whenever global feeling was already "not 100%" — three of four region options did nothing distinguishable. Rather than engineer artificial differentiation to justify keeping those levels, this spec collapses both axes to binary and only keeps mechanisms that actually produce different outcomes.

---

## 1. The model

Two binary questions, asked in sequence:

1. **Global: "How are you feeling today?"** → `100%` or `Not quite`
2. **Regions (only asked if `Not quite`):** per region, `Fine` or `Bothering me`

```typescript
type GlobalFeeling = '100' | 'not_100' | 'skip'   // 'skip' = sick / sharp pain, unchanged from v1
type RegionStatus = 'fine' | 'bothering'

type BodyRegion =
  | 'knees' | 'hips' | 'lower_back'
  | 'front_shoulder' | 'upper_back' | 'elbows_wrists'

interface CheckIn {
  global: GlobalFeeling
  regions: Record<BodyRegion, RegionStatus>   // only populated if global === 'not_100'
}
```

`REGION_TO_PATTERNS` mapping is unchanged from v1 — still six regions gating the six primary patterns, same fan-out:

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

---

## 2. The core rule: specific beats vague, it doesn't stack with it

If `global === '100'`, skip regions entirely — no region questions are asked, every pattern resolves to `heavy` at full sets. There is no "100%, but achy knee" state. If something is bothering you, you are not 100%, by definition — this was a deliberate simplification, not an oversight (see conversation history if this needs re-litigating).

If `global === 'not_100'`, there are exactly two outcomes depending on whether **any** region was flagged `bothering`:

- **Vague** (`not_100`, all regions `fine`) — no located explanation for feeling off. This is the case the whole "not 100%" caution exists for. Every pattern is capped at `moderate` tier, 1 set.
- **Specific** (`not_100`, at least one region `bothering`) — the flagged region(s) explain the "not 100%." This is trusted as a complete answer: **patterns gated by a bothering region drop to `low_impact`; every other pattern returns to `heavy`, full sets** — as if the person had said "100%, except for X."

**This is the one rule that changed most recently in this thread** and is easy to get backwards: a named reason does not stack on top of the vague-fatigue cap. It replaces it. An unflagged pattern on a "not 100%, knees bothering me" day is not "moderate because you're not 100%" — it's heavy, because nothing about that pattern was flagged as a problem.

---

## 3. Resolution logic

```typescript
function resolveLoadTier(
  pattern: MovementPattern,
  checkIn: CheckIn,
): LoadTier {
  if (checkIn.global === '100') return 'heavy'

  const anyBothering = Object.values(checkIn.regions).some(s => s === 'bothering')
  if (!anyBothering) return 'moderate'   // vague — the only case this cap applies

  const gatingRegions = Object.entries(REGION_TO_PATTERNS)
    .filter(([, patterns]) => patterns.includes(pattern))
    .map(([region]) => region as BodyRegion)

  const patternBothered = gatingRegions.some(r => checkIn.regions[r] === 'bothering')
  return patternBothered ? 'low_impact' : 'heavy'   // named reason replaces the vague cap
}

function resolveSets(
  pattern: MovementPattern,
  checkIn: CheckIn,
): number {
  if (checkIn.global === '100') return 2   // matches template default; not hardcoded to 2 in practice — use templateSets

  const anyBothering = Object.values(checkIn.regions).some(s => s === 'bothering')
  if (!anyBothering) return 1   // vague fatigue — cut volume everywhere, no exceptions

  return 2   // named reason is trusted — full volume, regardless of which tier this pattern resolved to
}
```

**Note on `resolveSets` returning a flat `2`:** this mirrors the Full Body template's default set count, which happens to be 2 for every classic slot. If Push/Pull/Leg templates ever use a different default set count per exercise, this should read from `templateSets` rather than hardcoding 2 — flagging so it isn't copy-pasted as a magic number into a context where it's wrong.

**What this deprecates from v1:**
- `VolumeTier` (`full` / `reduced` / `minimal`) — collapsed to a plain set count (1 or template default), since there's no longer a three-way distinction to carry
- `GLOBAL_VOLUME_TIER`, `VOLUME_SET_COUNT`, `VOLUME_LOAD_FACTOR` — no longer needed; `VOLUME_LOAD_FACTOR` was never wired into the UI per §10 of the e2e doc anyway, so nothing shipping today depends on removing it
- Per-pattern `sore` volume bump (§4.2 of the e2e doc) — `sore` no longer exists as a region status; its intent (local fatigue reducing volume for just that pattern) is superseded by the specific/vague split above, which already produces per-pattern volume differences for a more legible reason

---

## 4. Manual override — tier-restricted dropdown

New in this pass, not present in v1 at all. Each resolved pattern slot is shown with a dropdown of exercise options, not a fixed pick.

**Rule: the dropdown offers the resolved tier and anything more conservative — never less conservative.**

```typescript
const TIER_ORDER: LoadTier[] = ['heavy', 'moderate', 'low_impact']

function allowedOverrideTiers(resolvedTier: LoadTier): LoadTier[] {
  return TIER_ORDER.slice(TIER_ORDER.indexOf(resolvedTier))
}
```

- A pattern resolved to `heavy` → dropdown includes heavy, moderate, and low_impact options (full downgrade freedom)
- A pattern resolved to `moderate` → dropdown includes moderate and low_impact only (no upgrading back to heavy)
- A pattern resolved to `low_impact` → dropdown is locked to low_impact variants only

**Why this is restricted and not fully open:** the whole point of the check-in is that the app acts on the answer. If a bothering-knee flag resolves squat to `low_impact` but the dropdown still let you pick Barbell Back Squat, the check-in step becomes decorative — you could always just override it away. Downgrading is always safe to allow (the person is choosing to be more cautious than necessary); upgrading past what the check-in determined is not, since it silently defeats the pain signal that was just given.

**This also resolves a scenario that would otherwise need a third global state.** Someone who is generally fatigued *and* has a specific bothering knee can't express both through the two check-in questions (the specific answer wins, per §2) — but they can still manually downgrade any other pattern via its dropdown, even though it resolved to `heavy`. The override exists precisely to cover this gap without adding conversation-flow complexity to the check-in itself.

**UI implication:** dropdown options should be grouped by tier (e.g. `<optgroup>`) so the person can see there *would* be a heavier option, it's just outside what today's check-in allows — the restriction should be visible, not silent.

---

## 5. Worked examples

Assume Full Body, all six classic slots available in every tier, all equipment on hand.

| # | Global | Regions | Squat | Hinge | H-Push | H-Pull | V-Push | V-Pull |
|---|--------|---------|-------|-------|--------|--------|--------|--------|
| 1 | 100% | *(not asked)* | Heavy · 2 | Heavy · 2 | Heavy · 2 | Heavy · 2 | Heavy · 2 | Heavy · 2 |
| 2 | Not 100% | all fine | Mod · 1 | Mod · 1 | Mod · 1 | Mod · 1 | Mod · 1 | Mod · 1 |
| 3 | Not 100% | knees bothering | **Low · 2** | Heavy · 2 | Heavy · 2 | Heavy · 2 | Heavy · 2 | Heavy · 2 |
| 4 | Not 100% | front shoulder bothering | Heavy · 2 | Heavy · 2 | **Low · 2** | Heavy · 2 | **Low · 2** | Heavy · 2 |
| 5 | Not 100% | hips + upper back bothering | **Low · 2** | **Low · 2** | Heavy · 2 | **Low · 2** | Heavy · 2 | **Low · 2** |

Row 3 is the case from this thread's discussion: naming the knee protects the squat and returns everything else to full heavy — a meaningfully different (and more useful) result than v1, where "not 100%" alone would have capped every pattern at moderate regardless of what was actually named.

---

## 6. Code entry points affected

Same files as the original e2e doc (§ "Code entry points"), updated scope:

| Piece | File | Change |
|-------|------|--------|
| Check-in resolver | `src/services/checkInService.ts` | Replace `resolveLoadTier` / `resolveVolumeTier` (v1, region-only + separate volume tier) with the binary versions in §3 above. Remove `VolumeTier`, `GLOBAL_VOLUME_TIER`, `VOLUME_SET_COUNT`, `VOLUME_LOAD_FACTOR`. |
| Region → pattern map | `src/services/checkInService.ts` | `REGION_TO_PATTERNS` unchanged |
| UI flow | `src/components/RecommendedWorkoutFlow.tsx` | Step 0 becomes a 2-option binary choice, not 4. Step 1 (regions) only renders if global is `not_100`. Preview step needs new dropdown-per-slot UI (§4) replacing the static exercise list. |
| Build exercise list | `src/services/recommendedWorkoutService.ts` | Slot resolution now needs to expose the full tier-filtered pool per slot (for the dropdown), not just the single picked exercise — `pickFromTierPool` should return the filtered pool, with the existing pick logic (preferred default → first in pool → equipment fallback) used only to set the dropdown's initial selection |

---

## 7. Open items

- **`resolveSets` hardcodes `2`** — should read from template default set count once Push/Pull/Leg slots are wired through the same resolver (see note in §3)
- **Dropdown pool depth per tier** — some patterns currently have only one option in a given tier in the catalog (e.g. `vertical_pull` heavy = pull-ups only). A single-option dropdown is a degenerate case worth deciding how to render (disabled/no dropdown vs. a one-item list) — not a logic problem, a UI polish question
- **PPL accessory slots** — this spec only covers the six primary pattern slots. Accessory slot behavior (curls, laterals, etc.) is unchanged from the original e2e doc §3: volume-adjusted, no tier swap, no dropdown — confirm this is still the intended scope before Push/Pull/Leg get the dropdown treatment
