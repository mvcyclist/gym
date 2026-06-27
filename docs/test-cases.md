# Test Cases

Covers the pure-logic layer: session coaching, exercise catalog, and exercise history matching.
No React, no DOM. These are the areas where bugs have actually been caught in production.

---

## 1. `evaluateCase` — progression decision

The internal function that decides whether a session warrants a weight increase, hold, or drop.

| # | Description | Reps logged | Rep ceiling | Expected case |
|---|-------------|-------------|-------------|---------------|
| 1.1 | All sets at or above ceiling | [10, 10, 10] | 10 | 1 (increase) |
| 1.2 | All sets one below ceiling (threshold = ceiling − 1) | [9, 9, 9] | 10 | 1 (increase) |
| 1.3 | Mixed — some below threshold, no significant drop | [8, 9, 10] | 10 | 2 (stay) |
| 1.4 | First set strong, later set drops >25% | [10, 7, 6] | 10 | 3 (drop) |
| 1.5 | All sets below floor | [4, 4, 4] | 10 | 2 (stay) — not a drop unless relative |
| 1.6 | Single set at ceiling | [10] | 10 | 1 (increase) |
| 1.7 | Empty reps array | [] | 10 | 2 (stay) |
| 1.8 | First set 0 reps (logged as 0) | [0, 8, 8] | 10 | 2 (stay) — zero first set should not trigger drop |

---

## 2. `getProgressionRecommendation` — pre-session recommendation

| # | Description | Setup | Expected |
|---|-------------|-------|----------|
| 2.1 | No history → first session | lastPerformance = null | case 5, suggestedWeightLbs = null |
| 2.2 | Last session hit ceiling → increase weight | sets at ceiling, daysAgo = 3 | case 1, suggestedWeightLbs = lastWeight + increment |
| 2.3 | Last session below ceiling, no drop → stay | sets mid-range, daysAgo = 3 | case 2, suggestedWeightLbs = lastWeight |
| 2.4 | Last session had significant rep drop → stay with form cue | [10, 6, 5], daysAgo = 3 | case 3, suggestedWeightLbs = lastWeight |
| 2.5 | Last session > 14 days ago → conservative reset | daysAgo = 20, weighted exercise | case 4, suggestedWeightLbs ≈ lastWeight × 0.9 rounded to increment |
| 2.6 | Stale threshold does NOT apply to bodyweight exercises | daysAgo = 20, bodyweight_reps | case 1/2/3 based on reps — NOT case 4 |
| 2.7 | Time-based exercise → always returns case 5 | coachingMode = 'time' | case 5 |
| 2.8 | weightIncrement is always populated | any case | weightIncrement === catalog.weightIncrementLbs ?? 5 |
| 2.9 | Reset weight is rounded to increment | topWeight = 113, 14+ days ago | resetWeight = round(113 × 0.9, 5) = 100 |

---

## 3. `getPostSessionNextCard` — next session card from actual logged sets

This is the function that had the bug (was using pre-session rec instead of actual sets).

| # | Description | Completed sets | Expected card title |
|---|-------------|---------------|---------------------|
| 3.1 | All sets at ceiling → increase | [{weight:115, reps:10}, ×3], ceiling=10 | "↑ Increase to 120 lbs" |
| 3.2 | Sets below ceiling, no drop → stay | [{weight:115, reps:8}, ×3], ceiling=10 | "→ Stay at 115 lbs" |
| 3.3 | Significant rep drop → stay with drop message | [{weight:115, reps:10}, {weight:115, reps:6}], ceiling=10 | "→ Stay at 115 lbs" (drop body copy) |
| 3.4 | Mixed weights — uses max weight | [{weight:100, reps:8}, {weight:115, reps:8}] | card uses 115, not 100 |
| 3.5 | No numeric sets (all BW) → returns null | [{weight:'BW', reps:10}] | null |
| 3.6 | Empty completed sets → returns null | [] | null |
| 3.7 | New weight respects weightIncrement | topWeight=115, ceil hit, increment=2.5 | suggestedWeightLbs = 117.5 |
| 3.8 | Reps of 0 are excluded | [{weight:115, reps:0}, {weight:115, reps:10}] | only the reps:10 set counts |

---

## 4. `getDefaultRestSeconds` — rest duration from catalog

The bug here was pullover being misclassified as compound (180s instead of 90s) and pull-ups getting bodyweight default (60s) instead of the override (180s).

| # | Exercise | Expected seconds | Reason |
|---|----------|-----------------|--------|
| 4.1 | `barbell_bench_press` | 180 | compound_upper |
| 4.2 | `dumbbell_pullover` | 90 | isolation_upper (was compound — was a bug) |
| 4.3 | `pull_ups` | 180 | restSeconds override on catalog entry |
| 4.4 | `lateral_raises` | 90 | isolation_upper |
| 4.5 | `barbell_back_squat` | 180 | compound_lower |
| 4.6 | `trx_hamstring_curl` | 60 | bodyweight_reps |
| 4.7 | `plank` | 60 | coachingMode = time |
| 4.8 | exercise with explicit `restSeconds: 120` | 120 | override wins over class default |

---

## 5. `getRepRangeForCatalog` — rep range lookup

| # | Exercise | Expected floor | Expected ceiling |
|---|----------|---------------|-----------------|
| 5.1 | compound_upper | 6 | 10 |
| 5.2 | compound_lower | 6 | 10 |
| 5.3 | isolation_upper | 10 | 15 |
| 5.4 | isolation_lower | 10 | 15 |
| 5.5 | exercise with no movementClass | null | null |

---

## 6. Exercise catalog integrity

Sanity checks on the catalog itself — catch typos or misconfiguration.

| # | Check | Expected |
|---|-------|----------|
| 6.1 | All catalog IDs are unique | no duplicates |
| 6.2 | All weighted exercises have weightIncrementLbs set | no undefined |
| 6.3 | `dumbbell_pullover` movementClass | isolation_upper |
| 6.4 | `pull_ups` has restSeconds override | 180 |
| 6.5 | All exercises have coachingMode set | no undefined |

---

## 7. `getSetFeedback` — between-set feedback

| # | Description | Input | Expected tone |
|---|-------------|-------|---------------|
| 7.1 | Last set, all near ceiling → strong | [10,10,10], ceil=10, set=3 of 3 | green |
| 7.2 | Last set, significant drop → form cue | [10,6,5], ceil=10, set=3 of 3 | amber |
| 7.3 | Last set, solid middle → keep building | [8,8,8], ceil=10, set=3 of 3 | green |
| 7.4 | Set 1, hit ceiling | reps=10, ceil=10 | green |
| 7.5 | Set 1, below floor | reps=3, floor=6 | amber |
| 7.6 | Set 1, mid-range | reps=8, floor=6, ceil=10 | null (no feedback) |
| 7.7 | Set 2, rep drop >25% from set 1 | [10, 6], set=2 | amber |
| 7.8 | reps logged = 0 → no feedback | reps=0 | null |

---

## Notes

- `evaluateCase` is internal to `sessionCoaching.ts` — tests call it indirectly via `getPostSessionNextCard` or `getProgressionRecommendation`
- The stale threshold (14 days) and reset multiplier (0.9) are magic constants — tests should pin them so a future change is explicit
- Rep ceiling trigger is `>= ceiling - 1` (not strictly `=== ceiling`) — test 1.2 covers this
