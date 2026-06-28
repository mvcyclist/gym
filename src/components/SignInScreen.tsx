import { getLocalOAuthSetupHint } from '../lib/authRedirect'

interface SignInScreenProps {
  onSignIn: () => Promise<void>
  error?: string | null
}

const GOLD = '#B8860B'

const VALUE_PROPS = [
  {
    num: '01',
    title: 'Instant routine',
    body: 'Pick Push / Pull / Legs or cardio. First session starts immediately — no setup required.',
  },
  {
    num: '02',
    title: 'Always know what to lift',
    body: 'Last session remembered. Weight suggested. No guessing, no mental math mid-workout.',
  },
  {
    num: '03',
    title: 'Log in seconds',
    body: 'Built-in rest timers. One tap per set. Get in, log it, get out — no friction.',
  },
  {
    num: '04',
    title: 'Progress automatically',
    body: 'Hit your reps and the app tells you to go heavier next time. You just show up.',
  },
] as const

export function SignInScreen({ onSignIn, error }: SignInScreenProps) {
  const devHint = getLocalOAuthSetupHint()

  return (
    <div className="landing-page">
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/bd-gym-logo.png"
            alt=""
            width={38}
            height={38}
            style={{ height: 38, width: 38, objectFit: 'contain' }}
          />
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.01em',
          }}>
            BusyDad Gym
          </span>
        </div>

        <button
          type="button"
          onClick={() => void onSignIn()}
          style={{
            background: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 20px',
            color: '#111',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <GoogleIcon size={16} />
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '3rem 2rem 4rem',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 500,
            height: 500,
            background: `radial-gradient(ellipse at center, rgba(184,134,11,0.12) 0%, rgba(139,26,26,0.08) 40%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <img
          src="/bd-gym-logo.png"
          alt="BusyDad Gym"
          width={220}
          height={220}
          style={{
            width: 220,
            height: 220,
            objectFit: 'contain',
            marginBottom: '2rem',
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 0 30px rgba(184,134,11,0.25)) drop-shadow(0 0 60px rgba(139,26,26,0.15))',
          }}
        />

        <p style={{
          fontSize: 11,
          color: GOLD,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontWeight: 600,
          marginBottom: '1rem',
          position: 'relative',
          zIndex: 1,
        }}>
          Crafted strength for busy dads
        </p>

        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 52px)',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-1.5px',
          lineHeight: 1.05,
          marginBottom: '1.25rem',
          position: 'relative',
          zIndex: 1,
          margin: '0 0 1.25rem',
        }}>
          Train like a dad.
          <br />
          <span style={{ color: GOLD }}>Think like an athlete.</span>
        </h1>

        <p style={{
          fontSize: 17,
          color: 'rgba(255,255,255,0.4)',
          maxWidth: 440,
          lineHeight: 1.65,
          marginBottom: '2.5rem',
          position: 'relative',
          zIndex: 1,
        }}>
          Efficient workouts, intelligent progression. Open it,
          know what to do, log it fast — done in 45 minutes.
        </p>

        {devHint && (
          <p style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '1.25rem',
            maxWidth: 440,
            borderRadius: 8,
            border: '0.5px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)',
            padding: '10px 14px',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'rgba(254,243,199,0.9)',
          }}>
            {devHint}
          </p>
        )}

        {error && (
          <p style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '1.25rem',
            maxWidth: 440,
            borderRadius: 8,
            border: '0.5px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.1)',
            padding: '10px 14px',
            fontSize: 13,
            color: '#fca5a5',
          }}>
            {error}
          </p>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.875rem',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            type="button"
            onClick={() => void onSignIn()}
            style={{
              background: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '14px 32px',
              color: '#111',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: '-0.01em',
            }}
          >
            <GoogleIcon size={17} />
            Continue with Google
          </button>
          <p style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.02em',
            margin: 0,
          }}>
            Free · No credit card · First session in 2 minutes
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="landing-value-props">
        {VALUE_PROPS.map((prop, index) => (
          <div
            key={prop.num}
            className="landing-value-prop"
            style={{
              padding: '1.5rem',
              borderRight: index < VALUE_PROPS.length - 1
                ? '0.5px solid rgba(255,255,255,0.06)'
                : undefined,
            }}
          >
            <div style={{
              fontSize: 10,
              color: GOLD,
              fontWeight: 700,
              letterSpacing: '0.12em',
              marginBottom: 6,
              fontFamily: "'Courier New', Courier, monospace",
            }}>
              {prop.num}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 5,
              lineHeight: 1.2,
            }}>
              {prop.title}
            </div>
            <p style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.32)',
              lineHeight: 1.55,
              margin: 0,
            }}>
              {prop.body}
            </p>
          </div>
        ))}
      </section>

      <style>{`
        .landing-page {
          background: #000;
          color: #fff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
          min-height: 100dvh;
          height: 100%;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .landing-value-props {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 0.5px solid rgba(255,255,255,0.07);
          background: #080808;
        }
        @media (max-width: 900px) {
          .landing-value-props {
            grid-template-columns: repeat(2, 1fr);
          }
          .landing-value-prop:nth-child(2) {
            border-right: none !important;
          }
          .landing-value-prop:nth-child(1),
          .landing-value-prop:nth-child(3) {
            border-bottom: 0.5px solid rgba(255,255,255,0.06);
          }
        }
        @media (max-width: 520px) {
          .landing-value-props {
            grid-template-columns: 1fr;
          }
          .landing-value-prop {
            border-right: none !important;
            border-bottom: 0.5px solid rgba(255,255,255,0.06);
          }
          .landing-value-prop:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  )
}

function GoogleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.837 0 5.36 1.18 7.188 3.07l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.837 0 5.36 1.18 7.188 3.07l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28c0 3.998 1.524 7.64 4.009 10.386l6.297-4.695z"
      />
      <path
        fill="#4CAF50"
        d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 38.808 26.715 40 24 40c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.556 16.227 48 24 48z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-1.009 2.785-3.043 5.06-5.697 6.52l6.19 5.238C42.022 35.026 44 31.806 44 28c0-2.748-.722-5.328-1.989-7.583z"
      />
    </svg>
  )
}
