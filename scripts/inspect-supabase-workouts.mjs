#!/usr/bin/env node
/**
 * Inspect push / pull / leg workout history in Supabase.
 *
 * Usage:
 *   npm run inspect:workouts
 *   npm run inspect:workouts -- --email you@example.com --password 'your-password'
 *   npm run inspect:workouts -- --json
 *   npm run inspect:workouts -- --access-token '<jwt from browser>'
 *   npm run inspect:workouts -- --local-file ./ledger-export.json
 *
 * Google sign-in (no password): while logged in at localhost, DevTools → Console:
 *   copy(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('-auth-token')))).access_token)
 * Then: npm run inspect:workouts -- --access-token '<paste>'
 *
 * Local ledger export (compare without cloud): DevTools → Application → Local Storage
 *   Key: workout-deck-ledger:<your-user-uuid> — copy value to a .json file
 *   npm run inspect:workouts -- --local-file ./my-ledger.json
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Optional admin bypass (skips sign-in; needs user id):
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GYM_USER_ID   (uuid from Supabase auth.users)
 *
 * Optional sign-in without CLI flags:
 *   GYM_USER_EMAIL
 *   GYM_USER_PASSWORD
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const STRENGTH_TYPES = ['push', 'pull', 'leg']

function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const path = join(process.cwd(), name)
    if (!existsSync(path)) continue
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}

function parseArgs(argv) {
  const args = {
    email: process.env.GYM_USER_EMAIL ?? '',
    password: process.env.GYM_USER_PASSWORD ?? '',
    userId: process.env.GYM_USER_ID ?? '',
    accessToken: process.env.GYM_ACCESS_TOKEN ?? '',
    localFile: '',
    json: false,
    all: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') args.json = true
    else if (arg === '--all') args.all = true
    else if (arg === '--email') args.email = argv[++i] ?? ''
    else if (arg === '--password') args.password = argv[++i] ?? ''
    else if (arg === '--user-id') args.userId = argv[++i] ?? ''
    else if (arg === '--access-token') args.accessToken = argv[++i] ?? ''
    else if (arg === '--access-token-file') {
      const tokenPath = argv[++i] ?? ''
      args.accessToken = readFileSync(tokenPath, 'utf8').trim()
    }
    else if (arg === '--local-file') args.localFile = argv[++i] ?? ''
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npm run inspect:workouts -- [options]

Options:
  --email <email>          Sign in with email (or GYM_USER_EMAIL)
  --password <password>    Sign in with password (or GYM_USER_PASSWORD)
  --access-token <jwt>     Use browser session token (Google OAuth users)
  --access-token-file <p>  Read token from file (avoids shell quoting issues)
  --user-id <uuid>         With SUPABASE_SERVICE_ROLE_KEY, query this user
  --local-file <path>      Inspect exported local ledger JSON (no Supabase)
  --all                    Show last 5 sessions per type (default: latest completed only)
  --json                   Machine-readable output
  --help                   Show this help
`)
      process.exit(0)
    }
  }

  return args
}

function normalizeSupabaseUrl(url) {
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
}

function toLocalDateKey(iso) {
  if (!iso) return '(missing)'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '(invalid)'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWhen(iso) {
  if (!iso) return '(missing)'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '(invalid)'
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSet(set) {
  const w = set.weight?.trim() ? set.weight : '(no weight)'
  const r = set.reps?.trim() ? set.reps : '(no reps)'
  const flag = set.completed ? '' : ' [NOT COMPLETED]'
  return `set ${set.setNumber}: ${w} × ${r}${flag}`
}

function auditExercise(log) {
  const issues = []
  if (!log.catalogExerciseId) {
    issues.push(`missing catalogExerciseId on slot ${log.exerciseId}`)
  }
  const completed = (log.sets ?? []).filter((s) => s.completed)
  const incomplete = (log.sets ?? []).filter((s) => !s.completed)
  for (const set of completed) {
    if (!set.weight?.trim()) issues.push(`${log.exerciseName}: completed set ${set.setNumber} has no weight`)
    if (!set.reps?.trim()) issues.push(`${log.exerciseName}: completed set ${set.setNumber} has no reps`)
  }
  if (completed.length === 0 && (log.sets ?? []).length > 0) {
    issues.push(`${log.exerciseName}: no completed sets`)
  }
  if (incomplete.length > 0) {
    issues.push(`${log.exerciseName}: ${incomplete.length} incomplete set(s)`)
  }
  return issues
}

function sessionSortTime(session) {
  return session.completed_at ?? session.updated_at ?? session.started_at ?? ''
}

function mapRow(row) {
  return {
    id: row.id,
    workoutType: row.workout_type,
    status: row.status,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    exercises: row.exercises ?? [],
  }
}

function summarizeSession(session) {
  const calendarDay = toLocalDateKey(session.startedAt)
  const completedDay = toLocalDateKey(session.completedAt)
  const issues = []

  const exercises = (session.exercises ?? [])
    .filter((log) => !log.skipped)
    .map((log) => {
      const completedSets = (log.sets ?? []).filter((s) => s.completed)
      issues.push(...auditExercise(log))
      return {
        slotId: log.exerciseId,
        catalogExerciseId: log.catalogExerciseId ?? null,
        name: log.exerciseName,
        completedSetCount: completedSets.length,
        totalSetCount: (log.sets ?? []).length,
        sets: completedSets.map((set) => ({
          setNumber: set.setNumber,
          weight: set.weight ?? '',
          reps: set.reps ?? '',
        })),
        lines: completedSets.map((set) => formatSet(set)),
      }
    })

  return {
    id: session.id,
    workoutType: session.workoutType,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    updatedAt: session.updatedAt,
    calendarDay,
    completedDay,
    startedLabel: formatWhen(session.startedAt),
    completedLabel: formatWhen(session.completedAt),
    exercises,
    issues,
  }
}

function printSessionSummary(summary) {
  console.log('')
  console.log(`=== ${summary.workoutType.toUpperCase()} · ${summary.status} ===`)
  console.log(`Session id:     ${summary.id}`)
  console.log(`Started:        ${summary.startedLabel}  (calendar: ${summary.calendarDay})`)
  console.log(`Completed:      ${summary.completedLabel}  (calendar: ${summary.completedDay})`)
  console.log(`Updated:        ${formatWhen(summary.updatedAt)}`)
  console.log('')

  if (summary.exercises.length === 0) {
    console.log('  (no exercises in JSON)')
  }

  for (const exercise of summary.exercises) {
    console.log(`  • ${exercise.name}`)
    console.log(`    slot: ${exercise.slotId}  catalog: ${exercise.catalogExerciseId ?? 'MISSING'}`)
    console.log(`    completed sets: ${exercise.completedSetCount}/${exercise.totalSetCount}`)
    for (const line of exercise.lines) {
      console.log(`      ${line}`)
    }
    if (exercise.lines.length === 0) console.log('      (no completed sets)')
  }

  if (summary.issues.length > 0) {
    console.log('')
    console.log('  ⚠ Data issues:')
    for (const issue of summary.issues) {
      console.log(`    - ${issue}`)
    }
  }
}

function mapLocalSession(session) {
  return {
    id: session.id,
    workoutType: session.workoutType,
    status: session.status,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt,
    exercises: session.exercises ?? [],
  }
}

function loadLocalLedgerSessions(localFile) {
  const raw = readFileSync(localFile, 'utf8')
  const parsed = JSON.parse(raw)
  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : parsed
  if (!Array.isArray(sessions)) {
    throw new Error('Local file must be a ledger object with .sessions or a sessions array')
  }
  return sessions
    .map(mapLocalSession)
    .filter((session) => STRENGTH_TYPES.includes(session.workoutType))
    .filter((session) => session.status === 'completed' || session.status === 'partial')
    .sort((a, b) => sessionSortTime(b).localeCompare(sessionSortTime(a)))
}

function decodeJwtPayload(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format (expected 3 parts)')
  const payloadJson = Buffer.from(
    parts[1].replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf8')
  return JSON.parse(payloadJson)
}

function clientWithAccessToken(url, anonKey, accessToken) {
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function createAuthenticatedClient(args) {
  const url = normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL ?? '')
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''

  if (!url || !url.includes('.supabase.co')) {
    throw new Error('Set VITE_SUPABASE_URL in .env or .env.local')
  }

  if (serviceRoleKey && args.userId) {
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return { client: admin, userId: args.userId, mode: 'service_role' }
  }

  if (!anonKey) {
    throw new Error('Set VITE_SUPABASE_ANON_KEY in .env or .env.local')
  }

  if (args.accessToken) {
    const payload = decodeJwtPayload(args.accessToken)
    const userId = payload.sub
    const email = payload.email ?? null
    const exp = payload.exp

    if (!userId) throw new Error('Access token missing sub (user id) claim')
    if (exp && Date.now() / 1000 > exp) {
      throw new Error('Access token expired — grab a fresh one from the browser console')
    }

    const client = clientWithAccessToken(url, anonKey, args.accessToken)
    return { client, userId, mode: 'access_token', email }
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (!args.email || !args.password) {
    throw new Error(
      'Sign-in required. Use --access-token (Google OAuth), --email/--password, SUPABASE_SERVICE_ROLE_KEY + --user-id, or --local-file',
    )
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: args.email,
    password: args.password,
  })

  if (error) throw new Error(`Sign-in failed: ${error.message}`)
  if (!data.user?.id) throw new Error('Sign-in succeeded but no user id returned')

  return { client, userId: data.user.id, mode: 'password', email: data.user.email }
}

async function fetchSessions(client, userId) {
  const { data, error } = await client
    .from('workout_sessions')
    .select('id, workout_type, status, started_at, updated_at, completed_at, exercises')
    .eq('user_id', userId)
    .in('workout_type', STRENGTH_TYPES)
    .in('status', ['completed', 'partial'])
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Supabase query failed: ${error.message}`)
  return (data ?? []).map(mapRow).sort((a, b) => sessionSortTime(b).localeCompare(sessionSortTime(a)))
}

function pickLatestByType(sessions, includeAll) {
  const byType = new Map()

  for (const type of STRENGTH_TYPES) {
    const typed = sessions.filter((s) => s.workoutType === type)
    if (includeAll) {
      byType.set(type, typed.slice(0, 5))
    } else {
      const completed = typed.find((s) => s.status === 'completed')
      byType.set(type, completed ? [completed] : typed.slice(0, 1))
    }
  }

  return byType
}

async function main() {
  loadEnvFiles()
  const args = parseArgs(process.argv.slice(2))

  let sessions
  let authLabel

  if (args.localFile) {
    sessions = loadLocalLedgerSessions(args.localFile)
    authLabel = { mode: 'local_file', path: args.localFile }
  } else {
    const auth = await createAuthenticatedClient(args)
    sessions = await fetchSessions(auth.client, auth.userId)
    authLabel = { mode: auth.mode, userId: auth.userId, email: auth.email ?? null }
  }

  const byType = pickLatestByType(sessions, args.all)

  if (args.json) {
    const payload = {
      source: authLabel,
      sessionCount: sessions.length,
      latestByType: Object.fromEntries(
        [...byType.entries()].map(([type, list]) => [type, list.map(summarizeSession)]),
      ),
    }
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  console.log('Workout history inspector')
  if (authLabel.mode === 'local_file') {
    console.log(`Source: local ledger file (${authLabel.path})`)
  } else {
    console.log(`Source: Supabase (${authLabel.mode}${authLabel.email ? ` · ${authLabel.email}` : ''})`)
    console.log(`User id: ${authLabel.userId}`)
  }
  console.log(`Total push/pull/leg sessions: ${sessions.length}`)

  let issueCount = 0

  for (const type of STRENGTH_TYPES) {
    const list = byType.get(type) ?? []
    if (list.length === 0) {
      console.log('')
      console.log(`=== ${type.toUpperCase()} ===`)
      console.log('  No completed/partial sessions found in Supabase.')
      continue
    }

    for (const session of list) {
      const summary = summarizeSession(session)
      printSessionSummary(summary)
      issueCount += summary.issues.length
    }
  }

  console.log('')
  if (issueCount > 0) {
    console.log(`Found ${issueCount} data issue(s) in the displayed session(s).`)
    console.log('If slot/catalog or sets look wrong here, the cloud copy is corrupted — not just the UI.')
  } else {
    console.log('No obvious data issues in the displayed session(s).')
  }
  console.log('')
  console.log('Tip: export local ledger from DevTools → Application → Local Storage → workout-deck-ledger:<uuid>')
  console.log('Compare cloud vs local with --local-file and Supabase modes side by side.')
  console.log('Re-run with --json for raw structured output, --all for last 5 per type.')
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})
