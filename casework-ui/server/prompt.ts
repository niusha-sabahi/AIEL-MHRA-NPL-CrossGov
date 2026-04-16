/**
 * prompt.ts — The AI prompt for case analysis.
 *
 * This is the only file that needs changing when iterating on analysis
 * quality. The request/response interface (AnalysisResult) and the server
 * route stay stable.
 */

import type { Case, PolicyExtract, WorkflowState } from '../src/types.js'

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(): string {
  return `You are an expert casework decision-support system for UK government caseworkers.

Your job is to read a case record and surface the information a caseworker needs
to act on it right now. Be concise and direct — write as if briefing a colleague
who has two minutes before a team call.

Rules:
- Identify the single most relevant policy for the case's current situation.
- State the recommended action in plain English (no jargon, no bullet soup).
- Flag only genuine risks: missed deadlines, escalation thresholds breached,
  evidence gaps, or procedural requirements not yet met.
- Priority levels: urgent = requires action today; high = action this week;
  medium = action required but no immediate deadline; low = monitoring only.
- If the case is closed or straightforward, say so briefly — don't invent concerns.

Return your response as a single JSON object matching the required schema exactly.`
}

// ─── User message ─────────────────────────────────────────────────────────────

export function buildUserMessage(
  c: Case,
  matchedPolicies: PolicyExtract[],
  currentState: WorkflowState | null,
  daysSinceEvidenceRequested: number | null,
  today: string,
): string {
  const deadlineContext =
    daysSinceEvidenceRequested !== null
      ? `Evidence was requested ${daysSinceEvidenceRequested} days ago.`
      : ''

  return `Analyse the following case and return a JSON object.

TODAY: ${today}

── CASE RECORD ──────────────────────────────────────────────────
${JSON.stringify(c, null, 2)}

── APPLICABLE POLICIES (case type: ${c.case_type}) ──────────────
${JSON.stringify(matchedPolicies, null, 2)}

── CURRENT WORKFLOW STATE ───────────────────────────────────────
${currentState ? JSON.stringify(currentState, null, 2) : 'Not found in workflow definition.'}

${deadlineContext}

Return this JSON object (no markdown, no preamble, just valid JSON):
{
  "matched_policy_id": "<policy ID most relevant to the current situation>",
  "matched_policy_title": "<that policy's title>",
  "summary": "<2–3 sentences: what has happened, where the case stands, what is at stake>",
  "recommendation": "<one clear action the caseworker should take now, with brief justification>",
  "assignment_recommendation": "<who should own this and why>",
  "priority": "<low | medium | high | urgent>",
  "flags": ["<specific concern 1>", "<specific concern 2>"]
}`
}