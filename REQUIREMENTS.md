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

### R6 — AI Summary Layer (mocked)
Show a plain-English summary of the case (what's happened, what's needed, any risks) via a mocked AI endpoint — designed so a real LLM can replace the mock without changing the interface.

---

## Out of Scope
- Authentication / user management
- Real case management system integration
- Sending emails or notifications
- Editing or updating case data

---

## Success Criteria
A demo where a caseworker can open a case, immediately see relevant policy and workflow status, identify any overdue actions, and get an AI-generated summary — all in one view.
