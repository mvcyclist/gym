import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../utils/formatTime'
import type { TimerStatus } from '../types/workout'

const QUICK_DURATIONS = [30, 60, 90, 120, 180] as const

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
  const containerRef = useRef<HTMLElement>(null)

  const displayTime = status === 'idle' && remaining === duration ? duration : remaining
  const isComplete = status === 'complete'
  const isRunning = status === 'running'

  // Auto-close drawer when rest timer starts
  useEffect(() => {
    if (status === 'running') setDrawerOpen(false)
  }, [status])

  // Auto-close when clicking outside
  useEffect(() => {
    if (!drawerOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [drawerOpen])

  return (
    <header
      ref={containerRef}
      className={embedded ? '' : 'sticky top-0 z-50'}
      style={{ background: '#0a0a0a', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      {/* Timer row — click anywhere to toggle drawer */}
      <div
        className="mx-auto flex max-w-6xl items-center"
        style={{
          padding: '1rem 1.5rem',
          gap: '2rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setDrawerOpen((o) => !o)}
      >
        {/* Workout timer block */}
        {elapsedSeconds !== undefined && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Workout
            </span>
            <span
              style={{
                fontSize: 80,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-1px',
                lineHeight: 1,
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Courier New', monospace",
              }}
            >
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        )}

        {/* Divider */}
        {elapsedSeconds !== undefined && (
          <span
            style={{
              fontSize: 36,
              color: 'rgba(255,255,255,0.08)',
              alignSelf: 'flex-end',
              paddingBottom: 6,
            }}
          >
            /
          </span>
        )}

        {/* Rest timer block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Rest
          </span>
          <span
            style={{
              fontSize: 80,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-1px',
              lineHeight: 1,
              color: isComplete ? '#22c55e' : '#ef4444',
              fontFamily: "'Courier New', monospace",
            }}
          >
            {isComplete ? 'Done' : formatTime(displayTime)}
          </span>
        </div>

        {/* Three-dot hint */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transform: drawerOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: drawerOpen ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Controls drawer */}
      <div
        style={{
          background: '#080808',
          borderTop: '0.5px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
          maxHeight: drawerOpen ? 80 : 0,
          opacity: drawerOpen ? 1 : 0,
          padding: drawerOpen ? '0.75rem 1.5rem' : '0 1.5rem',
          transition: 'max-height 0.2s ease, opacity 0.15s ease, padding 0.2s ease',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center" style={{ gap: 6 }}>
          {/* Start / Pause */}
          <button
            type="button"
            onClick={isRunning ? onPause : onStart}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: 5,
              padding: '6px 14px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>

          {/* Reset / −15s / +15s */}
          {(['Reset', '−15s', '+15s'] as const).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (label === 'Reset') onReset()
                else if (label === '−15s') onAdjust(-15)
                else onAdjust(15)
              }}
              style={{
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.18)',
                borderRadius: 5,
                padding: '6px 14px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}

          {/* Preset chips */}
          {QUICK_DURATIONS.map((seconds) => {
            const isActive = duration === seconds
            return (
              <button
                key={seconds}
                type="button"
                onClick={() => onSetDuration(seconds)}
                style={
                  isActive
                    ? {
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 20,
                        border: '0.5px solid #ef4444',
                        background: '#ef4444',
                        color: '#fff',
                        cursor: 'pointer',
                      }
                    : {
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 20,
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                      }
                }
              >
                {seconds}s
              </button>
            )
          })}

          {/* Mute */}
          <button
            type="button"
            onClick={onToggleMute}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 5,
              padding: '5px 10px',
              color: muted ? '#ef4444' : 'rgba(255,255,255,0.35)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {muted ? 'Unmuted' : 'Mute'}
          </button>
        </div>
      </div>
    </header>
  )
}
