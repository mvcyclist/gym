# Recommended workout — e2e selection guide

> **Superseded for check-in logic & UI:** §§4–7 (volume / load / worked examples) and the multi-level feeling UI in §1 describe the v1 model. Current source of truth is [21-checkin-binary-model.md](./21-checkin-binary-model.md) and [22-checkin-ui-spec.md](./22-checkin-ui-spec.md). This doc remains useful for category resolution (§3), accessories, and historical context.

**Purpose:** Explain how **Recommended** turns a check-in into a concrete exercise list, so you can walk the product and iterate on the experience.

**Related:** [21-checkin-binary-model.md](./21-checkin-binary-model.md) · [22-checkin-ui-spec.md](./22-checkin-ui-spec.md) · [movement-pattern-refactor-spec.md](./movement-pattern-refactor-spec.md) (Phases 3–4) · [19-phase1-2-pattern-pool-ui-compat.md](./19-phase1-2-pattern-pool-ui-compat.md)

**Code entry points**

| Piece | File |
|-------|------|
| UI flow | `src/components/RecommendedWorkoutFlow.tsx` |
| Load / volume tiers | `src/services/checkInService.ts` |
| Build exercise list | `src/services/recommendedWorkoutService.ts` |
| Slots (patterns + classic defaults) | `src/data/workoutTemplateSlots.ts` |
| Catalog pools | `src/data/exerciseCatalog.ts` |
| Equipment match | `src/services/slotResolver.ts` (`matchesEquipment`) |

---

## 1. User journey (what you see)

Home → **Strength** row → **Recommended** (“Based on how you feel”)

1. **Overall feeling** — sets session volume (fatigue)  
2. **Body regions** — Fine / Sore / Stiff / Achy (pain + local fatigue)  
3. **Preview** — title, volume subtitle, numbered lifts + load-tier badges  
4. **Start workout** — one-off session (does **not** save as your template source)

**Skip today** → no workout built; rest message only.

---

## 2. Mental model: two dials that don’t mix

| Dial | Driven by | Affects |
|------|-----------|---------|
| **Volume** (how much) | Overall feeling + **Sore** on a region | Set count |
| **Load tier** (which exercise) | **Stiff** / **Achy** on a region | Which catalog exercise is picked |

- **Sore** does **not** change the exercise — only volume.  
- **Stiff / Achy** do **not** change set count by themselves — only which variant.  
- Overall feeling never swaps the exercise; it only changes volume.

---

## 3. Which workout type is recommended?

`resolveRecommendedCategory()`:

1. Profile `programType === 'full_body'` → **`full_body`**
2. Else if today’s focus is Push / Pull / Leg → that category  
3. Else → **`push`**

Full Body recommended sessions use **main-lift pattern slots only**. Guided warm-up / core / mobility still run in the Full Body flow after start (not chosen by check-in).

PPL recommended sessions also include **accessory** slots from the classic template (curls, laterals, etc.), with volume applied but **no** load-tier swap (accessories stay on their `defaultCatalogExerciseId`).

---

## 4. Volume selection (fatigue)

### 4.1 From overall feeling

| Feeling | Volume tier | Sets rule |
|---------|-------------|-----------|
| Good to go | `full` | template sets as-is |
| A bit meh | `reduced` | `max(1, templateSets − 1)` |
| Beat up | `minimal` | always `1` set |
| Skip | — | no session |

Preview subtitle (from global only):

- full → “Good to go — full volume”  
- reduced → “Dialed back — reduced volume”  
- minimal → “Easy day — minimal volume”

### 4.2 Local sore bump

For each **pattern**, if any gating region for that pattern is **Sore**, volume drops **one more step**:

`full → reduced → minimal` (floors at minimal)

Example: Good + sore knees → squat volume becomes **reduced** (even though global is full). Bench (not gated by knees) stays full.

---

## 5. Load-tier selection (pain)

### 5.1 Region → patterns

| Body region | Patterns affected |
|-------------|-------------------|
| Knees | squat |
| Hips | squat, hinge |
| Lower back | hinge |
| Front of shoulder | horizontal_push, vertical_push |
| Upper back | horizontal_pull, vertical_pull |
| Elbows / wrists | horizontal_push, horizontal_pull |

### 5.2 Status → tier (per pattern)

Start at **`heavy`**. For each gating region:

| Status | Effect |
|--------|--------|
| Fine | none |
| Sore | none on load (volume only — §4.2) |
| Stiff | tier → `moderate` (unless already `low_impact`) |
| Achy | tier → `low_impact` (hard floor) |

Worst pain wins across regions that gate the same pattern (achy beats stiff).

---

## 6. Exact exercise pick (e2e precision)

For each **pattern slot** in the template:

```
slot (pattern + defaultCatalogExerciseId + template sets/reps)
        │
        ├─ loadTier  = resolveLoadTier(pattern, regions)
        ├─ volumeTier = resolveVolumeTier(pattern, global, regions)
        │
        ▼
pickFromTierPool(pattern, loadTier, equipment, preferredId=default)
        │
        ▼
Exercise { catalog id, name, sets = VOLUME_SET_COUNT[volume], reps from slot, … }
```

### 6.1 Full Body slots (classic defaults)

| Slot | Pattern | Preferred default |
|------|---------|-------------------|
| full_body-1 | squat | `barbell_back_squat` |
| full_body-2 | horizontal_push | `barbell_bench_press` |
| full_body-3 | vertical_pull | `pull_ups` |
| full_body-4 | hinge | `barbell_romanian_deadlift` |
| full_body-5 | vertical_push | `overhead_press` |
| full_body-6 | horizontal_pull | `chest_supported_row` |

### 6.2 Pool pick order (`pickFromTierPool`)

1. Take catalog rows with that **pattern + exact loadTier**  
2. Keep only rows that **match profile equipment** (`equipmentKeys` AND; bench press also needs `canBench` / rack rule)  
3. If the slot’s **`defaultCatalogExerciseId`** is still in that filtered pool → **use it**  
4. Else → **first** remaining row in catalog order for that tier  
5. If empty → soften tier: try more forgiving tiers first (`heavy→moderate→low_impact` direction from the requested tier), still equipment-filtered  
6. Last resort → ignore equipment and pick from the requested tier (or the default id)

**Implication for iteration:** “first in catalog order” is the soft fallback when the classic default isn’t eligible for that tier. Changing catalog order or adding preferred-id lists will change picks.

### 6.3 What the preview badge means

Badge = **resolved load tier for that slot** (Heavy / Moderate / Low impact), not “how hard the exercise feels.”  
A TRX squat on an achy-knee day shows **Low impact** even if the movement is still challenging.

### 6.4 Sets on the card

Displayed `sets` = volume-adjusted count.  
`reps` stay the template display string (e.g. `6–10`).  
Suggested weight × `VOLUME_LOAD_FACTOR` (0.9 / 0.75) is **spec’d** for coaching but **not applied in the UI yet** — only set count changes today.

---

## 7. Worked examples (use these while clicking)

Assume Full Body program, gear: barbell + rack + bench + dumbbells + pullup + TRX, canBench = true.

### A — All good

- Feeling: Good · all regions Fine  
- → 6 classic lifts, all **Heavy**, 2 sets each (template)  
- Subtitle: “Good to go — full volume”

### B — Achy knees only

- Feeling: Good · knees Achy  
- → squat loadTier = `low_impact` → not back squat; first equipment-matching low-impact squat (e.g. TRX assisted / similar)  
- Other lifts stay Heavy, full sets  
- Badge on #1: **Low impact**

### C — Beat up, no pain

- Feeling: Beat up · all Fine  
- → same Heavy defaults (barbell lifts)  
- → **1 set** each  
- Subtitle: “Easy day — minimal volume”

### D — Meh + sore front shoulder

- Feeling: Meh · front shoulder Sore  
- → global volume reduced; horizontal + vertical **push** volume drops again → **minimal** (1 set) for those slots  
- Load tier still Heavy (sore ≠ stiff/achy)  
- Pull / squat / hinge volume stay at reduced only

### E — Stiff upper back

- Feeling: Good · upper back Stiff  
- → horizontal_pull + vertical_pull → **moderate** tier  
- Prefer defaults only if those ids are tagged moderate; else first moderate row that matches gear (may leave classic pull-ups / chest-supported row)

### F — Skip

- → no preview list; rest copy only

---

## 8. After “Start workout”

- Session is created with the **frozen** `Exercise[]` (catalog ids + set counts)  
- Does **not** write `templateSources.recommended`  
- Full Body still: warm-up audio → main carousel (recommended lifts) → core → mobility  
- Logging / history / coaching use `catalogExerciseId` as usual

---

## 9. Iteration checklist (product)

Use this while tuning the e2e feel:

| Question | Where to change |
|----------|-----------------|
| Wrong session type (FB vs Push)? | `resolveRecommendedCategory` |
| Wrong region → pattern mapping? | `REGION_TO_PATTERNS` in `checkInService.ts` |
| Stiff/achy too harsh or soft? | `resolveLoadTier` |
| Sore / meh / beat-up set counts? | `VOLUME_SET_COUNT` + `resolveVolumeTier` |
| Wrong exercise for a tier? | Catalog tags (`loadTier`, `equipmentKeys`) or pool order; preferred default on the slot |
| Prefer a specific TRX squat when achy? | Ensure that id is `squat` + `low_impact` + `trx`, and either first in pool or becomes the slot default for that path |
| Want weight suggestion reduced on meh days? | Wire `VOLUME_LOAD_FACTOR` into session coaching (not done yet) |
| Want accessories in Full Body recommend? | Currently skipped by design in `buildRecommendedWorkout` |
| Copy / steps / layout? | `RecommendedWorkoutFlow.tsx` |

---

## 10. Known gaps vs parent spec

- [x] Check-in UI + region/feeling model  
- [x] Load tier + volume tier resolution  
- [x] Pattern-pool pick with equipment + classic preferred id  
- [x] One-off start (no templateSources write)  
- [ ] `VOLUME_LOAD_FACTOR` on suggested weight in set logger  
- [ ] History-aware / difficulty-aware pick inside a tier (today: preferred default, else first in pool)  
- [ ] Explicit `TemplateSource: 'recommended'` in cycle UI (flow is entry-only via Recommended button)

---

## 11. Quick manual QA path

1. Home → Recommended  
2. Good → all Fine → confirm classic six + Heavy + 2 sets  
3. Start over → Good → knees Achy → confirm squat swapped + Low impact badge  
4. Start over → Beat up → all Fine → confirm same lifts, 1 set  
5. Start workout on Full Body → confirm guided warm-up still appears before main lifts  
