import type { WorkoutSession } from '../types/workout'

const STORAGE_KEY = 'workout-deck-sessions'

interface WorkoutLogStorage {
  sessions: WorkoutSession[]
}

function readStorage(): WorkoutLogStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { sessions: [] }
    const parsed = JSON.parse(raw) as WorkoutLogStorage
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] }
  } catch {
    return { sessions: [] }
  }
}

function writeStorage(data: WorkoutLogStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadSessions(): WorkoutSession[] {
  return readStorage().sessions
}

export function saveSession(session: WorkoutSession): void {
  const storage = readStorage()
  const index = storage.sessions.findIndex((item) => item.id === session.id)

  if (index >= 0) {
    storage.sessions[index] = session
  } else {
    storage.sessions.unshift(session)
  }

  writeStorage(storage)
}

export function getSessionById(sessionId: string): WorkoutSession | undefined {
  return readStorage().sessions.find((session) => session.id === sessionId)
}
