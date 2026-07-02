import { getLocalOAuthSetupHint } from '../lib/authRedirect'

interface SignInScreenProps {
  onSignIn: () => Promise<void>
  error?: string | null
}

const RED = '#ef4444'
const BLUE = '#378ADD'
const GREEN = '#0F6E56'

const KEYWORD_LINES = [
  { keyword: 'Custom', color: RED, rest: 'strength training.' },
  { keyword: 'Scheduled', color: BLUE, rest: 'cardio.' },
  { keyword: 'Built-in', color: GREEN, rest: 'mobility.' },
] as const

const PILLAR_CARDS = [
  {
    title: 'Strength',
    body: 'A training program built around the equipment you actually have.',
    accent: RED,
    icon: <StrengthIcon />,
  },
  {
    title: 'Cardio',
    body: 'Scheduled on the right days so it never competes with your lifting.',
    accent: BLUE,
    icon: <CardioIcon />,
  },
  {
    title: 'Mobility',
    body: 'Built into your week so it stops being the thing you skip.',
    accent: GREEN,
    icon: <MobilityIcon />,
  },
] as const

export function SignInScreen({ onSignIn, error }: SignInScreenProps) {
  const devHint = getLocalOAuthSetupHint()

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <img src="/bd-gym-logo.png" alt="" width={32} height={32} className="landing-nav-logo" />
          <span className="landing-nav-wordmark">BusyDad Gym</span>
        </div>
        <button type="button" className="landing-nav-signin" onClick={() => void onSignIn()}>
          <GoogleIcon size={16} />
          Sign in
        </button>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-tint" aria-hidden />

        <img
          src="/bd-gym-logo.png"
          alt="BusyDad Gym"
          width={200}
          height={200}
          className="landing-hero-logo"
        />

        <p className="landing-eyebrow">Crafted strength for busy dads</p>

        <div className="landing-keywords">
          {KEYWORD_LINES.map((line) => (
            <p key={line.keyword} className="landing-keyword-line">
              <span className="landing-keyword" style={{ color: line.color }}>
                {line.keyword}
              </span>{' '}
              <span className="landing-keyword-rest">{line.rest}</span>
            </p>
          ))}
        </div>

        <p className="landing-closer">
          Balanced the way a coach would. Open it, know what to do, log it fast — done in 45 minutes.
        </p>

        {devHint && <p className="landing-dev-hint">{devHint}</p>}
        {error && <p className="landing-error">{error}</p>}

        <button type="button" className="landing-google-cta" onClick={() => void onSignIn()}>
          <GoogleIcon size={20} />
          Continue with Google
        </button>

        <p className="landing-fine-print">Free · No credit card · First session in 2 minutes</p>

        <div className="landing-pillars">
          {PILLAR_CARDS.map((card) => (
            <div
              key={card.title}
              className="landing-pillar-card"
              style={{ ['--pillar-accent' as string]: card.accent }}
            >
              <div className="landing-pillar-icon">{card.icon}</div>
              <div className="landing-pillar-title">{card.title}</div>
              <p className="landing-pillar-body">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .landing-page {
          background: #000;
          color: #fff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
          min-height: 100dvh;
          height: 100dvh;
          width: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: max(1rem, env(safe-area-inset-top)) 2.5rem 1rem;
          background: rgba(0,0,0,0.9);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          flex-shrink: 0;
        }

        .landing-nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-shrink: 1;
        }

        .landing-nav-logo {
          height: 32px;
          width: 32px;
          flex-shrink: 0;
          object-fit: contain;
          mix-blend-mode: screen;
        }

        .landing-nav-wordmark {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .landing-nav-signin {
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
          flex-shrink: 0;
        }

        .landing-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          flex: 0 0 auto;
          width: 100%;
          padding: 2.5rem 2rem 3rem;
          padding-bottom: max(3rem, env(safe-area-inset-bottom));
          position: relative;
          overflow: visible;
        }

        .landing-hero-tint {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: min(600px, 100vw);
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(139,26,26,0.14) 0%, transparent 70%);
          pointer-events: none;
        }

        .landing-hero-logo {
          width: clamp(140px, 42vw, 200px);
          height: clamp(140px, 42vw, 200px);
          max-width: 100%;
          object-fit: contain;
          margin-bottom: 1.75rem;
          position: relative;
          z-index: 1;
          mix-blend-mode: screen;
          flex-shrink: 0;
        }

        .landing-eyebrow {
          font-size: 11px;
          color: rgba(239,68,68,0.65);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 600;
          margin: 0 0 1.25rem;
          position: relative;
          z-index: 1;
        }

        .landing-keywords {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          margin-bottom: 1.25rem;
          position: relative;
          z-index: 1;
        }

        .landing-keyword-line {
          font-size: 26px;
          line-height: 1.3;
          margin: 0;
        }

        .landing-keyword {
          font-weight: 800;
        }

        .landing-keyword-rest {
          color: rgba(255,255,255,0.65);
          font-weight: 400;
        }

        .landing-closer {
          font-size: 16px;
          color: rgba(255,255,255,0.38);
          line-height: 1.65;
          margin: 0 0 2rem;
          position: relative;
          z-index: 1;
          max-width: 420px;
          padding: 0 0.25rem;
        }

        .landing-dev-hint {
          position: relative;
          z-index: 1;
          margin: 0 0 1.25rem;
          max-width: 420px;
          border-radius: 8px;
          border: 0.5px solid rgba(245,158,11,0.3);
          background: rgba(245,158,11,0.08);
          padding: 10px 14px;
          font-size: 12px;
          line-height: 1.55;
          color: rgba(254,243,199,0.9);
        }

        .landing-error {
          position: relative;
          z-index: 1;
          margin: 0 0 1.25rem;
          max-width: 420px;
          border-radius: 8px;
          border: 0.5px solid rgba(239,68,68,0.4);
          background: rgba(239,68,68,0.1);
          padding: 10px 14px;
          font-size: 13px;
          color: #fca5a5;
        }

        .landing-google-cta {
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
          justify-content: center;
          gap: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
          position: relative;
          z-index: 1;
          transition: all 0.15s;
          letter-spacing: -0.01em;
          width: min(100%, 360px);
          max-width: 100%;
        }

        .landing-google-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .landing-fine-print {
          font-size: 12px;
          color: rgba(255,255,255,0.2);
          margin: 0.875rem 0 0;
          position: relative;
          z-index: 1;
        }

        .landing-pillars {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 680px;
          margin-top: 2rem;
          position: relative;
          z-index: 1;
          padding: 0 0.25rem;
        }

        .landing-pillar-card {
          background: #0d0d0d;
          border: 0.5px solid rgba(255,255,255,0.07);
          border-radius: 11px;
          padding: 1.5rem 1.25rem;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: border-color 0.15s;
        }

        .landing-pillar-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--pillar-accent), transparent);
        }

        .landing-pillar-card:hover {
          border-color: rgba(255,255,255,0.13);
        }

        .landing-pillar-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .landing-pillar-icon svg {
          width: 36px;
          height: 36px;
        }

        .landing-mobility-icon {
          width: 44px;
          height: 44px;
          object-fit: contain;
          mix-blend-mode: screen;
        }

        .landing-pillar-title {
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }

        .landing-pillar-body {
          font-size: 14px;
          color: rgba(255,255,255,0.38);
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 720px) {
          .landing-hero {
            padding: 2rem 1.25rem 2.5rem;
          }

          .landing-keywords {
            padding: 0 0.25rem;
          }

          .landing-keyword-line {
            font-size: clamp(20px, 5.5vw, 22px);
          }

          .landing-pillars {
            grid-template-columns: 1fr;
            max-width: 420px;
          }

          .landing-pillar-body {
            font-size: 13px;
          }
        }

        @media (max-width: 520px) {
          .landing-nav {
            padding: max(0.875rem, env(safe-area-inset-top)) 1rem 0.875rem;
          }

          .landing-nav-signin {
            padding: 8px 14px;
            font-size: 12px;
          }

          .landing-hero {
            padding: 1.5rem 1rem 2rem;
          }

          .landing-eyebrow {
            letter-spacing: 0.14em;
            font-size: 10px;
          }

          .landing-closer {
            font-size: 15px;
          }

          .landing-google-cta {
            padding: 13px 20px;
            font-size: 15px;
          }

          .landing-fine-print {
            font-size: 11px;
            padding: 0 0.5rem;
            line-height: 1.5;
          }
        }
      `}</style>
    </div>
  )
}

function GoogleIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function StrengthIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="14" width="4" height="8" rx="1.5" />
      <rect x="30" y="14" width="4" height="8" rx="1.5" />
      <rect x="6" y="11" width="4" height="14" rx="1.5" />
      <rect x="26" y="11" width="4" height="14" rx="1.5" />
      <line x1="10" y1="18" x2="26" y2="18" />
    </svg>
  )
}

function CardioIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" stroke="#378ADD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 30s-14-8.5-14-17a8 8 0 0 1 14-5.3A8 8 0 0 1 32 13c0 8.5-14 17-14 17z" />
      <polyline points="6,18 11,14 15,22 20,10 24,18 30,18" />
    </svg>
  )
}

function MobilityIcon() {
  return (
    <img
      src="/mobility-icon.png"
      alt=""
      width={44}
      height={44}
      className="landing-mobility-icon"
    />
  )
}
