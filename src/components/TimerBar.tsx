import { useState } from 'react'
import type { TimerStatus } from '../types/workout'

// ─── Segment map ────────────────────────────────────────────────────────────

const SEGMENT_MAP: Record<string, string[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
}

const SEGMENT_POSITIONS: Record<string, React.CSSProperties> = {
  a: { position: 'absolute', top: 0, left: 6, width: 40, height: 7, borderRadius: 3 },
  b: { position: 'absolute', top: 6, right: 0, width: 7, height: 36, borderRadius: 3 },
  c: { position: 'absolute', bottom: 6, right: 0, width: 7, height: 36, borderRadius: 3 },
  d: { position: 'absolute', bottom: 0, left: 6, width: 40, height: 7, borderRadius: 3 },
  e: { position: 'absolute', bottom: 6, left: 0, width: 7, height: 36, borderRadius: 3 },
  f: { position: 'absolute', top: 6, left: 0, width: 7, height: 36, borderRadius: 3 },
  g: { position: 'absolute', top: 'calc(50% - 3.5px)', left: 6, width: 40, height: 7, borderRadius: 3 },
}

const SEGS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const

// ─── Sub-components ──────────────────────────────────────────────────────────

function SevenSegDigit({ digit, color }: { digit: string; color: 'amber' | 'red' }) {
  const activeSegs = SEGMENT_MAP[digit] ?? []
  const isAmber = color === 'amber'
  const onStyle: React.CSSProperties = isAmber
    ? { background: '#e08800', boxShadow: '0 0 2px rgba(224,136,0,0.8), 0 0 4px rgba(200,120,0,0.3)' }
    : { background: '#dd1515', boxShadow: '0 0 2px rgba(220,20,20,0.8), 0 0 4px rgba(200,0,0,0.3)' }
  const offStyle: React.CSSProperties = isAmber
    ? { background: 'rgba(80,40,0,0.15)' }
    : { background: 'rgba(100,0,0,0.15)' }

  return (
    <div style={{ position: 'relative', width: 52, height: 90, flexShrink: 0 }}>
      {SEGS.map((seg) => (
        <div key={seg} style={{ ...SEGMENT_POSITIONS[seg], ...(activeSegs.includes(seg) ? onStyle : offStyle) }} />
      ))}
    </div>
  )
}

function LedColon({ color, on }: { color: 'amber' | 'red'; on: boolean }) {
  const isAmber = color === 'amber'
  const dotOn: React.CSSProperties = isAmber
    ? { background: '#e08800', boxShadow: '0 0 2px rgba(224,136,0,0.7)' }
    : { background: '#dd1515', boxShadow: '0 0 2px rgba(220,20,20,0.7)' }
  const dotOff: React.CSSProperties = isAmber
    ? { background: 'rgba(80,40,0,0.2)' }
    : { background: 'rgba(100,0,0,0.18)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18, height: 90, width: 20, paddingBottom: 4, flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', ...(on ? dotOn : dotOff) }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', ...(on ? dotOn : dotOff) }} />
    </div>
  )
}

function toDigits(totalSeconds: number): [string, string, string, string] {
  const s = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.min(Math.floor(s / 60), 99)
  const seconds = s % 60
  return [
    String(Math.floor(minutes / 10)),
    String(minutes % 10),
    String(Math.floor(seconds / 10)),
    String(seconds % 10),
  ]
}

function TimerDisplay({ seconds, color, colonOn }: { seconds: number; color: 'amber' | 'red'; colonOn: boolean }) {
  const [d0, d1, d2, d3] = toDigits(seconds)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <SevenSegDigit digit={d0} color={color} />
      <SevenSegDigit digit={d1} color={color} />
      <LedColon color={color} on={colonOn} />
      <SevenSegDigit digit={d2} color={color} />
      <SevenSegDigit digit={d3} color={color} />
    </div>
  )
}

// ─── Preset chips ────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
]

// ─── Main component ──────────────────────────────────────────────────────────

interface TimerBarProps {
  remaining: number
  duration: number
  status: TimerStatus
  muted: boolean
  elapsedSeconds?: number
  embedded?: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onAdjust: (deltaSeconds: number) => void
  onSetDuration: (seconds: number) => void
  onToggleMute: () => void
}

export function TimerBar({
  remaining,
  duration,
  status,
  muted,
  elapsedSeconds,
  embedded = false,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSetDuration,
  onToggleMute,
}: TimerBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isRunning = status === 'running'
  const restSeconds = status === 'idle' ? duration : remaining
  const workoutSeconds = elapsedSeconds ?? 0

  // Colon blinks every second when running
  const workoutColonOn = Math.floor(workoutSeconds) % 2 === 0
  const restColonOn = isRunning ? Math.floor(restSeconds) % 2 === 0 : true

  const handleChip = (seconds: number) => {
    onSetDuration(seconds)
    onStart()
  }

  return (
    <header
      className={embedded ? '' : 'sticky top-0 z-50'}
      style={{
        background: '#000',
        borderRadius: '10px 10px 0 0',
        boxShadow: 'inset 0 3px 14px rgba(0,0,0,0.95), inset 0 -1px 3px rgba(255,255,255,0.015), 0 6px 32px rgba(0,0,0,0.7)',
        borderBottom: '1px solid #0a0a0a',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => setDrawerOpen((o) => !o)}
    >
      {/* Scanline overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        pointerEvents: 'none',
        zIndex: 10,
      }} />

      {/* Ambient split glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 40% 60% at 25% 50%, rgba(255,160,0,0.025) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 75% 50%, rgba(220,20,20,0.035) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Digit display row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4rem',
        padding: '2rem 3rem 1.25rem',
        position: 'relative',
        zIndex: 5,
      }}>
        {/* Workout column */}
        <TimerDisplay seconds={workoutSeconds} color="amber" colonOn={workoutColonOn} />

        {/* Divider */}
        <div style={{ width: 1, height: 100, background: 'rgba(255,255,255,0.04)', alignSelf: 'center' }} />

        {/* Rest column */}
        <TimerDisplay seconds={restSeconds} color="red" colonOn={restColonOn} />
      </div>

      {/* Legend row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4rem',
        padding: '0 3rem 1.25rem',
        position: 'relative',
        zIndex: 5,
      }}>
        {/* Workout legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e08800', boxShadow: '0 0 4px rgba(224,136,0,0.7)', flexShrink: 0 }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, color: 'rgba(224,136,0,0.5)' }}>Overall workout</span>
        </div>

        {/* Spacer */}
        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.05)' }} />

        {/* Rest legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dd1515', boxShadow: '0 0 4px rgba(220,20,20,0.7)', flexShrink: 0 }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, color: 'rgba(220,20,20,0.45)' }}>Rest timer</span>
        </div>
      </div>

      {/* Tap hint */}
      <span style={{
        position: 'absolute',
        bottom: 10,
        right: 16,
        fontSize: 8,
        color: 'rgba(255,255,255,0.06)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        zIndex: 5,
        opacity: drawerOpen ? 0 : 1,
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
      }}>
        tap to control
      </span>

      {/* Drawer */}
      <div
        style={{
          maxHeight: drawerOpen ? 120 : 0,
          opacity: drawerOpen ? 1 : 0,
          overflow: 'hidden',
          borderTop: drawerOpen ? '1px solid rgba(255,255,255,0.04)' : '0px solid rgba(255,255,255,0.04)',
          transition: 'max-height 0.25s ease, opacity 0.2s ease',
          position: 'relative',
          zIndex: 15,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '0.875rem 3rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Rest row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', width: 56, flexShrink: 0, color: 'rgba(220,20,20,0.4)' }}>Rest</span>

            {/* Start/Pause */}
            <button
              type="button"
              onClick={isRunning ? onPause : onStart}
              style={{ background: '#dd1515', border: '0.5px solid #dd1515', borderRadius: 5, padding: '9px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>

            {/* −15s */}
            <button
              type="button"
              onClick={() => onAdjust(-15)}
              style={{ background: 'transparent', border: '0.5px solid rgba(220,20,20,0.2)', borderRadius: 5, padding: '9px 16px', color: 'rgba(220,20,20,0.6)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
            >
              −15s
            </button>

            {/* +15s */}
            <button
              type="button"
              onClick={() => onAdjust(15)}
              style={{ background: 'transparent', border: '0.5px solid rgba(220,20,20,0.2)', borderRadius: 5, padding: '9px 16px', color: 'rgba(220,20,20,0.6)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
            >
              +15s
            </button>

            {/* Preset chips */}
            {PRESETS.map(({ label, seconds }) => {
              const isActive = duration === seconds
              return (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => handleChip(seconds)}
                  style={isActive
                    ? { fontSize: 13, padding: '9px 20px', borderRadius: 20, border: '0.5px solid rgba(220,20,20,0.5)', background: 'rgba(220,20,20,0.2)', color: '#dd1515', cursor: 'pointer', flexShrink: 0 }
                    : { fontSize: 13, padding: '9px 20px', borderRadius: 20, border: '0.5px solid rgba(220,20,20,0.2)', background: 'transparent', color: 'rgba(220,20,20,0.45)', cursor: 'pointer', flexShrink: 0 }
                  }
                >
                  {label}
                </button>
              )
            })}

            {/* Mute */}
            <button
              type="button"
              onClick={onToggleMute}
              style={{ marginLeft: 'auto', background: 'rgba(220,20,20,0.1)', border: '0.5px solid rgba(220,20,20,0.25)', borderRadius: 5, padding: '9px 16px', color: muted ? '#dd1515' : 'rgba(220,20,20,0.5)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>

          {/* Workout row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', width: 56, flexShrink: 0, color: 'rgba(224,136,0,0.4)' }}>Workout</span>

            <button
              type="button"
              onClick={onReset}
              style={{ background: 'rgba(224,136,0,0.12)', border: '0.5px solid rgba(224,136,0,0.25)', borderRadius: 5, padding: '9px 16px', color: '#e08800', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
