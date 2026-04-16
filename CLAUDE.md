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

**AI server** (`server/`) — Express at port 8000. `server/index.ts` handles the single `POST /analyse` route: it receives `{case, policies, workflow}`, derives matched policies and deadline context, then calls Claude via the Anthropic SDK. `server/prompt.ts` is intentionally isolated — it's the only file to edit when iterating on analysis quality. The server/frontend interface is the `AnalysisResult` type in `src/types.ts`.

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

All shared types are in `src/types.ts`. The three case types are `benefit_review`, `licence_application`, `compliance_check`. The six workflow statuses map directly to states in `workflow-states.json`. `AnalysisResult._isMock` is a frontend-only flag set by the fallback — it is never returned by the real server.

## Deadline logic

Cases in `awaiting_evidence` status are checked against their `evidence_requested` timeline event. Thresholds: 28 days → amber warning, 56 days → red escalation. This logic appears in both `CaseList.tsx` (list flags) and `CaseDetail.tsx` (header banners), and also in `server/index.ts` (passed to Claude as context). `TODAY` is hardcoded to `2026-04-16` in all three places.