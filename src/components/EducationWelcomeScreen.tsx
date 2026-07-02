const RED = '#ef4444'

const BUILD_ITEMS = [
  {
    dot: RED,
    label: 'Strength routine',
    description:
      'Push, Pull, Legs — built around your equipment. Progressive overload tracked automatically.',
  },
  {
    dot: '#378ADD',
    label: 'Cardio, slotted in',
    description: 'Scheduled on the right days so it never competes with your lifting.',
  },
  {
    dot: '#0F6E56',
    label: 'Mobility, actually done',
    description: 'Built into your week so it stops being the thing you skip.',
  },
] as const

const ONBOARDING_STEPS = ['Equipment', 'Cardio', 'Routine', 'Start'] as const

interface EducationWelcomeScreenProps {
  onContinue: () => void
}

export function EducationWelcomeScreen({ onContinue }: EducationWelcomeScreenProps) {
  return (
    <div
      style={{
        background: '#000',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <img
          src="/bd-gym-logo.png"
          alt=""
          width={90}
          height={90}
          style={{
            width: 90,
            height: 90,
            objectFit: 'contain',
            mixBlendMode: 'screen',
            marginBottom: '1.75rem',
            filter:
              'drop-shadow(0 0 14px rgba(184,134,11,0.18)) drop-shadow(0 0 32px rgba(139,26,26,0.1))',
          }}
        />

        <p
          style={{
            fontSize: 11,
            color: 'rgba(239,68,68,0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 600,
            marginBottom: '0.625rem',
          }}
        >
          Welcome to BusyDad Gym
        </p>

        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            marginBottom: '0.5rem',
            marginTop: 0,
          }}
        >
          Here&apos;s what we&apos;ll build together.
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.55,
            marginBottom: '1.75rem',
          }}
        >
          Two quick questions. Then your first session is ready.
        </p>

        <div
          style={{
            width: '100%',
            background: '#0d0d0d',
            border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: '1.25rem',
            textAlign: 'left',
          }}
        >
          {BUILD_ITEMS.map((item, index) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '0.75rem 0',
                borderBottom:
                  index < BUILD_ITEMS.length - 1
                    ? '0.5px solid rgba(255,255,255,0.05)'
                    : 'none',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  marginTop: 4,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: item.dot,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.35)',
                    lineHeight: 1.5,
                  }}
                >
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            marginBottom: '1.25rem',
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              flex: 1,
              height: 0.5,
              background: 'rgba(255,255,255,0.07)',
              maxWidth: 60,
            }}
          />
          Takes about 2 minutes
          <span
            style={{
              flex: 1,
              height: 0.5,
              background: 'rgba(255,255,255,0.07)',
              maxWidth: 60,
            }}
          />
        </div>

        <button
          type="button"
          onClick={onContinue}
          style={{
            background: RED,
            border: 'none',
            borderRadius: 9,
            padding: '13px 28px',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
            letterSpacing: '-0.01em',
          }}
        >
          Build my routine →
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1.25rem',
          }}
        >
          {ONBOARDING_STEPS.map((label, index) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              {index > 0 && (
                <span
                  style={{
                    width: 14,
                    height: 0.5,
                    background: 'rgba(255,255,255,0.07)',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.25)',
                  padding: '0 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,0.12)',
                    border: '0.5px solid rgba(239,68,68,0.25)',
                    color: 'rgba(239,68,68,0.7)',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {index + 1}
                </span>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
