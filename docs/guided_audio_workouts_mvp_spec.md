# Guided Audio Workouts (MVP)

**Status:** Implementation plan — replaces timer-based guided segments in Full Body.

**Related:** [17-fullbody-session-flow-and-ui.md](./17-fullbody-session-flow-and-ui.md) (session order + segment logging), [14-content-foundation-design.md](./14-content-foundation-design.md) (exercise catalog — **separate track**, not a blocker).

---

## Goal

Create a guided workout experience where the user presses **Start** and follows an audio coach end to end.

The coaching audio is **pre-generated**. The app handles playback, progress display, and segment completion — not speech generation at runtime.

**Audio is the source of truth.** There is no per-exercise timer, no “Next movement” between chapters, and no app-driven pacing. One MP3 plays; chapter titles update from playback position.

---

## Design principles

- Audio-first experience — hit Start, follow along.
- Minimal engineering complexity.
- High-quality narration (publish-time TTS, not browser synthesis).
- No runtime TTS, cue engine, or live AI coaching in MVP.
- Content authored as markdown; audio generated at publish time.
- Guided audio is an **experiment** on its own content track (not doc 14 exercise migration).

---

## Full Body integration (locked)

Full Body session order is unchanged:

```
Warm-up (guided audio) → Main lifts (logged) → Core (guided audio) → Mobility (guided audio)
```

| Segment   | Ledger `catalogExerciseId` | v1 routines | Later |
|-----------|----------------------------|-------------|-------|
| Warm-up   | `warmup_segment`           | 1 default   | User picks from library |
| Core      | `core_segment`             | 1 default   | User picks from library |
| Mobility  | `mobility_segment`         | 1 default   | User picks from library |

**Logging (unchanged):** one `ExerciseLog` per guided segment — `isGuidedSegment`, `segmentDurationSeconds`, `segmentStatus` (`completed` \| `partial`). Optional later field: `guidedRoutineId` on the log.

**MVP limitation (accepted):** single MP3 per routine — no skip-to-next-chapter control. Play, pause, resume, restart, seek, and skip-whole-segment only.

---

## Architecture

```
Markdown script (+ chapter timestamps)
        ↓
(Optional) AI script polish
        ↓
ElevenLabs TTS (publish script — not in app)
        ↓
Single MP3 + transcript
        ↓
Local fixture (dev) → Supabase Storage (prod)
        ↓
GuidedAudioPlayer in FullBodyWorkoutFlow
```

Runtime only plays audio and derives the current chapter from `currentTime`.

---

## TTS provider (v1)

**Provider: [ElevenLabs](https://elevenlabs.io/)** — Text-to-Speech API at **publish time only**.

| Setting | Choice | Notes |
|---------|--------|-------|
| Model | `eleven_turbo_v2_5` | Fast iteration while authoring; switch to `eleven_multilingual_v2` if voice quality needs more warmth |
| Voice | **TBD — pick one coach voice and lock it** | Use the same `voice_id` for all v1 routines so the experience feels consistent |
| Output | MP3, 44.1 kHz or 128 kbps | Single file per routine |
| API key | `ELEVENLABS_API_KEY` | **Publish script / CI only** — never in the client app |

**Why ElevenLabs:** best fit for natural coaching narration in a fitness context; simple HTTP API; no runtime dependency.

**Not using (MVP):** browser `speechSynthesis`, OpenAI Realtime, per-chapter runtime generation.

**Alternative if cost/voice is wrong:** OpenAI `tts-1-hd` — swap in the publish script only; app and routine schema unchanged.

**Publish script (not built yet):** `scripts/publish-guided-routine.mjs` — read markdown → call ElevenLabs → write MP3 + update routine JSON. Authors never upload audio manually.

---

## Routine model

```ts
interface GuidedRoutine {
  id: string
  title: string
  description: string
  /** Segment this routine is valid for (Full Body v1). */
  segmentType: 'warmup' | 'core' | 'mobility'
  durationSeconds: number
  audioUrl: string
  /** Full script text (stored for search/review; not shown during playback). */
  transcript: string
  chapters: Chapter[]
}

interface Chapter {
  id: string
  title: string
  startSeconds: number
  endSeconds: number
  /** Optional link to catalog slug for future analytics. */
  exerciseId?: string
}
```

**Segment binding (app config):**

```ts
const FULL_BODY_GUIDED_DEFAULTS: Record<'warmup' | 'core' | 'mobility', string> = {
  warmup: 'full_body_warmup_v1',
  core: 'full_body_core_v1',
  mobility: 'full_body_mobility_v1',
}
```

---

## Placeholder scripts (iterate on copy later)

Authors maintain one markdown file per routine. `##` headings define chapters; the publish step maps headings → `chapters[]` timestamps (timestamps are **measured from the generated MP3**, not guessed from script length).

Files to create when implementing:

- `content/guided-routines/full_body_warmup_v1.md`
- `content/guided-routines/full_body_core_v1.md`
- `content/guided-routines/full_body_mobility_v1.md`

### `full_body_warmup_v1` — Full Body Warm-up

```md
## Introduction

Welcome to your full body warm-up.

We'll move through four activation drills.

Follow my pace — no rush.

## Arm circles

Let's wake up the shoulders.

Small circles forward… then reverse.

Keep your core gently braced.

[PLACEHOLDER: 30–45s of coaching copy — size of circles, tempo, breathing]

## Leg swings

Hold something stable for balance if you need it.

Swing one leg forward and back — controlled, not ballistic.

[PLACEHOLDER: switch sides, hip height, keep torso tall]

## Bodyweight squat to stand

Feet about hip width.

Sit down slowly, drive through your whole foot to stand.

[PLACEHOLDER: 10–15 reps pacing — "three more", "last two"]

## Glute bridges

On your back, feet flat, knees bent.

Drive through your heels and squeeze at the top.

[PLACEHOLDER: 10–15 reps — pause at top, don't over-arch]

## Outro

Warm-up complete.

When you're ready, we'll move into your main lifts.
```

**Placeholder chapters (timestamps filled after first TTS pass):**

| Chapter | Title |
|---------|-------|
| `intro` | Introduction |
| `arm-circles` | Arm circles |
| `leg-swings` | Leg swings |
| `squat-to-stand` | Bodyweight squat to stand |
| `glute-bridges` | Glute bridges |
| `outro` | Outro |

---

### `full_body_core_v1` — Full Body Core

```md
## Introduction

Core block — two exercises, two rounds.

Grab your weight for the plank if you're using one.

## Weighted plank — round one

Forearms down, elbows under shoulders.

Brace your abs, squeeze your glutes.

[PLACEHOLDER: setup cues, breathing, "hold steady"]

## Hanging leg raise — round one

Hang from the bar with active shoulders.

Lift with control — no swinging.

[PLACEHOLDER: 8–12 reps or time-based coaching — "smooth up, slow down"]

## Round two

Same pair again.

Plank first, then leg raises.

## Weighted plank — round two

Back to the plank.

[PLACEHOLDER: shorter setup reminder, hold coaching]

## Hanging leg raise — round two

Last set of leg raises.

[PLACEHOLDER: rep pacing, form reminders]

## Outro

Core done.

Nice work — mobility is next when you're ready.
```

**Placeholder chapters:**

| Chapter | Title |
|---------|-------|
| `intro` | Introduction |
| `plank-1` | Weighted plank — round one |
| `leg-raise-1` | Hanging leg raise — round one |
| `round-two` | Round two |
| `plank-2` | Weighted plank — round two |
| `leg-raise-2` | Hanging leg raise — round two |
| `outro` | Outro |

---

### `full_body_mobility_v1` — Full Body Mobility

```md
## Introduction

Mobility finisher — four movements.

Move slowly and breathe.

## World's Greatest Stretch

Step into a lunge, place the same-side hand inside your front foot.

Open your chest and rotate your top arm to the sky.

[PLACEHOLDER: hold timing, switch sides]

## 90/90 hip switch

Sit in a 90/90 position — both knees bent.

Rotate from one hip to the other with control.

[PLACEHOLDER: don't force range, tall spine]

## Thoracic rotation

On all fours, hand behind your head.

Rotate your elbow up toward the ceiling.

[PLACEHOLDER: reps per side, keep hips still]

## Ankle rocks

Half-kneeling, drive your front knee over your toes.

[PLACEHOLDER: reps per side, heel down]

## Outro

Session mobility complete.

Great work today.
```

**Placeholder chapters:**

| Chapter | Title |
|---------|-------|
| `intro` | Introduction |
| `wgs` | World's Greatest Stretch |
| `9090` | 90/90 hip switch |
| `t-spine` | Thoracic rotation |
| `ankle` | Ankle rocks |
| `outro` | Outro |

---

## Player

### Controls

- Play (starts at beginning or resume position)
- Pause
- Resume
- Restart
- Seek (scrubber)
- Skip segment (existing partial log — leaves guided block)

**Not in MVP:** skip to next chapter / exercise.

### Display

- Routine title
- Current chapter title
- Next chapter title (if any)
- Elapsed time
- Remaining time

No scrolling script during playback.

### Replaces in codebase

| Today | After |
|-------|--------|
| `GuidedSegmentView` + `useAccurateTimer` | `GuidedAudioPlayer` |
| `GuidedSegmentDefinition.movements[]` | `GuidedRoutine` + `chapters[]` |
| `guidedMovementIndex` resume | `playbackPositionSeconds` (optional on `fullBody` state) |
| `WorkoutStartView` movement lists | Chapter titles from bound routine metadata |

**Keeps:** `FullBodyWorkoutFlow`, `completeGuidedSegment`, segment order, sidebar overview, `muted` (silences coach audio).

---

## Storage

### Dev (phase 1)

```
content/guided-routines/
  full_body_warmup_v1.md
  full_body_core_v1.md
  full_body_mobility_v1.md
public/audio/guided/
  full_body_warmup_v1.mp3      # placeholder or first TTS output
  full_body_core_v1.mp3
  full_body_mobility_v1.mp3
src/fixtures/guided-routines/
  full_body_warmup_v1.json     # GuidedRoutine metadata + chapters
  full_body_core_v1.json
  full_body_mobility_v1.json
```

`audioUrl` in fixtures: `/audio/guided/full_body_core_v1.mp3` (or bundled import).

### Prod (later)

- Supabase table `guided_routines` (JSON metadata + `audio_url`)
- Supabase Storage bucket `guided-audio`
- `guidedRoutineRepository` + localStorage snapshot (same pattern as doc 14 `contentRepository`)

No runtime cue objects. No `speechSynthesis`.

---

## Implementation plan

### Phase 1 — Player + core pilot (local)

1. Add `src/types/guidedRoutine.ts`.
2. Add fixture JSON for `full_body_core_v1` with placeholder chapter times (can use silence/short placeholder MP3 until real TTS).
3. Build `GuidedAudioPlayer` — `HTMLAudioElement`, chapter detection on `timeupdate`, controls + display per above.
4. Add `guidedRoutineRepository.getRoutine(id)` — reads fixtures only.
5. Wire **core segment only** in `FullBodyWorkoutFlow`; warm-up and mobility stay on timer until phase 2.
6. On `ended` → `completeGuidedSegment('core', …)`.
7. Tests: chapter index from `currentTime`, complete callback.

### Phase 2 — All three Full Body segments

1. Fixtures + placeholder scripts for warm-up and mobility.
2. Swap warm-up and mobility to `GuidedAudioPlayer`.
3. Update `WorkoutStartView` preview to use chapter titles from routine metadata.
4. Remove timer `movements[]` from runtime path (keep file only if needed for migration).

### Phase 3 — Publish pipeline + real audio

1. `scripts/publish-guided-routine.mjs` — markdown → ElevenLabs → MP3.
2. Chapter timestamp workflow: generate audio → listen / waveform tool → fill `startSeconds` / `endSeconds` in JSON (or semi-automated via silence detection later).
3. Replace placeholder MP3s with published files.
4. Lock ElevenLabs `voice_id` in script config.

### Phase 4 — Cloud + library

1. Supabase `guided_routines` + storage upload in publish script.
2. Offline snapshot in app.
3. Routine picker UI (user choice); defaults until then.

**Explicitly not in MVP:** doc 14 exercise migration, block-based audio (phase 2 of this spec’s future), runtime TTS, chapter skip.

---

## MVP scope

**Build**

- 3 Full Body guided routines (1 per segment), placeholder scripts above
- `GuidedAudioPlayer` with chapter support
- Local MP3 + fixture JSON
- Core → warm-up → mobility rollout
- ElevenLabs publish script (phase 3)
- Transcript stored on routine

**Do not build**

- Runtime TTS or browser speech
- Per-chapter skip on single MP3
- Cue scheduling engine
- Voice commands
- Dynamic workout adaptation
- Multiple voices per routine
- Tying guided routines to doc 14 `routine_template_slots`

---

## Future evolution

### Block-based audio (spec phase 2)

Split into separate MP3s per chapter block — enables skip exercise and regenerate one block.

### Dynamic AI coaching (spec phase 3)

Same chapter structure; replace prerecorded audio with generated coaching.

---

## Acceptance criteria

- [ ] User starts a Full Body session and can play guided **core** (then all three segments).
- [ ] Audio begins on Start; no inter-exercise timers.
- [ ] Pause, resume, restart, and seek work.
- [ ] Current and next chapter update automatically during playback.
- [ ] Segment completes when audio ends; duration logged.
- [ ] Skip segment logs partial + advances (existing behavior).
- [ ] `muted` silences coach audio.
- [ ] Transcript stored on routine; not shown during playback.
- [ ] Authors edit markdown only; TTS runs at publish via ElevenLabs.
- [ ] Placeholder `[PLACEHOLDER: …]` blocks in scripts are replaced incrementally without app code changes.

---

## Why this MVP

Ships a real coaching feel without a timing engine. Session orchestration already exists in Full Body; this swaps the presentation layer and adds a separate content pipeline. Local MP3 first de-risks the player before Supabase or TTS automation.
