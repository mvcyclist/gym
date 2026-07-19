# Spec: User Flow — Landing to Home Screen

Covers the path from first visit through the main app.

**New users** (after sign-in): Landing → Education → Onboarding (5 steps) → Home  
**Returning users** (after sign-in): Landing → Home — skip Education and Onboarding

Program choice (Push / Pull / Leg Split vs Full Body) is Step 2 — see [18-onboarding-program-choice.md](./18-onboarding-program-choice.md).

Reference prototypes:
- flow-overview.html (all three screens in context)
- welcome.html (education/welcome screen)
- onboarding-v2.html (4-step onboarding)

---

## User types & routing (read this first)

This spec hinges on one distinction: **has this account finished setup?**
Not “first visit to the website” and not “new device” by itself.

### Definitions

| Type | Meaning | How we know |
|------|---------|-------------|
| **Unsigned** | No active Google session | `user === null` |
| **New user** | Signed in, setup not finished | `profile.onboardingComplete === false` |
| **Returning user** | Signed in, setup finished | `profile.onboardingComplete === true` |

`onboardingComplete` lives on the **user profile** (local cache + Supabase `user_profiles`), not on the auth user object. After sign-in, wait until the profile is **hydrated from cloud** before routing — otherwise a returning user can briefly look “new.”

### Routing decision tree (signed-in path)

```
Sign-in succeeds
  → wait for profile hydrate (profileReady)
  → read profile.onboardingComplete

  if true  → Home
  if false → Education (Screen 2) → Onboarding (Screen 3) → set onboardingComplete → Home
```

### Who sees which screen

| Screen | Unsigned | New user | Returning user |
|--------|----------|----------|----------------|
| 1 — Landing / Sign in | Yes | Only if signed out again later | Only if signed out again later |
| 2 — Education | No | Yes — every sign-in / visit until onboarding completes | Never |
| 3 — Onboarding | No | Yes, until complete | Never |
| Home | No | After onboarding completes | Immediately after sign-in |

**Landing is not “new-user only.”** Anyone signed out sees it. Returning users only skip Education + Onboarding *after* they sign in.

### Edge cases

| Situation | Route |
|-----------|-------|
| Signed in, quit mid-onboarding (e.g. step 2), come back | Education → Onboarding (resume at saved step) |
| Signed in, completed onboarding, taps “Edit routine” in settings | Onboarding only — **no** Education |
| New browser, same Google account | Returning user once cloud profile hydrates (`onboardingComplete: true`) |
| Supabase not configured (local-only dev) | Same gate on local `profile.onboardingComplete` |

### What “complete” means

Onboarding Screen 4 finish sets `profile.onboardingComplete = true`, persists profile locally, and syncs to Supabase. That flag is the **only** gate for Education and Onboarding — not session count, not ledger history.

---

## Color system (locked, no exceptions)

Red `#ef4444` is the only accent color across
every screen in the entire product — landing,
sign-in, education, onboarding, and app.

Gold exists only inside the logo image asset
(bd-gym-logo.png). It is never used as a UI
color anywhere.

---

## Flow overview

```
Everyone signed out:
  Landing (Screen 1) — sign in when ready

New user (signed in, onboardingComplete === false):
  Landing → Education → Onboarding → Home

Returning user (signed in, onboardingComplete === true):
  Landing → Home
```

**Gate:** `profile.onboardingComplete`  
- `true` → Home after sign-in (skip Education + Onboarding)  
- `false` → Education, then Onboarding, then Home  

See **User types & routing** above for definitions, hydrate timing, and edge cases.

---

## Screen 1 — Sign in / Landing

Combined screen. Does two jobs:
sells the product AND handles sign-in.
No separate marketing page needed.

### Layout

```
Full viewport, centered column, max-width 480px.
background: #000
```

```css
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
min-height: 100vh;
padding: 3rem 2rem;
text-align: center;
```

### Logo

```css
width: 120px;
height: 120px;
object-fit: contain;
mix-blend-mode: screen;
margin-bottom: 2rem;
filter:
  drop-shadow(0 0 20px rgba(184,134,11,0.2))
  drop-shadow(0 0 48px rgba(139,26,26,0.15));
```
Image: bd-gym-logo.png

### Headline — three lines, each its own visual beat

Line 1 (large, white):
```css
font-size: 52px;
font-weight: 800;
color: #fff;
letter-spacing: -1.5px;
line-height: 1.0;
```

Line 2 (colored keywords pattern):
Three separate lines, left-aligned, stacked:
```
[Custom] strength training.
[Scheduled] cardio.
[Built-in] mobility.
```

Each colored keyword:
```css
font-size: 22px;
font-weight: 700;
/* Strength keyword */ color: #ef4444;
/* Cardio keyword   */ color: #378ADD;
/* Mobility keyword */ color: #0F6E56;
```
Rest of each line:
```css
font-size: 22px;
font-weight: 400;
color: rgba(255,255,255,0.7);
```

Line 3 (closer, muted):
```css
font-size: 16px;
color: rgba(255,255,255,0.4);
margin-top: 1rem;
```
Content: "Designed around your life."

### Sign in button

```css
margin-top: 2.5rem;
background: #ef4444;
border: none;
border-radius: 10px;
padding: 14px 32px;
color: #fff;
font-size: 16px;
font-weight: 700;
cursor: pointer;
width: 100%;
max-width: 360px;
display: flex;
align-items: center;
justify-content: center;
gap: 10px;
box-shadow: 0 4px 24px rgba(239,68,68,0.35);
letter-spacing: -0.01em;
```
Content: Google icon (17px) + "Continue with Google"

Fine print below:
```css
font-size: 12px;
color: rgba(255,255,255,0.2);
margin-top: 0.875rem;
```
Content: "Free · No credit card · Syncs across devices"

### Three pillar cards

Below the sign-in button. Three equal columns.

```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 10px;
width: 100%;
max-width: 480px;
margin-top: 2.5rem;
```

Each card:
```css
background: #0d0d0d;
border: 0.5px solid rgba(255,255,255,0.07);
border-radius: 10px;
padding: 1.125rem 1rem;
text-align: center;
position: relative;
overflow: hidden;
```

Colored top accent line per pillar:
```css
/* ::before */
position: absolute;
top: 0; left: 0; right: 0;
height: 2px;

/* Strength */ background: linear-gradient(90deg, #ef4444, transparent);
/* Cardio   */ background: linear-gradient(90deg, #378ADD, transparent);
/* Mobility */ background: linear-gradient(90deg, #0F6E56, transparent);
```

Icon: 24px emoji, margin-bottom 8px
Title: 13px, font-weight 700, #fff, margin-bottom 4px
Body: 11px, rgba(255,255,255,0.35), line-height 1.5

Three cards:
| Pillar | Icon | Title | Body |
|--------|------|-------|------|
| Strength | 🏋️ | Strength | Built for your equipment. |
| Cardio | 🚴 | Cardio | Fits your schedule. |
| Mobility | 🧘 | Mobility | Keeps you moving well. |

### Footer tagline

Below the cards:
```css
font-size: 12px;
color: rgba(255,255,255,0.2);
margin-top: 1.5rem;
text-align: center;
```
Content: "Personalized. Adaptive. Effective. For busy dads who show up."

"show up" in red `#ef4444`.

### On sign-in

Triggers Google OAuth flow (existing implementation unchanged).

After successful auth **and profile hydrate**:

```
if profile.onboardingComplete === true:
  → Home

if profile.onboardingComplete === false (default for new accounts):
  → Education (Screen 2)
```

Do not route until `profileReady` — show a brief loading state while profile syncs from cloud.

---

## Screen 2 — Education / Welcome

**Audience:** New users only — `profile.onboardingComplete === false`, and **not** in “Edit routine” mode (no `editRoutineSnapshot`).

Shown on **every** sign-in and app entry until onboarding completes — including if the user quit mid-onboarding. They always pass through Education, then continue into Onboarding (which resumes at the saved step if applicable).

Never shown after `onboardingComplete = true`. Never shown during “Edit routine” (returning users).

Goal: orient, not sell. They already signed up.
One screen. No scroll. Get out of the way.

### Layout

```css
background: #000;
min-height: 100vh;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 3rem 2rem;
text-align: center;
```

Max content width: 520px, centered.

### Logo

```css
width: 90px;
height: 90px;
object-fit: contain;
mix-blend-mode: screen;
margin-bottom: 1.75rem;
filter:
  drop-shadow(0 0 14px rgba(184,134,11,0.18))
  drop-shadow(0 0 32px rgba(139,26,26,0.1));
```

### Greeting

```css
font-size: 11px;
color: rgba(239,68,68,0.7);
text-transform: uppercase;
letter-spacing: 0.15em;
font-weight: 600;
margin-bottom: 0.625rem;
```
Content: "Welcome to BusyDad Gym"

### Headline

```css
font-size: 34px;
font-weight: 800;
color: #fff;
letter-spacing: -0.5px;
line-height: 1.1;
margin-bottom: 0.5rem;
```
Content: "Here's what we'll build together."

### Subline

```css
font-size: 14px;
color: rgba(255,255,255,0.35);
line-height: 1.55;
margin-bottom: 1.75rem;
```
Content: "Two quick questions. Then your first session is ready."

### Build list card

```css
width: 100%;
background: #0d0d0d;
border: 0.5px solid rgba(255,255,255,0.07);
border-radius: 12px;
padding: 1.25rem 1.25rem;
margin-bottom: 1.25rem;
text-align: left;
```

Three items, each:
```css
display: flex;
align-items: flex-start;
gap: 12px;
padding: 0.75rem 0;
border-bottom: 0.5px solid rgba(255,255,255,0.05);
```
Last item: no border-bottom.

Dot (flex-shrink: 0, margin-top: 4px):
```css
width: 6px; height: 6px; border-radius: 50%;
/* Strength */ background: #ef4444;
/* Cardio   */ background: #378ADD;
/* Mobility */ background: #0F6E56;
```

Item label:
```css
font-size: 13px;
font-weight: 600;
color: #fff;
margin-bottom: 2px;
```

Item description:
```css
font-size: 12px;
color: rgba(255,255,255,0.35);
line-height: 1.5;
```

Three items:
| Label | Description |
|-------|-------------|
| Strength routine | Push, Pull, Legs — built around your equipment. Progressive overload tracked automatically. |
| Cardio, slotted in | Scheduled on the right days so it never competes with your lifting. |
| Mobility, actually done | Built into your week so it stops being the thing you skip. |

### Time divider

```css
display: flex;
align-items: center;
gap: 10px;
width: 100%;
margin-bottom: 1.25rem;
font-size: 11px;
color: rgba(255,255,255,0.2);
justify-content: center;
```
Lines either side: `flex: 1; height: 0.5px; background: rgba(255,255,255,0.07); max-width: 60px`
Content: "Takes about 2 minutes"

### CTA

```css
background: #ef4444;
border: none;
border-radius: 9px;
padding: 13px 28px;
color: #fff;
font-size: 15px;
font-weight: 700;
cursor: pointer;
width: 100%;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
box-shadow: 0 4px 20px rgba(239,68,68,0.35);
letter-spacing: -0.01em;
```
Content: "Build my routine →"

### Step preview

Below the CTA, shows what's coming in onboarding:

```css
display: flex;
align-items: center;
justify-content: center;
margin-top: 1.25rem;
gap: 0;
```

Four steps connected by dividers:
```css
/* Step */
font-size: 11px;
color: rgba(255,255,255,0.25);
padding: 0 0.75rem;
display: flex;
align-items: center;
gap: 6px;

/* Number bubble */
width: 18px; height: 18px;
border-radius: 50%;
background: rgba(239,68,68,0.12);
border: 0.5px solid rgba(239,68,68,0.25);
color: rgba(239,68,68,0.7);
font-size: 10px; font-weight: 700;

/* Divider between steps */
width: 14px; height: 0.5px;
background: rgba(255,255,255,0.07);
```

Four steps: ① Equipment  ② Cardio  ③ Routine  ④ Start

### On CTA tap

Navigate to onboarding Screen 1 (Equipment picker).

---

## Screen 3 — Onboarding

**Audience:** New users only — `profile.onboardingComplete === false`.

4-step flow. See full spec: 10-onboarding.md

Also used when a **returning** user chooses “Edit routine” (re-onboarding without Education).

On completion:
- Set `profile.onboardingComplete = true`
- Persist profile (local + cloud sync)
- Navigate to Home

---

## Returning user path (summary)

After Google sign-in + profile hydrate, when `profile.onboardingComplete === true`:

- Skip Screen 2 (Education)
- Skip Screen 3 (Onboarding)
- Go directly to Home

No re-onboarding prompts on login. Equipment/preference changes post-onboarding go through Settings (to be built) or explicit “Edit routine” (Onboarding only, no Education).

**Implementation:** `NewUserSetupFlow` shows Education, then Onboarding. Edit routine (`editRoutineSnapshot` set) skips Education.

---

## What does not change

- Google OAuth implementation — unchanged
- Post-auth routing — add `profile.onboardingComplete` gate + Education screen for first-time users; returning users go straight to Home
- Profile sync — `user_profiles` in Supabase is source of truth across devices (see profile hydrate on sign-in)
- All app screens beyond Home — unchanged
