# Spec: Landing Page / Sign-in Screen

Single screen. Does two jobs: sells the product
and handles sign-in. No separate marketing page.

Reference prototype: landing-signin.html

---

## Color system (this screen)

Red `#ef4444` — eyebrow text, prop numbers, 
  "show up" tagline accent
Blue `#378ADD` — Cardio keyword + card accent
Green `#0F6E56` — Mobility keyword + card accent
Gold — NOT used anywhere on this screen.
  Exists only inside the logo image asset.

---

## Layout

```
[Nav — sticky]
[Hero — full viewport height]
[Value props strip — 4 columns]
[Footer tagline]
```

```css
background: #000;
color: #fff;
font-family: system font;
min-height: 100vh;
display: flex;
flex-direction: column;
```

---

## Nav

```css
display: flex;
align-items: center;
justify-content: space-between;
padding: 1rem 2.5rem;
background: rgba(0,0,0,0.9);
border-bottom: 0.5px solid rgba(255,255,255,0.06);
position: sticky;
top: 0;
z-index: 50;
backdrop-filter: blur(12px);
flex-shrink: 0;
```

### Logo mark (left)

```css
display: flex;
align-items: center;
gap: 10px;
```

Image: bd-gym-logo.png
```css
height: 32px;
width: 32px;
object-fit: contain;
mix-blend-mode: screen;
```

Wordmark:
```css
font-size: 15px;
font-weight: 700;
color: #fff;
letter-spacing: -0.01em;
```
Content: "BusyDad Gym"

### Sign in button (right)

```css
background: #fff;
border: none;
border-radius: 8px;
padding: 8px 18px;
color: #111;
font-size: 13px;
font-weight: 600;
cursor: pointer;
display: flex;
align-items: center;
gap: 7px;
```
Content: Google SVG icon (16px) + "Sign in"
For returning users who scroll past the hero.
Triggers Google OAuth — same as hero CTA.

---

## Hero

Full viewport height minus nav.

```css
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
text-align: center;
flex: 1;
padding: 3rem 2rem 2rem;
position: relative;
overflow: hidden;
min-height: calc(100vh - 60px);
```

### Background tint (::before)

Very faint — just a hint of warmth behind logo:
```css
position: absolute;
top: 0;
left: 50%;
transform: translateX(-50%);
width: 600px;
height: 400px;
background: radial-gradient(ellipse at center,
  rgba(139,26,26,0.14) 0%,
  transparent 70%
);
pointer-events: none;
```

### Logo

```css
width: 200px;
height: 200px;
object-fit: contain;
margin-bottom: 2rem;
position: relative;
z-index: 1;
mix-blend-mode: screen;
```
NO glow. NO drop-shadow. Screen blend removes
the black box cleanly. Nothing else needed.
Image: bd-gym-logo.png

### Eyebrow

```css
font-size: 11px;
color: rgba(239,68,68,0.65);
text-transform: uppercase;
letter-spacing: 0.2em;
font-weight: 600;
margin-bottom: 1.25rem;
position: relative;
z-index: 1;
```
Content: "Crafted strength for busy dads"

### Colored keyword block

Three lines, stacked, center-aligned:

```css
display: flex;
flex-direction: column;
align-items: center;
gap: 3px;
margin-bottom: 1.25rem;
position: relative;
z-index: 1;
```

Each line:
```css
font-size: 26px;
line-height: 1.3;
```

Keyword portion:
```css
font-weight: 800;
```
Colors:
- "Custom" → #ef4444
- "Scheduled" → #378ADD
- "Built-in" → #0F6E56

Rest of each line:
```css
color: rgba(255,255,255,0.65);
font-weight: 400;
```

Three lines:
```
[Custom] strength training.
[Scheduled] cardio.
[Built-in] mobility.
```

### Closer

```css
font-size: 16px;
color: rgba(255,255,255,0.38);
line-height: 1.65;
margin-bottom: 2.5rem;
position: relative;
z-index: 1;
max-width: 420px;
```
Content: "Balanced the way a coach would. Open it,
know what to do, log it fast — done in 45 minutes."

### Continue with Google button

```css
background: #fff;
border: none;
border-radius: 10px;
padding: 14px 32px;
color: #111;
font-size: 16px;
font-weight: 700;
cursor: pointer;
display: flex;
align-items: center;
gap: 10px;
box-shadow: 0 2px 12px rgba(0,0,0,0.4);
position: relative;
z-index: 1;
transition: all 0.15s;
letter-spacing: -0.01em;
```

Hover:
```css
transform: translateY(-1px);
box-shadow: 0 4px 20px rgba(0,0,0,0.5);
```

Content: Official Google SVG icon (20px) + "Continue with Google"

Use the official Google G icon SVG:
```svg
<svg viewBox="0 0 24 24" width="20" height="20">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
```

Triggers Google OAuth flow (existing implementation).

After successful auth:
```
if user.onboardingComplete === true  → home screen
if user.onboardingComplete === false → education screen
```

### Fine print

```css
font-size: 12px;
color: rgba(255,255,255,0.2);
margin-top: 0.875rem;
position: relative;
z-index: 1;
```
Content: "Free · No credit card · First session in 2 minutes"

### Three pillar cards

```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 12px;
width: 100%;
max-width: 680px;
margin-top: 2.5rem;
position: relative;
z-index: 1;
```

**Card:**
```css
background: #0d0d0d;
border: 0.5px solid rgba(255,255,255,0.07);
border-radius: 11px;
padding: 1.5rem 1.25rem;
text-align: center;
position: relative;
overflow: hidden;
transition: border-color 0.15s;
```

Hover:
```css
border-color: rgba(255,255,255,0.13);
```

Colored top accent line (::before):
```css
position: absolute;
top: 0; left: 0; right: 0;
height: 2px;
```
- Strength: `background: linear-gradient(90deg, #ef4444, transparent)`
- Cardio:   `background: linear-gradient(90deg, #378ADD, transparent)`
- Mobility: `background: linear-gradient(90deg, #0F6E56, transparent)`

**Icon wrapper:**
```css
width: 44px;
height: 44px;
margin: 0 auto 1rem;
display: flex;
align-items: center;
justify-content: center;
```

All icons: SVG line art, stroke-width 1.8,
stroke-linecap round, stroke-linejoin round.
No emojis.

**Strength icon** — dumbbell:
```svg
<svg viewBox="0 0 36 36" fill="none"
     stroke="#ef4444" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round">
  <rect x="2"  y="14" width="4"  height="8" rx="1.5"/>
  <rect x="30" y="14" width="4"  height="8" rx="1.5"/>
  <rect x="6"  y="11" width="4"  height="14" rx="1.5"/>
  <rect x="26" y="11" width="4"  height="14" rx="1.5"/>
  <line x1="10" y1="18" x2="26" y2="18"/>
</svg>
```

**Cardio icon** — heart with ECG line:
```svg
<svg viewBox="0 0 36 36" fill="none"
     stroke="#378ADD" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 30s-14-8.5-14-17a8 8 0 0 1 14-5.3A8 8 0 0 1 32 13c0 8.5-14 17-14 17z"/>
  <polyline points="6,18 11,14 15,22 20,10 24,18 30,18"/>
</svg>
```

**Mobility icon** — warrior pose stick figure:
Head is a filled circle, right side, mid height.
Torso leans diagonally forward-left.
One arm reaches high up-left.
Other arm extends back low-right.
Front knee bent, foot planted below.
Back leg extended far left, low.
```svg
<svg viewBox="0 0 36 36" fill="none"
     stroke="#0F6E56" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round">
  <circle cx="26" cy="12" r="3" fill="#0F6E56" stroke="none"/>
  <line x1="26" y1="15" x2="18" y2="22"/>
  <line x1="22" y1="17" x2="14" y2="8"/>
  <line x1="22" y1="17" x2="30" y2="21"/>
  <line x1="18" y1="22" x2="24" y2="28"/>
  <line x1="24" y1="28" x2="24" y2="33"/>
  <line x1="18" y1="22" x2="7"  y2="27"/>
  <line x1="7"  y1="27" x2="4"  y2="33"/>
</svg>
```

**Card title:**
```css
font-size: 17px;
font-weight: 700;
color: #fff;
margin-bottom: 8px;
```

**Card body:**
```css
font-size: 14px;
color: rgba(255,255,255,0.38);
line-height: 1.6;
```

Three cards:

| Pillar | Title | Body |
|--------|-------|------|
| Strength | Strength | A training program built around the equipment you actually have. |
| Cardio | Cardio | Scheduled on the right days so it never competes with your lifting. |
| Mobility | Mobility | Built into your week so it stops being the thing you skip. |

---

## Value props strip

```css
display: grid;
grid-template-columns: repeat(4, 1fr);
border-top: 0.5px solid rgba(255,255,255,0.07);
background: #080808;
```

Each column:
```css
padding: 1.75rem 1.5rem;
border-right: 0.5px solid rgba(255,255,255,0.06);
```
Last column: no border-right.

Number:
```css
font-size: 10px;
color: rgba(239,68,68,0.5);
font-weight: 700;
letter-spacing: 0.12em;
margin-bottom: 8px;
font-family: 'Courier New', monospace;
```

Title:
```css
font-size: 14px;
font-weight: 700;
color: #fff;
margin-bottom: 6px;
line-height: 1.2;
```

Body:
```css
font-size: 12px;
color: rgba(255,255,255,0.32);
line-height: 1.6;
```

Four props:

| # | Title | Body |
|---|-------|------|
| 01 | Instant routine | Pick Push / Pull / Legs or cardio. First session starts immediately — no setup required. |
| 02 | Always know what to lift | Last session remembered. Weight suggested. No guessing, no mental math mid-workout. |
| 03 | Log in seconds | Built-in rest timers. One tap per set. Get in, log it, get out — no friction. |
| 04 | Progress automatically | Hit your reps and the app tells you to go heavier next time. You just show up. |

---

## Footer tagline

```css
text-align: center;
padding: 1.25rem 2rem;
border-top: 0.5px solid rgba(255,255,255,0.05);
font-size: 12px;
color: rgba(255,255,255,0.2);
background: #000;
```

Content: "Personalized. Adaptive. Effective.
For busy dads who show up."

"show up" styled:
```css
color: #ef4444;
font-style: normal;
```

---

## What does not change

- Google OAuth implementation — unchanged
- Post-auth routing logic — add onboardingComplete
  gate per spec 11-user-flow.md, otherwise unchanged
