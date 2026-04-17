# System Design — Casework Decision Support (main)

## Overview

This is a UK government casework decision-support prototype consisting of two independently runnable services: a React frontend and an Express AI server. Together they give caseworkers an AI-assisted interface for reviewing cases, matching them to policy, and producing draft analysis — all with a human-in-the-loop approval step before any action is taken.

The application has no database and no authentication backend. All case, policy, and workflow data is loaded from static JSON files at startup. The AI server holds no persistent state — it is stateless per request.

---

## Service 1 — Frontend (Vite + React)

**Runs at:** `http://localhost:5173`  
**Start with:** `npm run dev` (from `casework-ui/`)

### What it does

The frontend is a single-page React application providing three distinct views depending on the authenticated user's role.

#### Authentication and roles

On load, users see a login screen (`Login.tsx`) and select from a list of mock users defined in `src/auth.ts`. There is no password. Three roles exist:

| Role | What they see |
|---|---|
| `caseworker` | Case list + case detail — only their assigned cases |
| `team_leader` | Dashboard with all cases, assignment controls, and case detail |
| `applicant` | Read-only status page for their own cases |

#### Case list and case detail (caseworker and team leader)

The main interface is a two-panel layout: `CaseList` on the left, `CaseDetail` on the right. `App.tsx` holds `selectedCase` state and passes it to both.

`CaseDetail` renders four tabs:

- **Overview** — applicant details, case notes, deadline alerts
- **Timeline** — chronological event log with icons
- **Policy & Workflow** — matched policies for the case type, current workflow state, required actions, escalation thresholds, and allowed status transitions
- **AI Analysis** — the AI-powered analysis interface (see below)

#### AI Analysis tab

The AI Analysis tab is implemented in `AnalysisTabEditable.tsx`. It has four states:

1. **Empty** — shows an "Analyse Case" prompt button
2. **Loading** — spinner while waiting for the server
3. **Pending** — displays the full analysis result with an interactive approval card
4. **Editing** — all analysis fields become editable inline

The component maintains three versions of each field — `original` (from the API response), `saved` (last accepted version), and `edited` (in-progress) — allowing the caseworker to revert to the AI-generated text at any point.

The AI Analysis tab also includes a **chat panel** toggled by "Chat with AI". The caseworker can ask Claude to modify the analysis in natural language (e.g. "make the summary shorter", "change priority to high", "write an email to the applicant"). Claude returns typed responses:

- `analysis_update` — updates all analysis fields in-place
- `text_output` — displays generated text (emails, letters, etc.)
- `message` — answers a question

At the bottom are action buttons:

| Button | Effect |
|---|---|
| **Approve** | Transitions to approved state with timestamp |
| **Edit** | Opens inline edit mode for all fields |
| **Reject** | Transitions to rejected state |
| **Regenerate** | Triggers a fresh `/analyse` call |

Approve and reject are UI-only in this branch — they update local component state but do not POST to the server.

#### Team leader dashboard

`TeamLeaderDashboard.tsx` gives team leaders a cross-team view with key metrics (total, escalated, overdue cases). They can assign individual cases to caseworkers. Assignments are held in `App.tsx` state and merged onto cases before rendering.

#### Applicant view

`ApplicantView.tsx` shows applicants a simplified status page — no case notes, no policy detail, no AI features. Status labels are translated into plain English.

#### Deadline logic

Cases in `awaiting_evidence` status are checked against their `evidence_requested` timeline event:

- **28 days** → amber banner
- **56 days** → red banner

Logic runs in `CaseDetail.tsx` (banners), `CaseList.tsx` (list flags), and is also passed to Claude by the server. `TODAY` is hardcoded to `2026-04-16` in all locations.

#### Offline fallback

If the AI server is not running, `analyseCase.ts` catches the network error and returns a mock `AnalysisResult` with `_isMock: true`. The UI shows a "Server offline" amber banner. All other tabs are unaffected.

### Key source files

```
src/
  App.tsx                          Root — role routing, selected case state
  auth.ts                          User type, mock user list
  analyseCase.ts                   Calls /analyse, returns fallback on network error
  types.ts                         All shared TypeScript interfaces
  data/
    cases.json                     Sample case records
    policy-extracts.json           Policy text indexed by applicable case types
    workflow-states.json           Workflow states, transitions, required actions
  components/
    Login.tsx                      Role selection screen
    CaseList.tsx                   Left panel — scrollable case list with flags
    CaseDetail.tsx                 Right panel — tabs, header, deadline warnings
    AnalysisTabEditable.tsx        AI Analysis tab with approval/edit/chat
    TeamLeaderDashboard.tsx        Cross-team view with assignment controls
    ApplicantView.tsx              Citizen-facing status page
```

---

## Service 2 — AI Server (Express)

**Runs at:** `http://localhost:8000`  
**Start with:** `npm run server` (from `casework-ui/`)

The server is a thin Express proxy that keeps Anthropic API credentials server-side (never exposed to the browser), filters and prepares data before each Claude call, and returns typed JSON.

### Routes

#### `POST /analyse`

The primary analysis route. Called by the frontend's "Analyse Case" button.

**Request body:** `{ case, policies, workflow }`

**Processing:**
1. Filters `policies` to those matching the case's `case_type`
2. Looks up the current `WorkflowState` from the workflow data
3. Calculates `daysSinceEvidence` from the `evidence_requested` timeline event
4. Calls Claude (`claude-opus-4-6`, adaptive thinking enabled) with a structured prompt from `server/prompt.ts`
5. Extracts the JSON block from Claude's text response and returns it as `AnalysisResult`

**Response:** `AnalysisResult`

---

#### `POST /chat`

General analysis chat. The client sends the full case, policies, workflow, the current analysis, and the conversation history.

The system prompt embeds: case metadata, current analysis, full case record, applicable policies, and workflow state.

Claude returns one of three typed responses:

- `{ type: "analysis_update", analysis: AnalysisResult }` — modifies the analysis
- `{ type: "text_output", content: string }` — generated text (email, letter, etc.)
- `{ type: "message", content: string }` — answers a question

---

#### `GET /health`

Returns `{ status: "ok" }`.

---

### Prompt isolation (`server/prompt.ts`)

All Claude prompt text lives in `server/prompt.ts` and nowhere else. It exports `buildSystemPrompt()` and `buildUserMessage()`. Iterating on analysis quality requires only changes to this file — the server route and `AnalysisResult` interface stay stable.

The system prompt instructs Claude to act as a casework briefing assistant and return a single JSON object. The user message injects the case record, matched policies, current workflow state, and deadline context.

---

### Credentials

The server accepts either:
- `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` + `ANTHROPIC_DEFAULT_OPUS_MODEL` — shared team proxy
- `ANTHROPIC_API_KEY` — direct Anthropic API

Set in `casework-ui/.env` (gitignored). The `npm run server` script passes it via `tsx --env-file=.env`.

---

## How the Two Services Work Together

```
Browser (localhost:5173)                Server (localhost:8000)
────────────────────────────────        ─────────────────────────────────────────

App.tsx loads cases.json,
policy-extracts.json,
workflow-states.json at startup

User selects a case
↓
CaseDetail renders tabs
User clicks "Analyse Case"
↓
analyseCase.ts
  POST /analyse ────────────────────→  1. filter policies by case_type
  { case, policies, workflow }         2. look up WorkflowState
                                       3. calculate daysSinceEvidence
  ←──── AnalysisResult ───────────────  4. call Claude (claude-opus-4-6)
                                       5. extract JSON from response
                                       6. return AnalysisResult

AnalysisTabEditable renders result
Caseworker reviews, opens chat
↓
POST /chat ──────────────────────────→  build system prompt with full context
{ case, policies, workflow,            call Claude
  currentAnalysis, userMessage,        parse typed response
  conversationHistory }
←── { type, analysis|content } ────────  return to frontend

If type === "analysis_update":
  update all analysis fields in-place
If type === "text_output":
  display generated text
If type === "message":
  show as chat reply

Caseworker clicks Approve/Reject:
  (UI state only — no server call in this branch)
```

### Offline behaviour

If the server is not running, `analyseCase.ts` catches the `TypeError: fetch` and returns a static mock `AnalysisResult` with `_isMock: true`. The AI Analysis tab shows a "Server offline" banner. All other tabs (Overview, Timeline, Policy) function normally using client-side data.

---

## Data Model

All reference data is in `casework-ui/src/data/`. It is static JSON — never written to.

### Case

```
case_id          string         e.g. "CASE-2024-001"
case_type        enum           benefit_review | licence_application | compliance_check
status           enum           case_created | awaiting_evidence | under_review |
                                pending_decision | escalated | closed
applicant        { name, reference, date_of_birth }
assigned_to      string         team name
assigned_caseworker  string?    individual caseworker ID
created_date     ISO date
last_updated     ISO date
timeline         TimelineEvent[]  { date, event, note }
case_notes       string
```

### Policy extract

```
policy_id                string    e.g. "POL-BR-003"
title                    string
applicable_case_types    string[]
body                     string
```

### Workflow state

```
state                  string    matches CaseStatus values
label                  string
description            string
allowed_transitions    string[]
required_actions       string[]
escalation_thresholds:
  reminder_days?       number
  escalation_days?     number
```

### AnalysisResult (server → browser)

```
matched_policy_id          string
matched_policy_title       string
summary                    string    2–3 sentences
recommendation             string    one clear action
assignment_recommendation  string
priority                   low | medium | high | urgent
flags                      string[]
_isMock?                   boolean   set only by the offline fallback
```

---

## Role-based access summary

| Feature | Caseworker | Team Leader | Applicant |
|---|---|---|---|
| View cases | Own assigned only | All cases | Own cases only |
| Case detail (all tabs) | Yes | Yes | No |
| AI Analysis | Yes | Yes | No |
| Approve/reject AI output | Yes | Yes | No |
| Chat with AI about analysis | Yes | Yes | No |
| Assign cases to caseworkers | No | Yes | No |
| Applicant status view | No | No | Yes |

---

## Design decisions and constraints

**No database.** All data is static JSON loaded at startup. This makes the system trivially runnable locally.

**No real authentication.** Login selects from a hardcoded user list. In production this would be replaced by a proper identity provider.

**API credentials server-side only.** The Anthropic key never reaches the browser.

**Prompt isolated in `server/prompt.ts`.** Changing analysis quality requires only changes to that file.

**Approval is UI-only.** In this branch, Approve and Reject update local React state only — no backend call is made. The pattern represents the caseworker's sign-off intent, not an actual system action.

**`TODAY` hardcoded.** All deadline calculations use `2026-04-16` so demo data always shows meaningful warnings.