# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `casework-ui/`:

```bash
npm run dev        # Start Vite frontend — http://localhost:5173
npm run server     # Start AI analysis server — http://localhost:8000
npm run build      # Type-check + Vite production build
```

The frontend and server run independently. The frontend falls back to a mock response when the server is unreachable.

## Architecture

Two processes, one codebase:

**Frontend** (`src/`) — Vite + React 18 + TypeScript + Tailwind CSS. All data is loaded at startup from static JSON files in `src/data/` and passed down as props. No client-side routing, no state management library. `App.tsx` is the root — it holds `selectedCase` state and renders `CaseList` (left panel) + `CaseDetail` (right panel) side by side.

**AI server** (`server/`) — Express at port 8000. Routes:
- `POST /analyse` — receives `{case, policies, workflow}`, derives matched policies and deadline context, calls Claude, appends classified actions, returns `AnalysisResult`
- `POST /chat` — general analysis chat; client sends full case + conversation history, returns `{type, content|analysis}`
- `POST /cases/:caseId/actions/:actionType/approve` — records approval in memory, adds timeline entry, optionally transitions status
- `POST /cases/:caseId/actions/:actionType/reject` — records rejection in memory, adds timeline entry
- `POST /cases/:caseId/actions/:actionType/chat` — draft-refinement chat; **loads case data server-side** from JSON, applies overlays, calls Claude, returns `{reply: string}`

`server/prompt.ts` is intentionally isolated — it's the only file to edit when iterating on analysis quality. The server/frontend interface is the `AnalysisResult` type in `src/types.ts`.

**Data flow for AI analysis:**
1. `CaseDetail.tsx` calls `analyseCase()` from `src/analyseCase.ts`
2. `analyseCase.ts` POSTs to `localhost:8000/analyse` with the full case, all policies, and workflow data
3. The server filters to matched policies, calculates deadline days, calls Claude, extracts JSON from the response
4. On network failure (server not running), `analyseCase.ts` returns a fallback with `_isMock: true` — the UI uses this flag to show an offline banner

## TypeScript config

Three tsconfig files:
- `tsconfig.json` — covers `src/` (frontend, Vite/bundler moduleResolution)
- `tsconfig.node.json` — covers `vite.config.ts`
- `tsconfig.server.json` — covers `server/` (node moduleResolution, esModuleInterop)

The server runs via `tsx` which transpiles without type-checking, so TS errors in server files don't block execution.

## Credentials

`casework-ui/.env` is gitignored. Copy `.env.example` to `.env`. The server accepts either:
- `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` + `ANTHROPIC_DEFAULT_OPUS_MODEL` — shared team proxy at `licenseportal.aiengineeringlab.co.uk`
- `ANTHROPIC_API_KEY` — direct Anthropic API

The `npm run server` script passes `.env` via `tsx --env-file=.env`.

## Key types

All shared types are in `src/types.ts`. The three case types are `benefit_review`, `licence_application`, `compliance_check`. The six workflow statuses map directly to states in `workflow-states.json`. `AnalysisResult._isMock` is a frontend-only flag set by the fallback — it is never returned by the real server. `ClassifiedAction` carries `{text, category (A/B/C/D), actionType, applicable}` and is appended to `AnalysisResult.classified_actions` by `server/classifier.ts` after each `/analyse` call.

## Human-in-the-loop approval

The AI Analysis tab is implemented in `src/components/AnalysisTabEditable.tsx`. The recommended action is displayed as a bordered card with four states: pending (Approve / Edit / Reject / Regenerate buttons), editing (inline textarea → Approve edited version), and terminal (approved or rejected, with timestamp). Approve/Reject POST to the server (`/cases/:id/actions/:type/approve|reject`) which persists state in memory. Edit state is local-only.

The card also contains an inline **AI chat panel** toggled by "Refine with AI". It calls `POST /cases/:id/actions/recommendation/chat` with `{currentDraft, messages}` — the server loads case data itself. Replies longer than 100 characters show a "Use this draft" button to replace the current recommendation text.

## In-memory state and action classification

`server/state.ts` holds three Maps (never persisted): action outcomes (`approved`/`rejected`/`edited`), extra timeline entries, and status overrides. `applyOverlays(case)` merges all three onto a case object before any Claude call — ensuring the AI always sees the latest caseworker actions within a server session.

`server/classifier.ts` exports `classifyActions(requiredActions, case, workflowState)` which maps each action string to a category:
- **A** — default (informational/documentation)
- **B** — requires a backend call (9 keyword→actionType mappings, e.g. "send reminder" → `send_reminder`)
- **C** — logging/admin tasks
- **D** — policy-conditional (escalation thresholds and reconsideration logic; D conditions are checked before B)

## Deadline logic

Cases in `awaiting_evidence` status are checked against their `evidence_requested` timeline event. Thresholds: 28 days → amber warning, 56 days → red escalation. This logic appears in both `CaseList.tsx` (list flags) and `CaseDetail.tsx` (header banners), and also in `server/index.ts` (passed to Claude as context). `TODAY` is hardcoded to `2026-04-16` in all three places.