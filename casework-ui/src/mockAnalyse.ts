/**
 * analyseCase — sends a case to the AI analysis server at localhost:8000.
 *
 * The server calls Claude (claude-opus-4-6) with the full case + policy +
 * workflow context and returns a structured AnalysisResult.
 *
 * If the server is not running, falls back to a static mock response so the
 * UI remains usable during frontend-only development.
 */

import type { Case, AnalysisResult } from './types'
import policiesData from './data/policy-extracts.json'
import workflowData from './data/workflow-states.json'

const ANALYSE_URL = 'http://localhost:8000/analyse'

export async function analyseCase(c: Case): Promise<AnalysisResult> {
  try {
    const response = await fetch(ANALYSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case: c,
        policies: policiesData,
        workflow: workflowData,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(err.error ?? response.statusText)
    }

    return response.json() as Promise<AnalysisResult>
  } catch (err) {
    // Server not running — return a clearly-labelled mock so the UI doesn't break
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.warn('[analyseCase] Server not reachable — using mock response.')
      return buildFallbackMock(c)
    }
    throw err
  }
}

// ─── Fallback mock (used when server is offline) ──────────────────────────────

function buildFallbackMock(c: Case): AnalysisResult {
  return {
    matched_policy_id: 'N/A',
    matched_policy_title: 'Server offline — mock response',
    summary: `This is a placeholder analysis for ${c.case_id}. Start the AI server with "npm run server" to get a real Claude-generated analysis.`,
    recommendation: 'Start the analysis server (npm run server) and click Analyse Case again.',
    assignment_recommendation: `Currently assigned to ${c.assigned_to.replace(/_/g, ' ')}.`,
    priority: 'low',
    flags: ['⚠ Analysis server not running — responses are mocked'],
  }
}