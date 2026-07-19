# Spec: Onboarding — Program Choice (PPL vs Full Body)

**Status:** Locked for implementation  
**Related:** [11-user-flow.md](./11-user-flow.md), [15-full-body-program-migration.md](./15-full-body-program-migration.md)

---

## Goal

After equipment, ask new (and edit-routine) users to choose **Push / Pull / Leg Split** or **Full Body** before cardio and routine preview — so `programType` is set intentionally at setup.

---

## Locked decisions

| # | Decision |
|---|----------|
| 1 | Default selection: **none** (user must tap a card) |
| 2 | Step labeling: **Step N of 5** |
| 3 | Program choice is **two screens**: compare/pick → details/confirm |
| 4 | Naming: **Push / Pull / Leg Split** (not “PPL”) |
| 5 | Always offer **both** programs regardless of equipment |
| 6 | Full Body add-ons: **hide Core reminders** (core is already in-session); **keep Mobility** as optional off-day extra |

Full Body session shape (unchanged):  
**Warm-up (audio) → Main lifts (logged) → Core (audio) → Mobility (audio)**

---

## Flow

```
Education (new users only)
  → Step 1: Equipment (+ bench clarifier)
  → Step 2: Program choice
       2A — Two education cards; select one; Continue
       2B — Details for the selected program; confirm or compare again
  → Step 3: Cardio
  → Step 4: Routine preview (branches by program)
  → Step 5: Week + add-ons → Finish → Home
```

Progress bar: `step / 5` (Step 2A and 2B both count as step 2).

---

## Step 2A — Compare & pick

Two equal cards. Radio selection. Continue disabled until one is selected.

### Push / Pull / Leg Split

- **Headline:** Split your week by movement
- **One-liner:** Classic three-day strength split. More volume per muscle group.
- **Best if:** You can train across the week and like session variety
- **Week glance:** Push · Pull · Legs + cardio / rest
- **Feel:** Focused days (press one day, pull another, legs another)

### Full Body

- **Headline:** Train the whole body each session
- **One-liner:** Three full sessions per week. Same lifts, guided warm-up / core / mobility.
- **Best if:** You want fewer decisions and ~60–80 min sessions
- **Week glance:** Mon / Wed / Fri Full Body + flex cardio / rest
- **Feel:** One start → warm-up audio → lifts → core audio → mobility audio

Footer: “You can switch later in settings.”

**CTA:** `Continue with [selected]`  
**No default** on new users. Edit-routine **pre-selects** current `programType`.

---

## Step 2B — Details & confirm

Show only the chosen program.

### If Push / Pull / Leg Split

- Sample week strip (default PPL layout)
- “You’ll get four templates: Push, Pull, Leg, Core — tailored to your equipment.”
- Soft note: Core can also appear as a nudge after strength days

### If Full Body

- Sample week strip (Mon / Wed / Fri Full Body, other days flex)
- “Each strength day: guided warm-up → main lifts → guided core → guided mobility.”
- Soft note: Floating rest — recommendations adapt to what you actually log

**CTAs:**  
- Primary: `This is my program` → Step 3  
- Secondary: `← Compare again` → Step 2A (keeps selection)

---

## Step 3 — Cardio

Same picker as today. Copy branches:

| Program | Subcopy |
|---------|---------|
| Split | We’ll slot these between Push / Pull / Leg days. |
| Full Body | We’ll use these on days between Full Body sessions. |

---

## Step 4 — Routine preview

| Program | Content |
|---------|---------|
| Split | Push / Pull / Leg / Core shuffle cards + cardio chips (today’s behavior) |
| Full Body | One Full Body card (main lifts from template source) + cardio chips; shuffle cycles Full Body sources when available |

---

## Step 5 — Week + add-ons

Week grid from `generateWeeklyPlan` with selected `programType`.

| Program | Mobility addon | Core reminders |
|---------|----------------|----------------|
| Split | Toggle — “10–15 min on cardio or rest days” | Toggle — “Nudge to add core after Push or Pull” |
| Full Body | Toggle — “Extra mobility on off days (already included in Full Body sessions)” | **Hidden**; set `wantsCore: false` on finish |

---

## Persistence

- `onboardingDraft.programType` saved while onboarding
- Step 2 sub-screen: `onboardingDraft.programChoicePhase?: 'choose' | 'confirm'`
- Finish writes `profile.programType`, templates, weekly plan, palette (existing `completeOnboarding`)
- Changing program in edit-routine regenerates week + templates on finish

---

## Edit routine & migration

| Context | Behavior |
|---------|----------|
| New user | Full 5-step flow including Step 2 |
| Edit routine | Include Step 2; pre-select current `programType` |
| User menu “Switch to Full Body” | Keep as shortcut for PPL users |

---

## Success criteria

- New users leave with explicit `programType`
- Week preview and routine cards match the choice
- User can reverse choice before finish without losing equipment / cardio
- Full Body finish does not enable Core reminder nudges
