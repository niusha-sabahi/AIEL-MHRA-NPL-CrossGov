# Challenge 3: Supporting casework decisions

A caseworker receives a new case. To understand it, they open a case management system, a policy guidance document stored on a shared drive, and an email thread from the previous officer who handled it. They read through weeks of notes to understand where the case has got to. They look up which policy applies and what evidence is needed. They check whether any deadlines are approaching. Then they decide what action to take.

This pattern repeats, case after case, throughout the day. Across government, thousands of caseworkers spend a significant proportion of their time on these information-gathering tasks — rather than on the judgement and human decision-making that only a person can provide.

## The experience today

A caseworker opens a case that was assigned to them yesterday. The previous officer has left notes but they are spread across three different fields in the case management system. There is a timeline of events but it does not explain why certain decisions were made. The caseworker needs to know which policy applies — but the policy guidance is a 40-page document and they are not sure which version is current.

They establish that evidence was requested six weeks ago. They are not sure whether it arrived. They check the notes again. It is unclear. They send a chasing email. Later that day they find out the evidence was actually received three weeks ago but logged in a different system.

The applicant, meanwhile, has heard nothing for six weeks. They do not know whether their case is progressing or whether something has gone wrong.

## The users

**The caseworker** — managing 20 to 40 active cases at any given time. They need to understand a new case quickly, know what action is required, and be confident they are applying the correct policy. They are not a technical user. Opening multiple systems and reading through lengthy notes to get to a decision is a normal part of their day — but it is time that could be spent on cases that genuinely need careful human consideration.

**The team leader** — responsible for a caseload of perhaps 200 to 300 active cases across their team. They need to know which cases are at risk of breaching a deadline, which need escalating, and where their team's capacity is under pressure. They currently get this picture by asking their caseworkers, not from a system.

**The applicant** — a citizen or organisation waiting for a decision. They submitted their application weeks ago. They do not know where their case is in the process. They do not know whether the right evidence has been received. They cannot get a meaningful update without calling a helpline.

## Why this matters

Caseworking is one of the largest categories of work in the civil service. Departments across government — in areas covering employment support, tax, immigration, licensing, and many others — each run caseworking operations at significant scale. The systems they use are different, but the underlying patterns are the same: receive a case, gather evidence, apply policy, make a decision, communicate the outcome.

Supporting caseworkers to do this work more effectively — by surfacing the right information at the right moment — has the potential to reduce processing times, improve consistency, and free up caseworkers to focus on the decisions that require genuine human judgement.

## A note on AI model access

The event does not provide access to AI models (such as large language model APIs) for use within your application. This is relevant to this challenge because capabilities like case summarisation would typically involve a language model.

You have three options:

- if your team has access to AI models through your department, personal accounts, or locally hosted models, you can integrate them
- you can mock AI endpoints — build the system as if a model were available and return realistic pre-written responses
- you can build the non-AI parts of the system (case display, policy matching, workflow tracking) and demonstrate clearly where a model would plug in

The judging focuses on the quality of the prototype and the approach, not on whether you have a live model behind it. A well-architected system with mocked AI endpoints scores just as well as one with a live model.

To make this concrete: a tool that displays a case clearly, surfaces the relevant policy matched by case type, shows where the case sits in its workflow and what action is required next, and flags evidence that has been outstanding beyond the policy threshold — built entirely without a language model — is a complete and impressive prototype.

## Data provided

A starter dataset is available in the hackathon repository at `challenge-3/`:

| File | Description |
|------|-------------|
| `cases.json` | 10 synthetic cases covering three case types (benefit review, licence application, compliance check), with varied statuses, timelines, and case notes |
| `policy-extracts.json` | 10 policy extracts covering the three case types, including evidence requirements, escalation thresholds, and decision rules |
| `workflow-states.json` | A state machine definition for all three case types, with states, allowed transitions, required actions, and escalation thresholds |

The starter data is enough to build and demo against. If your team wants more cases, use your AI coding tool to generate them — the structure is fully defined in the sample records below. See Hint 3 for a generation prompt.

### Sample case record structure

Each case in `cases.json` follows this structure:

```json
{
  "case_id": "CASE-2026-00042",
  "case_type": "benefit_review",
  "status": "awaiting_evidence",
  "applicant": {
    "name": "Jordan Smith",
    "reference": "REF-77291",
    "date_of_birth": "1985-03-14"
  },
  "assigned_to": "team_b",
  "created_date": "2026-01-10",
  "last_updated": "2026-03-28",
  "timeline": [
    {
      "date": "2026-01-10",
      "event": "case_created",
      "note": "Initial application received via online portal."
    },
    {
      "date": "2026-01-15",
      "event": "evidence_requested",
      "note": "Requested proof of address and income statement."
    },
    {
      "date": "2026-02-02",
      "event": "evidence_received",
      "note": "Proof of address received. Income statement still outstanding."
    }
  ],
  "case_notes": "Applicant relocated from Birmingham to Manchester in December 2025. Previous claim under reference REF-55102 was closed in November 2025. New claim opened due to change of circumstances. Awaiting income statement — applicant stated employer has been contacted."
}
```

### Sample policy extract structure

```json
{
  "policy_id": "POL-BR-003",
  "title": "Evidence requirements for benefit reviews",
  "applicable_case_types": ["benefit_review"],
  "body": "When a benefit review is triggered by a change of circumstances, the caseworker must obtain: (1) proof of the new address, (2) an income statement covering the 3 months prior to the change, and (3) a signed declaration confirming the change. If any evidence is outstanding after 28 days, the caseworker should issue a reminder. If outstanding after 56 days, the case should be escalated to a team leader."
}
```

---

<details>
<summary><strong>Hint 1 — Explore the problem: what does a caseworker actually need?</strong></summary>

Before writing any code, use your AI coding tool to understand what the caseworker and applicant experience actually looks like.

```
I am designing a tool to support government caseworkers. A
caseworker processes benefit review cases. Walk me through
their working day — what information do they need, where do
they get it, what decisions do they make, and where is time
spent on tasks that follow predictable patterns?
```

```
Here is a sample case record: [paste a record from cases.json].
What does a caseworker need to know in the first two minutes of
opening this case? What is present? What is missing or unclear?
What could go wrong without the right information to hand?
```

```
From the perspective of the applicant — the person whose case
this is — what is the experience like? What do they know about
the status of their case? What would good communication look
like?
```

</details>

<details>
<summary><strong>Hint 2 — Possible directions and design questions</strong></summary>

Once you understand the problem, you will have a clearer sense of which part of the caseworker experience to focus on. The data provided covers three areas — cases, policy, and workflow — and they connect in interesting ways.

**The information problem.** A caseworker needs to understand a case quickly. The case notes, timeline, and applicant details tell a story — but that story is currently scattered. Presenting it in a clear, structured way, with the most important information prominent, is a real improvement even without any AI involved.

**The policy problem.** Knowing which policy applies to a case is a matching problem — if you know the case type, you can identify the relevant policies. Surfacing those policies alongside the case, rather than making the caseworker look them up separately, removes a repeated task. The interesting design question is: which part of the policy does this caseworker need right now?

**The workflow problem.** The workflow state machine in the data tells you exactly where a case should be and what should happen next. Making that visible — and flagging cases where something is overdue or where a deadline is approaching — is a concrete, achievable capability that does not require a language model.

**The AI layer.** If you want to add summarisation or more intelligent matching, you can mock an endpoint that returns a pre-written summary for now. The important thing is to design the interface so the mock can be replaced by a real model call later without changing anything else.

</details>

<details>
<summary><strong>Hint 3 — A starting point with specific prompts</strong></summary>

If your team wants a concrete direction, here is one approach.

To generate more cases if you need them:

```
Here is the structure of a case record: [paste one record from
cases.json]. Generate 20 more synthetic cases with varied case
types (benefit_review, licence_application, compliance_check),
different statuses, realistic timelines, and detailed case
notes. Include some with complications — missing evidence,
approaching deadlines, escalated cases.
```

Start with the data. Load `cases.json` and display a single case clearly:

```
I have a JSON file of casework records. Each case has a case_id,
case_type, status, applicant details, a timeline of events, and
free-text case notes. Build a simple web interface that loads
the JSON and displays a single case: applicant details at the
top, the timeline as a vertical list showing dates and events,
and the case notes below. Make it readable and well-structured.
```

Then add policy matching:

```
I have a JSON file of policy extracts, each with a policy_id,
title, applicable_case_types, and body text. Given a case with
case_type "benefit_review", find all matching policies and
display them alongside the case. Show the policy title and the
relevant body text.
```

Then use the workflow data to show case status and required actions:

```
I have a workflow state machine in JSON with states, allowed
transitions, and required actions at each stage. Given a case
with status "awaiting_evidence", show: the current state, what
action is required, and whether any deadlines have been missed
based on the timeline of events and the policy thresholds.
```

From there, you might explore: what happens if evidence has been outstanding for more than 28 days? What does the team leader's view look like across multiple cases? What would you need to add for this to be useful to a real caseworker?

</details>

## What does a good outcome look like?

By the end of the day, you should be able to show a tool that makes a caseworker's job meaningfully easier — not by making decisions for them, but by surfacing the right information at the right moment. If you can demo a case, show the relevant policy alongside it, show where it sits in its workflow and what action is required, and explain honestly what is mocked and what would need a real model — that is a complete and credible prototype.

## Useful references

- GOV.UK Content API — https://content-api.publishing.service.gov.uk
- GOV.UK design patterns — https://design-system.service.gov.uk

---
Version: 1.1
Last updated: April 2026
