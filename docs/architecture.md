# Architecture

## System Design

```
┌────────────────────────────────────────────────────┐
│                    Browser                          │
│  Queue Page (/)          Case Page (/case?id=...)   │
│  [Deterministic only]    [Deterministic + 3 AI]     │
└──────────────────┬─────────────────────────────────┘
                   │ HTTP
┌──────────────────┴─────────────────────────────────┐
│                 FastAPI Backend                      │
│                                                     │
│  Routes:                                            │
│    GET /api/cases              → Queue list          │
│    GET /api/cases/:id          → Full CaseBrief      │
│    GET /api/cases/:id/agents/* → AI agent results    │
│    POST /api/cases/:id/actions/* → Approve/Reject    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │         Deterministic Core                   │    │
│  │  loader → joiner → flag_calculator           │    │
│  │         → action_classifier → CaseBrief      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Summariser│  │Case Interpret.│  │Action Drafter│  │
│  │  800ms   │  │   1400ms     │  │   2200ms     │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
│       ↓              ↓                  ↓           │
│  ┌─────────────────────────────────────────────┐    │
│  │            mocks/*.json                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │            data/*.json (read-only)           │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Design Principles

1. **Deterministic first.** Policy matching, state lookup, deadline arithmetic, action classification — all pure code. No LLM ambiguity in the critical path.

2. **AI as proposer, human as decider.** Every AI-generated output is labelled `[AI]`. No action sends without explicit caseworker approval. No state change without a click.

3. **Parallel agents, independent inputs.** The three agents all read the same CaseBrief. No agent depends on another's output. Any agent failing doesn't block the others.

4. **In-memory state for the demo.** Approvals, rejections, and state transitions mutate in-memory dictionaries. The original JSON data files are never modified.

5. **Progressive rendering.** Deterministic content renders at T+0. AI sections show named skeleton loaders, then fill in independently as each agent returns.

## Tech Stack

- **Backend:** Python 3 + FastAPI + Pydantic
- **Frontend:** Vanilla HTML/JS/CSS served by FastAPI StaticFiles
- **Styling:** Custom CSS inspired by GOV.UK Design System
- **Mock agents:** `asyncio.sleep()` + pre-written JSON responses
