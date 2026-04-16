# System Design — Casework Decision Support

## Overview

This is a **UK government casework decision-support prototype** consisting of two independently runnable services: a React frontend and an Express AI server. Together they give caseworkers an AI-assisted interface for reviewing cases, matching them to policy, and producing draft correspondence — all with a human-in-the-loop approval step before any action is taken.

The application has no database and no authentication backend. All case, policy, and workflow data is loaded from static JSON files at startup. The AI server holds transient state in memory (lost on restart). This makes the system easy to run locally and iterate on quickly.

---

## Service 1 — Frontend (Vite + React)

**Runs at:** `http://localhost:5173`  
**Start with:** `npm run dev` (from `casework-ui/`)

### What it does

The frontend is the primary user interface. It provides three distinct views depending on the authenticated user's role, all rendered as a single-page application with no client-side routing library.

#### Authentication and roles

On load, users see a login screen (`Login.tsx`) and select from a list of mock users defined in `src/auth.ts`. There is no password. Three roles exist:

| Role | What they see |
|---|---|
| `caseworker` | Case list + case detail — only their assigned cases |
| `team_leader` | Dashboard with all cases + assignment controls + case detail |
| `applicant` | Read-only status view of their own cases |

#### Case list and case detail (caseworker and team leader)

The main interface is a two-panel layout: `CaseList` on the left, `CaseDetail` on the right. `App.tsx` holds `selectedCase` state and passes it to both.

`CaseDetail` renders four tabs:

- **Overview** — applicant details, case notes, deadline alerts
- **Timeline** — chronological event log with icons
- **Policy & Workflow** — matched policies for the case type, current workflow state, required actions, escalation thresholds, and allowed status transitions
- **AI Analysis** — the AI-powered analysis interface (see below)

#### AI Analysis tab

The AI Analysis tab is implemented in `AnalysisTabEditable.tsx`. It has four distinct states:

1. **Empty** — shows an "Analyse Case" prompt button
2. **Loading** — spinner while waiting for the server
3. **Pending** — displays the full analysis result with an interactive approval card
4. **Editing** — all analysis fields become editable inline (priority, policy ID/title, summary, flags, recommendation, assignment recommendation)

The component maintains three versions of each field — `original` (immutable, from the API response), `saved` (the last approved/accepted version), and `edited` (in-progress changes). This allows the caseworker to revert to the original AI-generated text at any point.

The "Recommended Action" section contains an **inline AI chat panel** toggled by "Refine with AI". The caseworker can ask Claude to modify the draft recommendation in natural language (e.g. "make this more concise", "rewrite for a formal letter"). Assistant replies longer than 100 characters show a "Use this draft" button to replace the current recommendation text.

At the bottom of the recommended action card are four action buttons:

| Button | Effect |
|---|---|
| **Approve** | Records approval, transitions display to approved state |
| **Edit** | Opens inline edit mode for all fields |
| **Reject** | Records rejection, clears the analysis |
| **Regenerate** | Triggers a fresh `/analyse` call to the server |

#### Team leader dashboard

`TeamLeaderDashboard.tsx` gives team leaders a cross-team view of all cases. They can assign individual cases to specific caseworkers. Assignments are held in `App.tsx` state and merged onto cases before passing them down.

#### Applicant view

`ApplicantView.tsx` shows applicants a simplified status page for their own cases — no case notes, no policy detail, no AI features. Status labels and descriptions are translated into plain English (e.g. `awaiting_evidence` → "Awaiting Information").

#### Deadline logic

Cases in `awaiting_evidence` status are checked against their `evidence_requested` timeline event. Two thresholds are evaluated:

- **28 days** → amber banner ("reminder required")
- **56 days** → red banner ("escalation threshold exceeded")

This logic runs in `CaseDetail.tsx` (header banners), `CaseList.tsx` (list-level flags), and is also passed to Claude by the server. `TODAY` is hardcoded to `2026-04-16` in all locations.

#### Offline fallback

If the AI server is not running, `analyseCase.ts` catches the network error and returns a static mock `AnalysisResult` with `_isMock: true`. The UI displays a "Server offline" amber banner when this flag is set. No banner is shown for real server responses.

### Key source files

```
src/
  App.tsx                          Root — holds selected case state, role routing
  auth.ts                          User type, mock user list
  analyseCase.ts                   Calls /analyse, returns fallback on network error
  types.ts                         All shared TypeScript interfaces
  data/
    cases.json                     Sample case records
    policy-extracts.json           Policy text, indexed by applicable case types
    workflow-states.json           Workflow states, transitions, required actions
  components/
    Login.tsx                      Role selection screen
    CaseList.tsx                   Left panel — scrollable case list with flags
    CaseDetail.tsx                 Right panel — tabs, header, deadline warnings
    AnalysisTabEditable.tsx        AI Analysis tab — full approval/edit/chat flow
    TeamLeaderDashboard.tsx        Cross-team case view with assignment controls
    ApplicantView.tsx              Citizen-facing status page
```

---

## Service 2 — AI Server (Express)

**Runs at:** `http://localhost:8000`  
**Start with:** `npm run server` (from `casework-ui/`)

### What it does

The server is a thin Express proxy that sits between the browser and the Anthropic API. Its core job is to keep API credentials server-side (never exposed to the browser), load and filter reference data before each Claude call, and translate Claude's JSON output into typed `AnalysisResult` objects.

The server also holds all in-memory caseworker action state — approvals, rejections, and timeline additions — and applies these as overlays onto the static case data before each Claude call, so the AI always sees the current working state of a case within a session.

### Routes

#### `POST /analyse`

The primary analysis route. Called by the frontend's "Analyse Case" button.

**Request body:** `{ case, policies, workflow }`

**Server-side processing:**
1. Applies any in-memory overlays to the case via `applyOverlays()` (status overrides, appended timeline entries)
2. Filters `policies` to those applicable to the case's `case_type`
3. Looks up the current `WorkflowState` from `workflow_states.json`
4. Calculates `daysSinceEvidence` from the `evidence_requested` timeline event
5. Calls Claude (`claude-opus-4-6`, adaptive thinking enabled) with a structured prompt built by `server/prompt.ts`
6. Extracts the JSON block from Claude's text response
7. Runs `classifyActions()` against the current workflow state's `required_actions` and appends the result as `classified_actions` on the `AnalysisResult`
8. Returns the complete `AnalysisResult`

**Response:** `AnalysisResult`

---

#### `POST /chat`

General analysis chat. Allows the caseworker to ask questions about the case or request modifications to the analysis in natural language.

**Request body:** `{ case, policies, workflow, currentAnalysis, userMessage, conversationHistory }`

The client sends the full case object and conversation history. The system prompt embeds the full case record, applicable policies, workflow state, and the current analysis. Claude returns one of three typed responses:

- `{ type: "analysis_update", analysis: AnalysisResult }` — when asked to modify the analysis
- `{ type: "text_output", content: string }` — when asked to generate text (e.g. a letter)
- `{ type: "message", content: string }` — when answering a question

---

#### `POST /cases/:caseId/actions/:actionType/approve`

Records a caseworker approval of an AI-recommended action.

**Request body:** `{ nextStatus?: string }`

1. Sets `actionType → 'approved'` in the in-memory action state map
2. Appends a timestamped timeline entry (e.g. "Action 'send_reminder' approved by caseworker at 14:32")
3. If `nextStatus` is provided, sets a status override for the case

This ensures that subsequent `/analyse` calls for the same case reflect the approval in their context.

---

#### `POST /cases/:caseId/actions/:actionType/reject`

Records a caseworker rejection. Mirrors the approve route without a status transition.

---

#### `POST /cases/:caseId/actions/:actionType/chat`

Draft-refinement chat for a specific action. Unlike `/chat`, **this route loads case data server-side** — the client only sends the current draft text and conversation history.

**Request body:** `{ currentDraft: string, messages: Array<{role, content}> }`

The server:
1. Loads the case from `cases.json` and applies in-memory overlays
2. Filters policies and looks up the current workflow state
3. Calculates deadline flags independently
4. Builds a focused system prompt containing the case record, timeline, flags, applicable policies, workflow state, and the current draft
5. Calls Claude and returns `{ reply: string }`

This keeps the server the single source of truth for case data and avoids the client needing to re-send the full case on every chat turn.

---

#### `GET /health`

Returns `{ status: "ok" }`. Used to verify the server is running.

---

### In-memory state (`server/state.ts`)

Three Maps hold transient state for the current server session:

| Map | Key | Value | Purpose |
|---|---|---|---|
| `actionStates` | `caseId → actionType` | `'approved' \| 'rejected' \| 'edited'` | Tracks caseworker decisions |
| `timelineAdditions` | `caseId` | `TimelineEvent[]` | Entries added by approvals/rejections |
| `statusOverrides` | `caseId` | `string` | Status transitions triggered by approvals |

`applyOverlays(case)` merges all three onto a case object before any Claude call, returning a shallow copy with the overrides applied. The original JSON files are never modified.

---

### Action classifier (`server/classifier.ts`)

`classifyActions(requiredActions, case, workflowState)` maps each workflow `required_action` string to a category:

| Category | Meaning |
|---|---|
| **A** | Default — informational or documentation step, no interactive output required |
| **B** | Draft for approval — produces a document or correspondence that needs caseworker sign-off. Carries an `actionType` string (e.g. `decision_letter`, `reminder`) |
| **C** | Record only — a logging, archiving, or admin step |
| **D** | Not yet applicable — condition not yet met (deadline not reached, or reconsideration not triggered) |

D conditions are evaluated before B to allow them to override — for example, an "issue reminder after 28 days" action is classified D until 28 days have elapsed, at which point it becomes B. The qualifier ("28 days", "56 days") must appear in the action text to prevent false matches against different thresholds in other case types.

---

### Prompt isolation (`server/prompt.ts`)

All Claude prompt text lives in `server/prompt.ts` and nowhere else. It exports two functions: `buildSystemPrompt()` and `buildUserMessage()`. This is intentional — iterating on analysis quality requires only changes to this file. The server route and `AnalysisResult` interface stay stable.

The system prompt instructs Claude to act as a casework briefing assistant and return a single JSON object. The user message injects the case record, matched policies, current workflow state, and deadline context.

---

### Credentials (`server/.env`)

The server accepts either:
- `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` + `ANTHROPIC_DEFAULT_OPUS_MODEL` — shared team proxy
- `ANTHROPIC_API_KEY` — direct Anthropic API

The `npm run server` script passes the `.env` file via `tsx --env-file=.env`. Credentials are never sent to the browser.

---

## How the Two Services Work Together

```
Browser (localhost:5173)                   Server (localhost:8000)
─────────────────────────────────          ─────────────────────────────────────────
                                           
  App.tsx loads cases.json,                
  policy-extracts.json,                    
  workflow-states.json at startup          
                                           
  User selects a case                      
  ↓                                        
  CaseDetail renders tabs                  
  User clicks "Analyse Case"               
  ↓                                        
  analyseCase.ts                           
    POST /analyse ──────────────────────→  1. applyOverlays(case)
    { case, policies, workflow }           2. filter policies by case_type
                                           3. look up WorkflowState
    ←──────────── AnalysisResult ─────────  4. call Claude (claude-opus-4-6)
                                           5. extract JSON from response
                                           6. classifyActions() → classified_actions
                                           7. return AnalysisResult
  ↓                                        
  AnalysisTabEditable renders result       
  Caseworker reviews, optionally chats     
  ↓                                        
  "Refine with AI" → chat panel            
    POST /cases/:id/actions/               
         recommendation/chat ──────────→  1. load case from JSON
    { currentDraft, messages }             2. applyOverlays(case)
                                           3. build focused system prompt
    ←──────────── { reply: string } ──────  4. call Claude, return reply
  ↓                                        
  Caseworker clicks Approve               
    POST /cases/:id/actions/               
         :type/approve ─────────────────→  setActionState → 'approved'
    { nextStatus? }                        addTimelineEntry
                                           setStatusOverride (if nextStatus)
    ←──────────── { outcome, timestamp } ──  return confirmation
```

### Offline behaviour

If the server is not running, `analyseCase.ts` catches the `TypeError: fetch` and returns a static mock `AnalysisResult` with `_isMock: true`. The frontend continues to function — the AI Analysis tab shows an "Server offline" banner. All other tabs (Overview, Timeline, Policy) are unaffected since they use only client-side data.

---

## Data Model

All reference data lives in `src/data/`. It is static JSON — never written to.

### Case (`cases.json`)

```
case_id          string         e.g. "CASE-2024-001"
case_type        enum           benefit_review | licence_application | compliance_check
status           enum           case_created | awaiting_evidence | under_review |
                                pending_decision | escalated | closed
applicant        { name, reference, date_of_birth }
assigned_to      string         team name (e.g. "team_a")
assigned_caseworker  string?    individual caseworker ID
created_date     ISO date
last_updated     ISO date
timeline         TimelineEvent[]  { date, event, note }
case_notes       string
```

### Policy extract (`policy-extracts.json`)

```
policy_id                string    e.g. "POL-BR-003"
title                    string
applicable_case_types    string[]  one or more of the three case types
body                     string    policy text
```

### Workflow state (`workflow-states.json`)

```
case_types:
  <case_type>:
    states:
      - state                  string    matches CaseStatus values
        label                  string    human-readable name
        description            string
        allowed_transitions    string[]  valid next states
        required_actions       string[]  action strings fed to the classifier
        escalation_thresholds:
          reminder_days?       number
          escalation_days?     number
```

### AnalysisResult (server → browser)

```
matched_policy_id          string
matched_policy_title       string
summary                    string    2–3 sentence case summary
recommendation             string    one clear action
assignment_recommendation  string    who should own this
priority                   low | medium | high | urgent
flags                      string[]  specific concerns
classified_actions?        ClassifiedAction[]  appended by server/classifier.ts
_isMock?                   boolean   frontend-only flag, never from real server
```

### ClassifiedAction

```
text          string         the original required_action string
category      A | B | C | D
actionType    string | null  e.g. "decision_letter", "reminder"
applicable    boolean        false when category D
```

---

## Role-based access summary

| Feature | Caseworker | Team Leader | Applicant |
|---|---|---|---|
| View cases | Own assigned only | All cases | Own cases only |
| Case detail (all tabs) | Yes | Yes | No |
| AI Analysis | Yes | Yes | No |
| Approve / reject AI output | Yes | Yes | No |
| Refine with AI chat | Yes | Yes | No |
| Assign cases to caseworkers | No | Yes | No |
| Applicant status view | No | No | Yes |

---

## Design decisions and constraints

**No database.** All data is static JSON loaded at startup. The server holds transient action state in Maps. This is intentional for a prototype — it eliminates infrastructure dependencies and makes the system trivially runnable.

**No real authentication.** The login screen selects from a hardcoded user list. In production this would be replaced by a proper identity provider.

**API credentials are server-side only.** The Anthropic API key never leaves the server process. The frontend only talks to `localhost:8000`, not to Anthropic directly.

**Prompt is isolated.** `server/prompt.ts` is the sole location for AI prompt text. Changing analysis quality requires only changes to that file.

**Human-in-the-loop is structural.** The AI never acts autonomously. Every recommended action requires an explicit caseworker Approve before it would be executed. The approve/reject routes record the decision and add timeline evidence, but no downstream system is called — this is a prototype of the approval pattern itself.

**`TODAY` is hardcoded.** All deadline calculations use `2026-04-16` so the demo data always shows meaningful deadline warnings regardless of when the application is run.