# QA: Phase 1–2 UI checklist

Manual checks that **existing UI still behaves correctly** after the pattern-pool / TemplateSlot backend swap. No new screens to exercise — smoke the paths you already use.

**Prereq:** `npm run dev`, logged in as usual.  
**Pass bar:** classic names, logging, and Full Body segments feel unchanged; no “Unknown exercise” in the set logger.

**Shortcut:** Home has a persistent **Strength** row — Push / Pull / Leg / Full Body — so you can open each start screen without the schedule or “Choose another” modal.

**Recommended (Phase 3):** Under that row, **Recommended → Based on how you feel** opens check-in (overall feeling → regions) → preview with load-tier badges → **Start workout**. Try achy knees and confirm squat is not barbell back squat.

Related: [19-phase1-2-pattern-pool-ui-compat.md](./19-phase1-2-pattern-pool-ui-compat.md) · automated: `npm test`

---

## 1. Classic defaults (“Classic routine”)

On each start screen, if you see **Your last session**, tap **Try another set ↻** until the label is **Classic routine**.

| # | Check | Pass? |
|---|--------|-------|
| D1 | **Push** list includes Bench, Pullover, OHP, Incline, Lateral Raises, Atomic Push-up, both tricep finishers, Close-Grip Push-ups, TRX Pike (10 moves) | [ ] |
| D2 | **Pull** starts with Pull-ups, Barbell Rows, DB rows, rear-delt / curls / TRX core finishers | [ ] |
| D3 | **Leg** starts with Back Squat, Hip Thrust, TRX Weighted Lunge, Hamstring Curl, Calf Raise, Side Tuck | [ ] |
| D4 | **Full Body → Main lifts** shows exactly 6: Back Squat, Bench, Pull-ups, RDL, OHP, Chest-Supported Row — **not** Warm-up / Core / Mobility as lifts | [ ] |
| D5 | Standalone **Core** (home / PPL path) shows Plank, Side Plank, Dead Bug, Hollow Hold, Mountain Climber, Pallof Press | [ ] |

---

## 2. Template source cycling

| # | Check | Pass? |
|---|--------|-------|
| S1 | Push/Pull/Leg: **Try another set ↻** cycles labels among history (if any) / Classic / From your equipment / Random without blanking the list | [ ] |
| S2 | Full Body: cycle only **Your last session** ↔ **Classic routine** (no Generated/Random) | [ ] |
| S3 | **Reset to saved** (when enabled) restores your saved source | [ ] |

---

## 3. History (“Your last session”)

Needs a prior completed session of that type.

| # | Check | Pass? |
|---|--------|-------|
| H1 | After finishing a **Push**, next open defaults to (or can select) **Your last session** with the same lifts/order you logged | [ ] |
| H2 | After finishing **Full Body**, **Your last session** Main lifts = the six lifts only — Warm-up / Core / Mobility stay in their own session-plan cards, **not** duplicated under Main | [ ] |

---

## 4. Generated (“From your equipment”)

PPL only. Use a profile with known gear (or tweak equipment in onboarding / profile if you have that path).

| # | Check | Pass? |
|---|--------|-------|
| G1 | Barbell + bench + rack → Push lead lift is **Barbell Bench Press** | [ ] |
| G2 | Barbell + bench, **no** rack / canBench false → lead lift is **Barbell Floor Press** (not bench) | [ ] |
| G3 | Pull-up bar on profile → Pull lead lift is **Pull-ups** | [ ] |
| G4 | Dumbbells only → Leg lead lift is **Goblet Squat** (not back squat) | [ ] |
| G5 | List is non-empty; starting the workout does not crash | [ ] |

---

## 5. In-session logging (catalog still wired)

| # | Check | Pass? |
|---|--------|-------|
| L1 | Start **Classic Push** → open Bench → set logger shows coaching / last performance (not “Unknown exercise”) | [ ] |
| L2 | Complete a set → rest timer feels normal (compound ~3 min, isolation shorter; Pull-ups long rest) | [ ] |
| L3 | Finish workout → appears on home calendar as usual | [ ] |
| L4 | **Full Body**: Warm-up audio → Main carousel (6) → Core audio → Mobility audio still advances; segment completion logs as before | [ ] |

---

## 6. Onboarding / Core entry points

| # | Check | Pass? |
|---|--------|-------|
| O1 | Onboarding routine preview (PPL or Full Body) shows a sensible exercise list, not blanks | [ ] |
| O2 | Opening **Core** from home reflects the current template (not a stale list from app boot) | [ ] |

---

## 7. Quick red flags (stop if you see these)

- [ ] Warm-up / Core / Mobility named as Main lifts with fake `3 × 8–12`
- [ ] Empty exercise list on Classic routine
- [ ] “Unknown exercise” on a default lift (bench, squat, pull-ups, etc.)
- [ ] Full Body missing guided segments or stuck between segments
- [ ] Crash when switching **Try another set**

---

## Automated sanity (optional)

```bash
npm test
```

Expect Phase 1–2 unit coverage (catalog pools, default slot parity, generator equipment picks, Full Body history segment filter) to stay green.
