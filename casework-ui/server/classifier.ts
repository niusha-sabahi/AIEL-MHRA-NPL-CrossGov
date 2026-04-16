/**
 * classifier.ts — Categorises workflow required_actions for a given case.
 *
 * Categories:
 *   A — Auto: can be logged / completed without caseworker input
 *   B — Draft for approval: produces a draft that requires caseworker sign-off
 *   C — Record only: a logging or archiving step, no output required
 *   D — Future / not yet applicable: conditions not yet met
 */

import type { Case, WorkflowState, ClassifiedAction } from '../src/types.js'

const TODAY_DATE = new Date('2026-04-16')

function daysSince(dateStr: string): number {
  return Math.floor((TODAY_DATE.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Category B keyword → actionType mappings ────────────────────────────────
// Checked in order — longer/more-specific phrases listed before shorter ones
// to prevent a shorter phrase from matching first.

const B_MAPPINGS: Array<{ keywords: string[]; actionType: string }> = [
  { keywords: ['draft decision with reasons'],          actionType: 'decision_letter' },
  { keywords: ['draft decision letter'],                actionType: 'decision_letter' },
  { keywords: ['include mandatory reconsideration'],    actionType: 'reconsideration_notice' },
  { keywords: ['draft outcome letter'],                 actionType: 'outcome_letter' },
  { keywords: ['issue outcome letter'],                 actionType: 'outcome_letter' },
  { keywords: ['send evidence request'],                actionType: 'evidence_request' },
  { keywords: ['issue reminder'],                       actionType: 'reminder' },
  { keywords: ['brief team leader'],                    actionType: 'escalation_briefing' },
  { keywords: ['brief senior officer'],                 actionType: 'briefing_note' },
  { keywords: ['notify applicant in writing'],          actionType: 'outcome_notification' },
  { keywords: ['acknowledge receipt'],                  actionType: 'acknowledgement' },
]

// ─── Category C keywords ──────────────────────────────────────────────────────

const C_KEYWORDS = [
  'log date',
  'log escalation',
  'archive',
  'update case record',
  'schedule follow-up',
]

// ─── Classifier ───────────────────────────────────────────────────────────────

export function classifyActions(
  requiredActions: string[],
  caseData: Case,
  _workflowState: WorkflowState,
): ClassifiedAction[] {
  const evidenceEvent = caseData.timeline.find(e => e.event === 'evidence_requested')
  const daysSinceEvidence = evidenceEvent ? daysSince(evidenceEvent.date) : null

  return requiredActions.map((text): ClassifiedAction => {
    const lower = text.toLowerCase()

    // ── Conditional D checks (evaluated before B so they can override) ────────

    // Reminder threshold: D if the 28-day threshold hasn't been reached yet.
    // Only applies when the action text itself references "28 days" — the
    // licence-flow "issue reminder after 14 days" must not be caught here.
    if (lower.includes('issue reminder') && lower.includes('28 days')) {
      if (daysSinceEvidence === null || daysSinceEvidence < 28) {
        return { text, category: 'D', actionType: 'reminder', applicable: false }
      }
    }

    // Escalation threshold: D if the 56-day threshold hasn't been reached yet.
    // Only fires when the action text references "56 days" so that
    // "escalate to senior officer within 2 working days" stays as A.
    if (lower.includes('escalate') && lower.includes('56 days')) {
      if (daysSinceEvidence === null || daysSinceEvidence < 56) {
        return { text, category: 'D', actionType: null, applicable: false }
      }
    }

    // Reconsideration notice: D unless the case notes indicate benefit is
    // being reduced or ceased (the trigger condition).
    if (lower.includes('reconsideration')) {
      const notes = caseData.case_notes.toLowerCase()
      if (!notes.includes('reduc') && !notes.includes('ceas')) {
        return { text, category: 'D', actionType: 'reconsideration_notice', applicable: false }
      }
    }

    // ── Category B ────────────────────────────────────────────────────────────
    for (const { keywords, actionType } of B_MAPPINGS) {
      if (keywords.some(kw => lower.includes(kw))) {
        return { text, category: 'B', actionType, applicable: true }
      }
    }

    // ── Category C ────────────────────────────────────────────────────────────
    for (const kw of C_KEYWORDS) {
      if (lower.includes(kw)) {
        return { text, category: 'C', actionType: null, applicable: true }
      }
    }

    // ── Default: Category A ───────────────────────────────────────────────────
    return { text, category: 'A', actionType: null, applicable: true }
  })
}