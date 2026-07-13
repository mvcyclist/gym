# Guided Audio Routines — Spec for Script Generation

**Purpose:** exercise lists, descriptions, and timing targets for three routines
(Warm-up, Core, Mobility). Intended for Cursor to build the actual script-generation
logic — this doc specifies *what* content and timing is needed, not the SSML/break-tag
implementation, which has known reliability problems (see Section 0).

---

## 1. Segment structure — applies to every exercise, in every routine

Every exercise segment, regardless of routine, follows the same four-part shape:

1. **Name** — spoken once, at the start of the segment.
2. **Setup/description** — one to two sentences on how to get into position. Brief,
   not a full coaching cue library — the person already knows these movements.
3. **Begin cue**, then a **counter spoken every 5–6 seconds** for the full duration of
   the segment — this is what replaces silent break tags. The counter should track
   toward the segment's actual end (e.g. counting up toward the target, or counting
   down remaining time), so there's always a clear sense of how much is left.
4. **Transition** — a brief cue into whatever comes next (next exercise, or rest, for
   Core).

**Content style — do not write this as a flat, robotic counter.** The name, setup, and
transition lines should read like a real trainer talking, not a timer app. Vary
phrasing where natural, allow brief encouragement or form reminders woven around the
counter rather than only "five... ten... fifteen..." on repeat. The counter needs to
stay frequent and reliable (every 5–6 seconds, real spoken numbers) for timing to
work, but the language around it should have personality — this is the same
intro/body/transition framework used in earlier drafts, just with the counter as the
reliable backbone instead of silent gaps.

---

## 2. Warm-up — target 5 min (300s)

Each row below fills the "Setup/description" part of the Section 1 structure —
Name → Setup → Begin + counter every 5–6s → Transition, applied to each exercise.

| Order | Exercise | Description | Target duration |
|---|---|---|---|
| 1 | Arm circles | Stand tall, arms out to sides. Small, controlled circles forward, then reverse direction partway through. | ~70s |
| 2 | Leg swings | Hold something stable for balance. Swing one leg forward and back with control, not ballistic; switch sides at the midpoint. | ~60s (30s/side) |
| 3 | Bodyweight squat to stand | Feet hip-width apart. Sit down slowly, drive through the whole foot to stand back up. | ~70s |
| 4 | Glute bridges | On back, feet flat, knees bent. Drive through heels, squeeze at the top of each rep. | ~70s |

No equipment. Dynamic movements only — this is activation, not static stretching (see
doc 15/16 reasoning: static holds belong at the end of a session, not the start).

---

## 3. Core — TRX circuit, target 10 min (600s)

**Structure, made explicit:**

```
ROUND 1
  Exercise 1 — ON (30s): name + setup + counter every 5-6s → OFF (30s): rest + counter every 5-6s counting down to next exercise
  Exercise 2 — ON (30s) → OFF (30s)
  Exercise 3 — ON (30s) → OFF (30s)
  Exercise 4 — ON (30s) → OFF (30s)
  Exercise 5 — ON (30s) → OFF (30s)
ROUND 2 — same 5 exercises, same order, same ON/OFF structure
```

5 exercises × 2 rounds × (30s on + 30s off) = 600s total, no rounding needed.

**Within one 30s ON period:** name (round 2 can shorten this to just the name, no
re-explaining setup, since it was already covered in round 1) → brief setup reminder →
begin → counter spoken roughly every 5–6 seconds (e.g. five, ten, fifteen, twenty,
twenty-five) counting up toward 30, so there's always a clear sense of how close the
30 seconds is to ending.

**Within one 30s OFF period:** "rest" cue → counter every 5–6s (counting up or down,
whichever reads more naturally) → a brief cue transitioning into the next exercise
(named) as the 30s closes out, so there's no dead moment right as work resumes.

| Order | Exercise | Description | Pattern covered |
|---|---|---|---|
| 1 | TRX Body Saw | Plank position with feet in straps. Rock the body forward and back while keeping the core braced and hips level. | Anti-extension |
| 2 | TRX Hip Dip, left side | Side plank in the straps. Dip the hips toward the floor and back up under control, left side. | Anti-lateral-flexion |
| 3 | TRX Hip Dip, right side | Same movement, right side. | Anti-lateral-flexion |
| 4 | TRX Knee Tuck | Feet in straps, plank position. Tuck both knees toward the chest, then extend back out with control. | Flexion |
| 5 | TRX Plank Shoulder Tap | Plank in the straps. Alternate tapping the opposite shoulder while resisting hip rotation. | Anti-rotation |

All four core failure-mode categories covered across the five exercises (see doc 18
reasoning on why this beats the original two-exercise plank/leg-raise pairing).

---

## 4. Mobility — TRX-assisted, target 10 min (600s)

**Structure:** 5 movements, ~2 minutes (120s) each, straps used for assisted/relaxed
holds rather than active work. Two movements switch sides at the halfway point (60s).

| Order | Exercise | Description | Target duration |
|---|---|---|---|
| 1 | TRX Deep Squat Hold + Thoracic Reach | Hold both handles, sink into the deepest comfortable squat with heels planted. Every ~20s, rotate one arm toward the ceiling while the other hand supports, alternating sides. | 120s (internal cues at ~20/40/60/80/100s) |
| 2 | TRX Chest Opener | Face away from the anchor, arms extended out to the sides holding the straps. Lean forward until a stretch is felt across the chest. Change arm height roughly every 30s. | 120s (cues at ~30/60/90s) |
| 3 | TRX Lat Stretch | Face the anchor, arms straight overhead. Sit the hips back while dropping the chest toward the floor — think "long spine." | 120s, continuous hold |
| 4 | TRX Hamstring Stretch | Face the anchor, one heel slightly forward. Hold the handles and hinge at the hips with a flat back. Switch sides at the halfway point. | 120s (60s/side) |
| 5 | TRX Hip Flexor Lunge + Overhead Reach | Split stance, rear knee dropping toward the floor. Reach the same-side arm overhead and slightly across. Switch sides at the halfway point. | 120s (60s/side) |

**Session-level cue (once, at the start only):** breathe slowly, ease into each
stretch rather than forcing range — not repeated per-exercise.

---

## 5. Open items for Cursor to resolve during implementation

1. Voice/tone consistency across all three routines — same voice ID and stability
   settings, or does Mobility warrant a calmer preset than Warm-up/Core given it's the
   cooldown segment (this distinction was made in earlier hand-written drafts and is
   worth preserving).
2. Confirm actual rendered duration against real generation before treating any of the
   target durations above as final — they're the *intent*, not a guarantee, given what
   Section 0 already taught us about the gap between computed and actual timing. This
   matters even for the dense-counting approach: verify the ~5–6s counter cadence
   actually renders close to real seconds before trusting the totals.
3. Mobility's internal cues (Movement 1's arm rotations, Movements 4/5's side switches)
   need to land at specific counter points, not just anywhere in the segment — confirm
   the generation logic can anchor a specific instruction to a specific counter value
   (e.g. "switch sides" fires right at the halfway-point count), not just scatter cues
   loosely through the segment.
