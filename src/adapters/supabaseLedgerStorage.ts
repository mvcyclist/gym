import { getSupabase } from '../lib/supabase'
import { isDraftableSessionStatus } from '../types/draft'
import type { ActivityEntry, ActivityType } from '../types/training'
import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'
import { getSessionCalendarDate } from '../utils/sessionMetrics'

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

interface PlanOverrideRow {
  user_id: string
  plan_date: string
  activity_types: string[]
}

function rowsToPlanOverrides(rows: PlanOverrideRow[]): Record<string, ActivityType[]> {
  const planOverridesByDate: Record<string, ActivityType[]> = {}
  for (const row of rows) {
    planOverridesByDate[row.plan_date] = row.activity_types as ActivityType[]
  }
  return planOverridesByDate
}

export async function fetchPlanOverridesFromCloud(
  userId: string,
): Promise<Record<string, ActivityType[]>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plan_overrides')
    .select('plan_date, activity_types')
    .eq('user_id', userId)

  if (error) {
    // Table may not exist until migration 003 is applied — don't block history sync.
    console.warn('[sync] could not fetch plan overrides:', error.message)
    return {}
  }
  return rowsToPlanOverrides((data ?? []) as PlanOverrideRow[])
}

export async function replacePlanOverrideOnCloud(
  userId: string,
  date: string,
  activityTypes: ActivityType[],
): Promise<void> {
  const supabase = getSupabase()

  if (activityTypes.length === 0) {
    const { error } = await supabase
      .from('plan_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', date)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('plan_overrides').upsert(
    {
      user_id: userId,
      plan_date: date,
      activity_types: activityTypes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,plan_date' },
  )
  if (error) throw error
}

export async function fetchLedgerFromCloud(userId: string): Promise<TrainingLedger> {
  const supabase = getSupabase()

  const [sessionsResult, manualResult, planOverridesByDate] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['completed', 'partial'])
      .order('updated_at', { ascending: false }),
    supabase.from('manual_activities').select('*').eq('user_id', userId),
    fetchPlanOverridesFromCloud(userId),
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

  return { version: 4, sessions, manualByDate, planOverridesByDate }
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

async function deleteSessionsForCalendarDateOnCloud(userId: string, date: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_type, status, started_at, updated_at, completed_at, exercises')
    .eq('user_id', userId)

  if (error) throw error

  for (const row of data ?? []) {
    const session = rowToSession(row as WorkoutSessionRow)
    if (getSessionCalendarDate(session) !== date) continue
    await deleteSessionFromCloud(session.id, userId)
  }
}

export async function replaceManualDayOnCloud(
  userId: string,
  date: string,
  activities: ActivityEntry[],
): Promise<void> {
  const supabase = getSupabase()

  await deleteSessionsForCalendarDateOnCloud(userId, date)

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

  for (const [date, types] of Object.entries(ledger.planOverridesByDate ?? {})) {
    await replacePlanOverrideOnCloud(userId, date, types)
  }
}

export async function clearCloudLedgerForUser(userId: string): Promise<void> {
  const supabase = getSupabase()

  const [sessionsError, manualError, planError] = await Promise.all([
    supabase.from('workout_sessions').delete().eq('user_id', userId).then((r) => r.error),
    supabase.from('manual_activities').delete().eq('user_id', userId).then((r) => r.error),
    supabase.from('plan_overrides').delete().eq('user_id', userId).then((r) => r.error),
  ])

  if (sessionsError) throw sessionsError
  if (manualError) throw manualError
  if (planError) throw planError
}

export async function replaceCloudLedgerWithLocal(
  userId: string,
  ledger: TrainingLedger,
): Promise<void> {
  await clearCloudLedgerForUser(userId)
  await importLedgerToCloud(userId, ledger)
}
