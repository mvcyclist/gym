import { getSupabase } from '../lib/supabase'
import { isDraftableSessionStatus } from '../types/draft'
import type { ActivityEntry } from '../types/training'
import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'

interface WorkoutSessionRow {
  id: string
  user_id: string
  workout_type: string
  status: string
  started_at: string
  updated_at: string
  completed_at: string | null
  exercises: WorkoutSession['exercises']
}

interface ManualActivityRow {
  id: string
  user_id: string
  activity_date: string
  activity_type: string
  intensity: string | null
  duration_minutes: number | null
  notes: string | null
}

function sessionToRow(session: WorkoutSession, userId: string): WorkoutSessionRow {
  return {
    id: session.id,
    user_id: userId,
    workout_type: session.workoutType,
    status: session.status,
    started_at: session.startedAt,
    updated_at: session.updatedAt,
    completed_at: session.completedAt,
    exercises: session.exercises,
  }
}

function rowToSession(row: WorkoutSessionRow): WorkoutSession {
  return {
    id: row.id,
    workoutType: row.workout_type as WorkoutSession['workoutType'],
    status: row.status as WorkoutSession['status'],
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    exercises: row.exercises,
  }
}

function manualToRow(entry: ActivityEntry, userId: string, date: string): ManualActivityRow {
  return {
    id: entry.id,
    user_id: userId,
    activity_date: date,
    activity_type: entry.type,
    intensity: entry.intensity ?? null,
    duration_minutes: entry.durationMinutes ?? null,
    notes: entry.notes ?? null,
  }
}

function rowToManual(entry: ManualActivityRow): ActivityEntry {
  return {
    id: entry.id,
    date: entry.activity_date,
    type: entry.activity_type as ActivityEntry['type'],
    intensity: (entry.intensity as ActivityEntry['intensity']) ?? undefined,
    durationMinutes: entry.duration_minutes ?? undefined,
    notes: entry.notes ?? undefined,
    source: 'manual',
  }
}

export async function fetchLedgerFromCloud(userId: string): Promise<TrainingLedger> {
  const supabase = getSupabase()

  const [sessionsResult, manualResult] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['completed', 'partial'])
      .order('updated_at', { ascending: false }),
    supabase.from('manual_activities').select('*').eq('user_id', userId),
  ])

  if (sessionsResult.error) throw sessionsResult.error
  if (manualResult.error) throw manualResult.error

  const sessions = (sessionsResult.data as WorkoutSessionRow[]).map(rowToSession)
  const manualByDate: Record<string, ActivityEntry[]> = {}

  for (const row of manualResult.data as ManualActivityRow[]) {
    const entry = rowToManual(row)
    if (!manualByDate[row.activity_date]) manualByDate[row.activity_date] = []
    manualByDate[row.activity_date].push(entry)
  }

  return { version: 4, sessions, manualByDate }
}

export async function isCloudLedgerEmpty(userId: string): Promise<boolean> {
  const supabase = getSupabase()

  const [sessionsResult, manualResult] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('manual_activities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  if (sessionsResult.error) throw sessionsResult.error
  if (manualResult.error) throw manualResult.error

  return (sessionsResult.count ?? 0) === 0 && (manualResult.count ?? 0) === 0
}

export async function upsertSessionToCloud(session: WorkoutSession, userId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('workout_sessions')
    .upsert(sessionToRow(session, userId), { onConflict: 'id' })
  if (error) throw error
}

export async function deleteSessionFromCloud(sessionId: string, userId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw error
}

/** Remove legacy in-progress rows that should never live in cloud history. */
export async function purgeInProgressSessionsFromCloud(userId: string): Promise<string[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])

  if (error) throw error

  const rows = data ?? []
  const removedIds: string[] = []

  for (const row of rows) {
    if (!isDraftableSessionStatus(row.status as WorkoutSession['status'])) continue
    await deleteSessionFromCloud(row.id, userId)
    removedIds.push(row.id)
  }

  return removedIds
}

export async function replaceManualDayOnCloud(
  userId: string,
  date: string,
  activities: ActivityEntry[],
): Promise<void> {
  const supabase = getSupabase()

  const { error: deleteError } = await supabase
    .from('manual_activities')
    .delete()
    .eq('user_id', userId)
    .eq('activity_date', date)

  if (deleteError) throw deleteError

  if (activities.length === 0) return

  const rows = activities.map((entry) => manualToRow(entry, userId, date))
  const { error: insertError } = await supabase.from('manual_activities').insert(rows)
  if (insertError) throw insertError
}

export async function importLedgerToCloud(userId: string, ledger: TrainingLedger): Promise<void> {
  const supabase = getSupabase()

  if (ledger.sessions.length > 0) {
    const rows = ledger.sessions.map((session) => sessionToRow(session, userId))
    const { error } = await supabase
      .from('workout_sessions')
      .upsert(rows, { onConflict: 'id' })
    if (error) throw error
  }

  const manualRows = Object.entries(ledger.manualByDate).flatMap(([date, entries]) =>
    entries.map((entry) => manualToRow(entry, userId, date)),
  )

  if (manualRows.length > 0) {
    const { error } = await supabase
      .from('manual_activities')
      .upsert(manualRows, { onConflict: 'id' })
    if (error) throw error
  }
}

export async function clearCloudLedgerForUser(userId: string): Promise<void> {
  const supabase = getSupabase()

  const [sessionsError, manualError] = await Promise.all([
    supabase.from('workout_sessions').delete().eq('user_id', userId).then((r) => r.error),
    supabase.from('manual_activities').delete().eq('user_id', userId).then((r) => r.error),
  ])

  if (sessionsError) throw sessionsError
  if (manualError) throw manualError
}

export async function replaceCloudLedgerWithLocal(
  userId: string,
  ledger: TrainingLedger,
): Promise<void> {
  await clearCloudLedgerForUser(userId)
  await importLedgerToCloud(userId, ledger)
}
