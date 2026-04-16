# Casework Assistant — Claude Code Project Memory

## Project Overview
AI-assisted casework tool for government-style case management. Three agent types 
(Summariser, Case Interpreter, Action Drafter) sit above a deterministic core.
Judges human-in-the-loop: no action sends without explicit caseworker approval.

## Stack
- Backend: FastAPI (Python), existing venv at ./venv
- Frontend: Vanilla HTML/JS/CSS served by FastAPI StaticFiles (no Node.js)
- Styling: Custom CSS with Tailwind-like classes, GOV.UK colour palette and typography
- Data: read-only JSON files in ./data/ (cases.json, policy-extracts.json, workflow-states.json)
- Mocks: LLM responses in ./mocks/ keyed by case_id — these are NOT real API calls

## Python Environment
IMPORTANT: Always use ./venv — never install globally.
Run backend with: `./venv/bin/uvicorn backend.main:app --reload`
Install packages with: `./venv/bin/pip install <package>`
Run tests with: `./venv/bin/python -m pytest tests/ -v`

## Key Architecture Rules
- The deterministic core (joiner, flag_calculator, action_classifier) must have NO LLM calls
- Agents are thin wrappers: read from mocks/*.json, return typed responses
- No agent depends on another agent's output — they all read the same CaseBrief
- Action classification: A=auto, B=draft-for-approval, C=record-only, D=future
- Human approval is required before any state change. Never auto-send.
- In-memory state for approvals/rejections — original JSON files are never modified

## Data Files (read-only)
- data/cases.json — 10 case records
- data/policy-extracts.json — 10 policy rules keyed by case_type
- data/workflow-states.json — states, required actions, thresholds per case_type/state

## Mock Files (fake LLM responses)
- mocks/summaries.json — { "CASE-2026-00042": "..." }
- mocks/observations.json — { "CASE-2026-00042": [...] }  
- mocks/drafts.json — { "CASE-2026-00042": { "reminder": {...}, "escalation": {...} } }

## API Endpoints
- GET /api/cases — queue list (deterministic only, fast)
- GET /api/cases/:id — full CaseBrief (deterministic, instant)
- GET /api/cases/:id/agents/summary — AI summary (800ms delay)
- GET /api/cases/:id/agents/observations — AI observations (1400ms delay)
- GET /api/cases/:id/agents/drafts — AI drafts (2200ms delay)
- POST /api/cases/:id/actions/:type/approve — approve draft, trigger state transition
- POST /api/cases/:id/actions/:type/reject — reject draft
- POST /api/cases/:id/actions/:type/edit — save edited draft

## Frontend Pages
- / (index.html) — Queue page with filters and search
- /case?id=CASE-2026-00042 (case.html) — Case detail with AI panels

## Coding Conventions
- Python: use Pydantic models for all data schemas, type-hint everything
- Async: agents use asyncio.sleep() to simulate LLM latency (800ms / 1400ms / 2200ms)
- Errors: never silently swallow — log and surface to frontend
- Tests go in tests/ and cover deterministic core only (joins, flags, classification)

## What NOT to do
- Do not call a real LLM API — all agent calls are mocked
- Do not modify files in data/ 
- Do not auto-approve or auto-send any draft
- Do not add business logic inside agent files — that belongs in core/
