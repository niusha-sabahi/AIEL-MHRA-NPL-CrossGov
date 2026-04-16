# Challenge 3 — Requirements

## Overview
A casework support tool that surfaces the right information at the right moment, reducing time spent on information-gathering so caseworkers can focus on decisions.

---

## Core Requirements

### R1 — Case View
Display a single case in a clear, structured layout: applicant details, event timeline, and case notes — drawn from `cases.json`.

### R2 — Policy Matching
Automatically surface all policies relevant to a case's type, displayed alongside the case — drawn from `policy-extracts.json`.

### R3 — Workflow Status
Show the case's current state, the required next action, and allowed transitions — derived from `workflow-states.json`.

### R4 — Deadline & Escalation Flags
Highlight cases where evidence is overdue or an escalation threshold has been breached, based on the case timeline vs. policy thresholds.

### R5 — Case List & Team View
Display all cases in a list with status, assigned team, and any deadline warnings — giving a team-leader-level overview at a glance.

### R6 — AI Summary Layer
Calls the Claude API (`claude-opus-4-6`, adaptive thinking) with the full case record, matched policy extracts, and current workflow state. Returns a structured plain-English analysis: matched policy, summary of what has happened and what is at stake, a single recommended action, assignment recommendation, priority level, and specific risk flags.

**Architecture:** A lightweight Express server (`server/index.ts`, port 8000) acts as a secure proxy — the Anthropic API key never reaches the browser. The frontend POSTs to `POST /analyse`; the server calls Claude, extracts the JSON response, and returns an `AnalysisResult`.

**Prompt isolation:** All prompt logic lives in `server/prompt.ts` — the only file that needs editing when iterating on analysis quality. The `AnalysisResult` interface and server route remain stable.

**Offline fallback:** If the server is not running, the frontend shows a clearly-labelled mock so the UI remains usable during frontend-only development.

**Setup:** Requires `ANTHROPIC_API_KEY` env var. Start with `npm run server` from `casework-ui/`.

---

## Out of Scope
- Authentication / user management
- Real case management system integration
- Sending emails or notifications
- Editing or updating case data

---

## Success Criteria
A demo where a caseworker can open a case, immediately see relevant policy and workflow status, identify any overdue actions, and get an AI-generated summary — all in one view.
