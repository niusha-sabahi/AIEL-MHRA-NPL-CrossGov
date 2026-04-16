# Agent Contracts

## Agent 1 — Summariser

**Purpose:** Turns scattered case data into 2–3 readable sentences a caseworker can scan in 10 seconds.

**Input:**
```json
{
  "case_id": "CASE-2026-00042"
}
```

**Output:**
```json
{
  "summary": "Jordan Smith relocated from Birmingham..."
}
```

**Mock location:** `mocks/summaries.json`
**Simulated latency:** 800ms

---

## Agent 2 — Case Interpreter

**Purpose:** Reads free-text notes and timeline entries, surfaces observations that rule-based logic can't catch — ambiguities, risk signals, things worth a human's eye.

**Input:**
```json
{
  "case_id": "CASE-2026-00042"
}
```

**Output:**
```json
{
  "observations": [
    {
      "text": "Partial evidence only — proof of address received but income statement still outstanding",
      "severity": "info",
      "source": "timeline[2].note"
    }
  ]
}
```

**Severity levels:** `info`, `low`, `medium`, `high`
**Mock location:** `mocks/observations.json`
**Simulated latency:** 1400ms

---

## Agent 3 — Action Drafter

**Purpose:** Produces the text for pending Category B actions — reminders, escalations, decision letters, briefings.

**Input:**
```json
{
  "case_id": "CASE-2026-00042",
  "action_type": "reminder"
}
```

**Output:**
```json
{
  "action_type": "reminder",
  "title": "Reminder to applicant — outstanding evidence",
  "body": "Dear Jordan Smith...",
  "recipient": "applicant",
  "triggers_state_change": null,
  "status": "pending"
}
```

**Action types:** `evidence_request`, `reminder`, `decision_letter`, `reconsideration_notice`, `escalation_briefing`, `outcome_notification`, `acknowledgement`, `outcome_letter`, `case_summary`, `licence_notice`, `briefing_note`
**Mock location:** `mocks/drafts.json`
**Simulated latency:** 2200ms

---

## Deterministic Core (not an agent)

**Purpose:** Performs joins, flag calculations, and action classification. Zero LLM calls.

**Components:**
- `loader.py` — loads JSON data files and mocks
- `joiner.py` — joins case + policies + workflow state
- `flag_calculator.py` — computes overdue flags from timeline dates vs thresholds
- `action_classifier.py` — classifies required actions as A/B/C/D
- `case_brief.py` — assembles complete CaseBrief objects

**Action categories:**
- **A** — Deterministic/auto (identity checks, verifying, arranging)
- **B** — Needs AI draft (send letter, draft decision, brief leader)
- **C** — Record-only (log date, archive, update record)
- **D** — Future/conditional (not yet applicable based on current state)
