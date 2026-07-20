import { useState, useEffect, type CSSProperties } from 'react'
import type { WorkoutCategory, Exercise } from '../types/workout'
import type { BuilderCategoryId } from '../data/workoutCategories'
import { UserMenu } from './UserMenu'
import { CategoryPicker } from './CategoryPicker'
import { WorkoutBuilderFlow } from './WorkoutBuilderFlow'

const SEG_MAP: Record<string, string[]> = {
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

function LedDigit({ char }: { char: string }) {
  const on = SEG_MAP[char] ?? []
  const seg = (name: string, style: CSSProperties) => (
    <div
      key={name}
      style={{
        position: 'absolute',
        borderRadius: 2,
        transition: 'background 0.05s, box-shadow 0.05s',
        background: on.includes(name) ? '#dd1515' : 'rgba(100,0,0,0.15)',
        boxShadow: on.includes(name)
          ? '0 0 2px rgba(220,20,20,0.9), 0 0 5px rgba(200,0,0,0.4)'
          : 'none',
        ...style,
      }}
    />
  )
  return (
    <div style={{ position: 'relative', width: 52, height: 90, flexShrink: 0 }}>
      {seg('a', { top: 0, left: 6, width: 40, height: 7 })}
      {seg('b', { top: 6, right: 0, width: 7, height: 36 })}
      {seg('c', { bottom: 6, right: 0, width: 7, height: 36 })}
      {seg('d', { bottom: 0, left: 6, width: 40, height: 7 })}
      {seg('e', { bottom: 6, left: 0, width: 7, height: 36 })}
      {seg('f', { top: 6, left: 0, width: 7, height: 36 })}
      {seg('g', { top: 'calc(50% - 3.5px)', left: 6, width: 40, height: 7 })}
    </div>
  )
}

function LedColon({ lit }: { lit: boolean }) {
  const dot: CSSProperties = {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: lit ? '#dd1515' : 'rgba(100,0,0,0.18)',
    boxShadow: lit ? '0 0 2px rgba(220,20,20,0.8)' : 'none',
  }
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 18,
      height: 90,
      width: 22,
      paddingBottom: 4,
    }}>
      <div style={dot} />
      <div style={dot} />
    </div>
  )
}

interface HomeScreenProps {
  userEmail?: string
  onSignOut: () => void
  onEditRoutine: () => void
  onProgramChanged?: () => void
  onStartBuilderWorkout: (workoutId: WorkoutCategory, exercises: Exercise[]) => void
}

export function HomeScreen({
  userEmail,
  onSignOut,
  onEditRoutine,
  onProgramChanged,
  onStartBuilderWorkout,
}: HomeScreenProps) {
  const [builderCategory, setBuilderCategory] = useState<BuilderCategoryId | null>(null)

  return (
    <div style={{
      background: '#0a0a0a',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <HomeScreenTopBar
        userEmail={userEmail}
        onSignOut={onSignOut}
        onEditRoutine={onEditRoutine}
        onProgramChanged={onProgramChanged}
      />
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '32px 40px 48px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6b6b6f',
            margin: '0 0 24px',
          }}>
            Train today
          </p>
          <CategoryPicker
            selectedId={builderCategory}
            onSelect={(id) => {
              setBuilderCategory(id)
              requestAnimationFrame(() => {
                document.getElementById('workout-builder-panel')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              })
            }}
          />
          <WorkoutBuilderFlow
            open={builderCategory !== null}
            categoryId={builderCategory}
            onClose={() => setBuilderCategory(null)}
            onStart={(category, exercises) => {
              setBuilderCategory(null)
              onStartBuilderWorkout(category, exercises)
            }}
          />
        </div>
      </div>
    </div>
  )
}

function HomeScreenTopBar({
  userEmail,
  onSignOut,
  onEditRoutine,
  onProgramChanged,
}: Pick<HomeScreenProps, 'userEmail' | 'onSignOut' | 'onEditRoutine' | 'onProgramChanged'>) {
  const [clockNow, setClockNow] = useState(new Date())
  const [colonOn, setColonOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setClockNow(new Date())
      setColonOn((v) => !v)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const h12 = clockNow.getHours() % 12 || 12
  const mins = clockNow.getMinutes()
  const ampm = clockNow.getHours() < 12 ? 'AM' : 'PM'
  const [h0, h1, m0, m1] = [
    String(Math.floor(h12 / 10)),
    String(h12 % 10),
    String(Math.floor(mins / 10)),
    String(mins % 10),
  ]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      height: 104,
      borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      background: '#000',
      flexShrink: 0,
      gap: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <img
          src="/bd-gym-logo.png"
          alt="BusyDad Gym"
          style={{ display: 'block', flexShrink: 0, height: 96, width: 'auto' }}
        />
      </div>
      <div style={{ width: '0.5px', height: 44, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <LedDigit char={h0} />
          <LedDigit char={h1} />
          <LedColon lit={colonOn} />
          <LedDigit char={m0} />
          <LedDigit char={m1} />
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'rgba(220,20,20,0.45)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            alignSelf: 'flex-end',
            paddingBottom: 6,
            marginLeft: 4,
          }}>
            {ampm}
          </div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <UserMenu
          email={userEmail}
          onSignOut={onSignOut}
          onEditRoutine={onEditRoutine}
          onProgramChanged={onProgramChanged}
        />
      </div>
    </div>
  )
}
