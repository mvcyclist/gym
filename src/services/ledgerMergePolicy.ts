/**
 * Cloud merge policy — documented rules for local ↔ Supabase hydration.
 *
 * Used by ledgerRepository.refreshMergedLedgerFromCloud and import flows.
 * Implementation: utils/ledgerStats.mergeLedgers.
 */

/** Sessions: union by id; newer updatedAt wins. Only completed + partial in cloud fetch. */
export const SESSION_MERGE_RULE =
  'Union sessions by id; keep the row with the latest updatedAt (ISO string compare).'

/** Manual activities: union by entry id per calendar date; local entries overlay cloud. */
export const MANUAL_MERGE_RULE =
  'Per date, merge manual activities by entry id; local entries overwrite cloud on id collision.'

/** In-progress workouts never enter history or cloud — they live in draft storage only. */
export const DRAFT_ISOLATION_RULE =
  'Active/paused sessions are stored in draft only; ledger v4+ filters them on load.'

/** While a draft exists, inbound cloud merge is skipped to avoid overwriting in-progress work. */
export const WORKOUT_LOCK_RULE =
  'refreshMergedLedgerFromCloud skips merge when hasDraft() unless force:true.'

/** Outbound writes are local-first; failed cloud ops retry via syncQueueService. */
export const OUTBOUND_SYNC_RULE =
  'All history writes persist locally first, then enqueue background cloud sync with retry.'

/** Coaching reads reflect the merged local cache on this device until Phase 6 cloud reads. */
export const COACHING_FRESHNESS_RULE =
  'Progression and recommendations read the device ledger after last successful hydrate or local write.'

export const LEDGER_MERGE_POLICY = {
  sessionMerge: SESSION_MERGE_RULE,
  manualMerge: MANUAL_MERGE_RULE,
  draftIsolation: DRAFT_ISOLATION_RULE,
  workoutLock: WORKOUT_LOCK_RULE,
  outboundSync: OUTBOUND_SYNC_RULE,
  coachingFreshness: COACHING_FRESHNESS_RULE,
} as const
