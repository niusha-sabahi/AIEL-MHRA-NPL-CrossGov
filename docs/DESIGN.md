# System Design — Casework Decision Support (shahbaz-branch)

## Overview

This branch implements a UK government casework decision-support tool using a **Python FastAPI backend** and a **vanilla HTML/CSS/JavaScript frontend**. There is no build step and no frontend framework — the UI is served directly as static files by FastAPI.

All case, policy, and workflow data is loaded from static JSON files at startup. AI-generated content (summaries, observations, draft documents) is pre-written and stored in mock JSON files in `mocks/`. Only the chat endpoint makes real API calls to Claude.

---

## Service 1 — Frontend (Vanilla HTML/JS)

**Served at:** `http://localhost:8000` (served by FastAPI as static files)

The frontend is two HTML pages served by the backend. There is no bundler, no TypeScript, and no component framework.

### Pages

#### `index.html` — Case Queue

Displays a sorted, filterable list of all active cases. Implemented by `frontend/js/queue.js`.

- Calls `GET /api/cases` on load to fetch all queue items
- Renders each case as a colour-coded row: **red** (urgent), **orange** (escalated/overdue), **yellow** (pending actions), **green** (normal), **grey** (closed)
- Shows a stats bar: total cases, urgent count, escalated count, pending actions count
- Supports filter by case type, filter by status, and free-text search
- Each row links to `/case?id=<case_id>`

#### `case.html` — Case Detail

Single-case view accessed via URL query parameter (`?id=CASE-2024-001`). Implemented by `frontend/js/case.js`.

On load it fires **four parallel API calls** with progressive loading:

| Call | Endpoint | Simulated delay | What it populates |
|---|---|---|---|
| 1 | `GET /api/cases/:id` | None | Header, timeline, notes, policies, action cards |
| 2 | `GET /api/cases/:id/agents/summary` | 800ms | AI summary panel |
| 3 | `GET /api/cases/:id/agents/observations` | 1400ms | AI observations panel |
| 4 | `GET /api/cases/:id/agents/drafts` | 2200ms | Draft text inside B-category action cards |

Each panel shows a loading state until its data arrives, giving a realistic feel of AI generation.

#### Action cards

The case page renders one card per `classified_action` from the case brief:

| Category | Render | Interaction |
|---|---|---|
| **A** (Deterministic) | Compact card, green left border | "Mark done" button → `POST .../complete` |
| **B** (AI Draft) | Full card with draft title, recipient, body text, [AI] badge | Approve, Edit, Reject, Chat with AI |
| **C** (Record only) | Compact card, grey left border | "Mark done" button |
| **D** (Not yet applicable) | Greyed-out card, yellow left border | No interaction |

**B-card interaction flow:**
- **Chat with AI** — opens an inline chat panel below the draft. Sends `POST /api/chat` with the current draft text and conversation history. The caseworker can ask Claude to refine the draft in natural language
- **Edit** — makes the draft body contenteditable inline
- **Reject** — shows a confirmation popover, then calls `POST .../reject`; card is struck through
- **Approve & Send** — shows a confirmation popover, then calls `POST .../approve`; card shows a green confirmed state

---

## Service 2 — Backend (FastAPI)

**Runs at:** `http://localhost:8000`  
**Start with:** `uvicorn backend.main:app --reload` (from repo root)

### Startup

`backend/main.py` uses FastAPI's `lifespan` hook to call `loader.load_all()` before serving any requests. This loads all JSON data files into module-level variables in `backend/core/loader.py`, where they remain for the server's lifetime.

Data loaded at startup:

| Source | Variable | Content |
|---|---|---|
| `data/cases.json` | `_cases` | Case records |
| `data/policy-extracts.json` | `_policies` | Policy text |
| `data/workflow-states.json` | `_workflow_states` | Workflow state machine |
| `mocks/summaries.json` | `_summaries` | Pre-written AI summaries per case |
| `mocks/observations.json` | `_observations` | Pre-written AI observations per case |
| `mocks/drafts.json` | `_drafts` | Pre-written draft documents per case |

### Routes

#### `GET /api/cases`

Returns a sorted queue of `CaseQueueItem` objects. Each item is computed by `build_queue()` in `backend/core/case_brief.py`:

1. For each case, calls `build_case_brief()` to get the full brief (policies, flags, classified actions)
2. Skips closed cases and cases where all B actions are already approved/rejected
3. Computes `severity` (0–3) from flags and pending B actions
4. Generates a one-line `headline` for display in the queue row
5. Sorts by severity descending, then by `last_updated`

---

#### `GET /api/cases/:case_id`

Returns a full `CaseBrief` for one case — a rich Pydantic model containing:

- Case metadata, applicant, timeline, notes
- Matching policy extracts (filtered by `case_type`)
- Current `WorkflowState` (from `workflow-states.json`)
- `flags` — computed deadline and escalation warnings (see Flag Calculator below)
- `classified_actions` — all required actions with A/B/C/D categories
- `pending_b_actions` — subset of B actions that are applicable
- `severity` (int 0–3) and `severity_colour` ("red"/"orange"/"yellow"/"green"/"grey")
- `headline` — one-line summary for the queue row

---

#### `GET /api/cases/:case_id/agents/summary`

Returns `{ summary: string }` after a simulated 800ms delay. The summary text comes from `mocks/summaries.json`, not from a live Claude call.

#### `GET /api/cases/:case_id/agents/observations`

Returns `{ observations: Observation[] }` after a simulated 1400ms delay. Data from `mocks/observations.json`.

Each observation has `text`, `severity`, and `source` fields.

#### `GET /api/cases/:case_id/agents/drafts`

Returns `{ drafts: Draft[] }` after a simulated 2200ms delay. Data from `mocks/drafts.json`.

Each draft has `action_type`, `title`, `recipient`, `body`, and optionally `triggers_state_change`.

---

#### `POST /api/cases/:case_id/actions/:action_type/approve`

Records a caseworker approval:

1. Verifies the case and draft exist in memory
2. Sets `action_type → "approved"` in `_action_states`
3. Appends a timestamped timeline entry
4. If the draft has `triggers_state_change`, sets a status override in `_status_overrides`

Returns `{ status, case_id, action_type, new_case_status, timestamp }`.

#### `POST /api/cases/:case_id/actions/:action_type/reject`

Sets `action_type → "rejected"`. No timeline entry added.

#### `POST /api/cases/:case_id/actions/:action_type/edit`

Sets `action_type → "edited"`. Accepts `{ body: string }` but does not persist the edited text (the edit is displayed client-side only).

#### `POST /api/cases/:case_id/actions/:action_type/complete`

For A/C category actions. Sets `action_type → "completed"` and adds a timeline entry. Used when the caseworker marks a non-draft action as done.

---

#### `POST /api/chat`

The only route that makes a **real API call to Claude**.

**Request body:**
```json
{
  "case_id": "CASE-2024-001",
  "action_type": "reminder",
  "current_draft": "...",
  "messages": [{ "role": "user", "content": "..." }]
}
```

The server:
1. Calls `build_case_brief()` to load case data server-side
2. Builds a system prompt containing: case metadata, timeline, notes, flags, applicable policies, current workflow state, and the current draft text
3. Calls Claude via raw `httpx` HTTP request (not the Anthropic SDK) at the configured `ANTHROPIC_BASE_URL`
4. Returns `{ reply: string }`

Model is configured via `ANTHROPIC_DEFAULT_SONNET_MODEL` (defaults to `eu.anthropic.claude-sonnet-4-6`).

---

### Core modules

#### `backend/core/loader.py` — In-memory state

Module-level dictionaries hold all mutable session state. Three dicts track caseworker actions:

| Dict | Key | Value |
|---|---|---|
| `_action_states` | `case_id → action_type` | `"approved"/"rejected"/"edited"/"completed"` |
| `_timeline_additions` | `case_id` | List of extra timeline entries |
| `_status_overrides` | `case_id` | Overridden status string |

`get_case()` and `get_cases()` apply these overlays automatically — callers always see the current working state without needing to call a separate overlay function.

---

#### `backend/core/action_classifier.py` — Action classifier

`classify_actions(required_actions, case, workflow_state)` maps each action string to A/B/C/D.

**D conditions checked first** (conditional actions not yet applicable):

| Condition | Trigger |
|---|---|
| `"reminder" + "28 days"` | D if evidence requested < 28 days ago |
| `"escalate" + "56 days"` | D if evidence requested < 56 days ago |
| `"senior officer" + "serious breach"` | D if "breach" not in case notes |
| `"reconsideration" + "reducing/ceasing"` | D if case notes don't mention reduction/ceasing |
| `"team leader sign-off" + "£50"` | D if "increase" not in case notes |

**B** — matched by keyword-to-actionType mapping (14 keywords)  
**C** — matched by 7 keywords (logging, archiving, scheduling)  
**A** — default

---

#### `backend/core/flag_calculator.py` — Deadline flags

`calculate_flags(case, workflow_state)` computes a list of `Flag` objects with `flag_type`, `message`, `severity` ("red"/"orange"), and `days_overdue`.

Checks three things:

1. **Escalation threshold** — if evidence was requested and days elapsed exceeds `escalation_days` (default 56), adds a red `escalation_overdue` flag
2. **Reminder threshold** — if elapsed exceeds `reminder_days` (default 28), adds an orange/red `reminder_overdue` flag
3. **Escalation stale** — if case status is `escalated` and it has been in that state for more than 14 days, adds an orange `escalation_stale` flag

---

#### `backend/core/case_brief.py` — Severity and headline

Computes `severity` (0–3) and `headline` for queue display:

**Severity:**
- `-1` (grey) — closed
- `3` (red) — any red flag present
- `2` (orange) — status is `escalated` or any orange flag present
- `1` (yellow) — pending B actions exist
- `0` (green) — no flags, no pending actions

**Headline** (for the queue row):
1. Most overdue flag message, if any
2. Count of pending B actions, if any
3. First sentence of case notes as fallback

---

### Pydantic schemas (`backend/schemas/`)

All API responses are validated Pydantic models:

| Schema | Used for |
|---|---|
| `CaseBrief` | Full case response from `GET /api/cases/:id` |
| `CaseQueueItem` | Compact queue row from `GET /api/cases` |
| `ClassifiedAction` | Action with category/actionType/applicable |
| `Flag` | Deadline warning with severity and days_overdue |
| `Draft` | Pre-written action document from mocks |
| `Observation` | AI observation with text, severity, source |

---

## How the Two Services Work Together

```
Browser                                  FastAPI (localhost:8000)
──────────────────────────────           ──────────────────────────────────────────

GET /  →  index.html                     Serve index.html

queue.js                                
  GET /api/cases ──────────────────────→  build_queue()
                                           for each case:
                                             build_case_brief()
                                             classify_actions()
                                             calculate_flags()
                                             compute severity + headline
                                           sort by severity, filter closed
  ←──── CaseQueueItem[] ────────────────   return sorted queue

User clicks a case → /case?id=X

case.js (four parallel calls):

  GET /api/cases/X ───────────────────→  build_case_brief()
  ←── CaseBrief (instant) ─────────────   render header, timeline, actions

  GET /api/cases/X/agents/summary ────→  asyncio.sleep(0.8)
  ←── { summary } (800ms) ─────────────   render AI summary panel

  GET /api/cases/X/agents/observations→  asyncio.sleep(1.4)
  ←── { observations } (1400ms) ───────   render AI observations panel

  GET /api/cases/X/agents/drafts ─────→  asyncio.sleep(2.2)
  ←── { drafts } (2200ms) ─────────────   inject draft text into B-action cards

Caseworker clicks "Chat with AI":
  POST /api/chat ─────────────────────→  build_case_brief()
  { case_id, action_type,               build system prompt
    current_draft, messages }           call Claude via httpx
  ←── { reply } ───────────────────────   return Claude's reply

Caseworker clicks "Approve & Send":
  POST /api/cases/X/actions/Y/approve →  set action state
                                          add timeline entry
                                          set status override if applicable
  ←── { status: "approved", ... } ─────   update card to confirmed state
```

---

## Data Model

Shared with the other branches. Key files in `data/`:

- `cases.json` — case records
- `policy-extracts.json` — policy text indexed by `applicable_case_types`
- `workflow-states.json` — state machine with `required_actions`, `allowed_transitions`, `escalation_thresholds`

Additional mock data in `mocks/`:

- `summaries.json` — `{ case_id: "summary text" }` — pre-written summaries
- `observations.json` — `{ case_id: [{ text, severity, source }] }` — pre-written observations
- `drafts.json` — `{ case_id: { action_type: { title, recipient, body, triggers_state_change? } } }` — pre-written draft documents

---

## Design decisions and constraints

**Vanilla JS frontend.** No build step, no TypeScript, no framework. Fast to iterate on and easy to inspect in a browser.

**AI content is mocked.** Summary, observations, and draft documents come from static JSON files with simulated delays. Only the chat endpoint calls Claude. This decouples UI development from API costs and latency.

**Raw httpx for Claude.** The chat route uses `httpx` directly rather than the Anthropic SDK. This works against both the direct Anthropic API and the shared team proxy.

**Overlays applied at read time.** Unlike the Node branch, `loader.get_case()` applies overlays internally. Callers always get the current state without a separate `applyOverlays()` call.

**No auth.** Single user view, no login screen.

**REFERENCE_DATE hardcoded.** All deadline calculations use `2026-04-16` so demo data always shows meaningful warnings.
