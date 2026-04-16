/**
 * state.ts — In-memory state for caseworker actions.
 *
 * All state is lost on server restart. It is never persisted to disk and
 * the original data files in src/data/ are never modified.
 */

import type { TimelineEvent } from '../src/types.js'

export type ActionOutcome = 'approved' | 'rejected' | 'edited'

// case_id → action_type → outcome
const actionStates = new Map<string, Map<string, ActionOutcome>>()

// case_id → additional timeline entries injected by approvals/rejections
const timelineAdditions = new Map<string, TimelineEvent[]>()

// case_id → overridden status (set when an approval triggers a state transition)
const statusOverrides = new Map<string, string>()

// ─── Action state ─────────────────────────────────────────────────────────────

export function getActionState(caseId: string, actionType: string): ActionOutcome | null {
  return actionStates.get(caseId)?.get(actionType) ?? null
}

export function setActionState(caseId: string, actionType: string, state: ActionOutcome): void {
  if (!actionStates.has(caseId)) actionStates.set(caseId, new Map())
  actionStates.get(caseId)!.set(actionType, state)
}

// ─── Timeline additions ───────────────────────────────────────────────────────

export function getTimelineAdditions(caseId: string): TimelineEvent[] {
  return timelineAdditions.get(caseId) ?? []
}

export function addTimelineEntry(caseId: string, entry: TimelineEvent): void {
  if (!timelineAdditions.has(caseId)) timelineAdditions.set(caseId, [])
  timelineAdditions.get(caseId)!.push(entry)
}

// ─── Status overrides ─────────────────────────────────────────────────────────

export function getStatusOverride(caseId: string): string | null {
  return statusOverrides.get(caseId) ?? null
}

export function setStatusOverride(caseId: string, newStatus: string): void {
  statusOverrides.set(caseId, newStatus)
}

// ─── Apply overlays to a case ─────────────────────────────────────────────────

/**
 * Returns a shallow copy of the case with any in-memory overrides applied.
 * Use this before passing a case to Claude so the analysis reflects the
 * current working state rather than the original JSON.
 */
export function applyOverlays<T extends { case_id: string; status: string; timeline: TimelineEvent[] }>(
  c: T,
): T {
  const statusOverride = getStatusOverride(c.case_id)
  const extraEntries = getTimelineAdditions(c.case_id)

  if (!statusOverride && extraEntries.length === 0) return c

  return {
    ...c,
    status: statusOverride ?? c.status,
    timeline: [...c.timeline, ...extraEntries],
  }
}