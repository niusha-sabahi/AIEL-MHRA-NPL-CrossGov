/**
 * Casework AI Analysis Server — localhost:8000
 *
 * POST /analyse  { case, policies, workflow }  →  AnalysisResult
 *
 * Requires one of:
 *   ANTHROPIC_API_KEY   — standard Anthropic API key, or
 *   ANTHROPIC_AUTH_TOKEN — token for a shared proxy (set ANTHROPIC_BASE_URL too)
 *
 * Run with:  npm run server  (from casework-ui/)
 */

import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import type { Case, PolicyExtract, WorkflowData, WorkflowState, AnalysisResult } from '../src/types.js'
import { buildSystemPrompt, buildUserMessage } from './prompt.js'

// ─── Startup check ────────────────────────────────────────────────────────────

const apiKey = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  console.error('\n⚠  No API key found.')
  console.error('   Set one of the following before starting the server:\n')
  console.error('   export ANTHROPIC_API_KEY=sk-ant-...        (direct Anthropic)')
  console.error('   export ANTHROPIC_AUTH_TOKEN=<token>        (shared proxy)')
  console.error('   export ANTHROPIC_BASE_URL=https://...      (proxy base URL)\n')
  process.exit(1)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const anthropic = new Anthropic({
  apiKey,
  ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
})

const TODAY = '2026-04-16'
const TODAY_DATE = new Date(TODAY)

function daysSince(dateStr: string): number {
  return Math.floor((TODAY_DATE.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

// ─── POST /analyse ────────────────────────────────────────────────────────────

app.post('/analyse', async (req, res) => {
  const { case: c, policies, workflow } = req.body as {
    case: Case
    policies: PolicyExtract[]
    workflow: WorkflowData
  }

  if (!c || !policies || !workflow) {
    res.status(400).json({ error: 'Request body must include case, policies, and workflow.' })
    return
  }

  // Derive context the prompt needs
  const matchedPolicies = policies.filter(p =>
    p.applicable_case_types.includes(c.case_type),
  )

  const caseWorkflow = workflow.case_types[c.case_type]
  const currentState: WorkflowState | null =
    caseWorkflow?.states.find(s => s.state === c.status) ?? null

  const evidenceEvent = c.timeline.find(e => e.event === 'evidence_requested')
  const daysSinceEvidence = evidenceEvent ? daysSince(evidenceEvent.date) : null

  // Call Claude — stream to avoid HTTP timeouts on longer responses
  const model = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? 'claude-opus-4-6'
  const stream = anthropic.messages.stream({
    model,
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: 'adaptive' } as any,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildUserMessage(c, matchedPolicies, currentState, daysSinceEvidence, TODAY),
      },
    ],
  })

  let message
  try {
    message = await stream.finalMessage()
  } catch (err) {
    console.error('[Claude API error]', err)
    res.status(502).json({ error: 'Claude API call failed.', detail: String(err) })
    return
  }

  // Extract the text block (thinking blocks precede it when adaptive thinking fires)
  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    res.status(502).json({ error: 'No text content returned from Claude.' })
    return
  }

  // Parse the JSON Claude returned
  const jsonMatch = textBlock.text.match(/\{[\s\S]*}/)
  if (!jsonMatch) {
    console.error('[Parse error] Raw Claude output:', textBlock.text)
    res.status(502).json({ error: 'Could not parse JSON from Claude response.' })
    return
  }

  let result: AnalysisResult
  try {
    result = JSON.parse(jsonMatch[0]) as AnalysisResult
  } catch (parseErr) {
    console.error('[Parse error]', parseErr, '\nRaw:', jsonMatch[0])
    res.status(502).json({ error: 'Invalid JSON in Claude response.' })
    return
  }

  // Log token usage for visibility
  const { input_tokens, output_tokens, cache_read_input_tokens } = message.usage
  console.log(
    `[${c.case_id}] tokens in=${input_tokens} (cache_read=${cache_read_input_tokens ?? 0}) out=${output_tokens}`,
  )

  res.json(result)
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(8000, () => {
  const model = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? 'claude-opus-4-6'
  const base = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
  console.log('\n✓  Casework AI server running at http://localhost:8000')
  console.log(`   POST /analyse  →  ${model}`)
  console.log(`   Base URL: ${base}\n`)
})