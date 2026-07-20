# Recommended check-in — UI spec

**Status:** current. Pairs with [21-checkin-binary-model.md](./21-checkin-binary-model.md) (logic) — this doc covers screens, states, and interaction only. Supersedes any UI description in [20-recommended-workout-e2e.md](./20-recommended-workout-e2e.md) §1 and the visual references in the original [movement-pattern-refactor-spec.md](./movement-pattern-refactor-spec.md).

**Reference mock:** `home-with-checkin-overlay.html` — full home page with the flow wired in as a modal overlay, not a page navigation. Treat this as the visual source of truth; screenshots below are described, not pasted, since the mock is the real artifact.

**Code entry point:** `src/components/RecommendedWorkoutFlow.tsx`, rendered as a modal/overlay from the Home screen, not a route.

---

## 1. Entry point

Home → **Strength** row. Today's row is Push / Pull / Leg / Full Body (4 tiles). This adds a 5th:

**"Recommended — Based on how you feel"**

- Visually distinct from the other four: red-tinted background/border, sparkle icon, matches the existing "Plan with AI" chip treatment already used elsewhere on Home — signals this is the AI-assisted path, not a 5th equal-weight workout type.
- Tapping it opens the flow as an **overlay** (scrim + centered modal), not a route change. Home stays mounted underneath, dimmed and inert.
- Overlay dismisses via: ✕ button (top-right of modal), or clicking the scrim outside the modal. Both return to Home unchanged, no state persisted.

---

## 2. Screen states

The modal has exactly four states. Only one is visible at a time; transitions are instant (no route, no page load).

### 2.1 State: Global feeling (`step0`)

- Kicker: "Check-in"
- Heading: "How are you feeling today?"
- Subtext: explains this sets the baseline, more detail comes next
- **Two large binary buttons**, side by side:
  - "100%" — subtext "Full weight, full volume"
  - "Not quite" — subtext "Let's figure out what's off"
- Below the two buttons, a smaller tertiary text link: "Sick or sharp pain — skip today"

**Tap "100%"** → skip directly to Result (2.4). No region questions — this is deliberate, not a missing step (see [21-checkin-binary-model.md] §2).

**Tap "Not quite"** → advance to Regions (2.2).

**Tap the skip link** → advance to Skip (2.3).

### 2.2 State: Regions (`step1`)

Only reachable from "Not quite." Never shown after "100%."

- Kicker: "Check-in"
- Heading: "What's off?"
- Subtext: "Answer body parts, not exercises"
- Six region rows, each with a label and two chips: **Fine** (default selected) / **Bothering me**
  - Order: Knees, Hips, Lower back, Front of shoulder, Upper back, Elbows/wrists
- Primary button: "Build my workout" → advances to Result (2.4)

No validation required — all six default to "Fine," so the button is always immediately actionable without forcing the user to touch every row.

### 2.3 State: Skip

- Short centered message: "No workout today. Rest, hydrate, check back tomorrow."
- Single ghost button: "Start over" → returns to 2.1

### 2.4 State: Result

- Kicker: "Today's session"
- Heading: workout category name (e.g. "Full Body")
- Subtitle line — **one of three strings**, depending on how state resolved (see §3):
  - "100% — full weight, full volume"
  - "Not 100%, nothing specific — dialed back everywhere"
  - "Not 100%, but you named it — full volume, adjusted only where it hurts"
- Section label: "Exercises — tap to swap"
- One row per pattern slot (six for Full Body), each row:
  - Slot number
  - **Dropdown select** — see §4, this is not a static exercise name
  - Sets × reps (e.g. "2 × 6–10")
  - Tier badge (Heavy / Moderate / TRX), color-coded — see §5
- Small hint text below the list: "Dropdowns only offer this variant or lighter — today's check-in sets the ceiling."
- Footer: ghost "Start over" (returns to 2.1) + primary "Start workout"

---

## 3. Subtitle logic (maps directly to §2–3 of the logic spec)

| Path taken | Subtitle shown |
|---|---|
| Global = 100% | "100% — full weight, full volume" |
| Not quite, all regions Fine | "Not 100%, nothing specific — dialed back everywhere" |
| Not quite, ≥1 region Bothering | "Not 100%, but you named it — full volume, adjusted only where it hurts" |

This subtitle is the only place the "vague vs. specific" distinction is surfaced in copy — the exercise list itself doesn't call it out per-row, so the subtitle is doing real explanatory work. Don't cut it as a "just a label" simplification.

---

## 4. The dropdown mechanic

Each exercise row is a `<select>`, not static text. This is the core new interaction in this spec — not present in the original Phase 3/4 build.

- **Options are grouped by tier** (native `<optgroup>` or equivalent), labeled Heavy / Moderate / TRX.
- **Only the resolved tier and more-conservative tiers appear as options.** A pattern resolved to `moderate` shows Moderate + TRX groups — no Heavy group at all, not even disabled. The restriction should be structural (option doesn't exist), not a disabled-but-visible option, to keep the control simple.
- **Changing the selection updates that row's tier badge live**, immediately, no confirmation step. Picking a TRX option on a row that resolved to Heavy should visibly flip the badge from red "Heavy" to green "TRX" the moment it's selected.
- **Selecting a different exercise does not change the set count for that row.** Sets are determined by the resolver (§3 of the logic spec), not by which exercise is chosen within the allowed tiers.
- **Single-option case:** some pattern/tier combinations may have only one exercise in the pool (e.g. `vertical_pull` heavy = Pull-ups only, per the current catalog). Render this as a normal one-item dropdown rather than a static label — keeps the row visually consistent even when there's nothing to actually swap to. Flagged as an open polish question in the logic spec §7, not fully resolved.

---

## 5. Tier badge color convention

Reused directly from Home's existing "Best today" badge language — not a new convention invented for this flow:

| Tier | Badge color | Rationale |
|---|---|---|
| Heavy | Red-tinted (`--red-bg` / red text) | Matches the app's primary brand accent — signals "the main lift," consistent with how red is used for primary CTAs elsewhere |
| Moderate | Amber-tinted | Neutral middle state, no existing app convention to match — amber chosen as a clear third value between the red/green poles |
| TRX (low impact) | Green-tinted (`--success-bg` / green text) | Directly reuses the "Best today" badge color from the Home recommendation card — both represent "this is the smart, lower-intensity choice right now" |

---

## 6. What this spec does not cover

- **Push / Pull / Leg dropdown behavior** — this spec and the reference mock only build out Full Body's six primary-pattern slots. Per the logic spec §7, PPL accessory slots (curls, laterals, etc.) are explicitly out of scope for the dropdown treatment for now — they stay static, volume-adjusted only, no tier swap.
- **"Build my own" as a separate entry point** — per the discussion that produced this spec, the dropdown override effectively merges what was originally planned as two separate Phase 4/5 features (Recommended vs. Build-my-own) into one flow. There is no separate "build from scratch" button in this spec; the recommendation is always the starting point, editable via dropdown.
- **Saved routines** — selecting different exercises via the dropdown does not persist anywhere. Every Recommended session remains one-off per the original spec's Phase 4 rule (does not write `templateSources`), regardless of how many rows were manually overridden.
- **Post-"Start workout" behavior** — the reference mock shows a toast and closes the modal; actual session creation, warm-up flow, and hand-off to the workout deck are unchanged from the existing Full Body flow and not re-specified here.
