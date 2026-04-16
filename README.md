# AIEL MHRA NPL CrossGov — AI-Assisted Casework Tool

A prototype AI casework assistant built at a cross-government hackathon, helping caseworkers review regulatory cases, analyse policy matches, and manage approvals.

## Quick start

All commands run from `casework-ui/`:

```bash
npm install
cp .env.example .env   # add your API key
npm run dev            # frontend — http://localhost:5173
npm run server         # AI analysis server — http://localhost:8000
```

The frontend and server run independently. The frontend falls back to a mock response when the server is unreachable.

## Architecture

Two processes, one codebase:

- **Frontend** (`src/`) — Vite + React 18 + TypeScript + Tailwind CSS
- **AI server** (`server/`) — Express at port 8000, calls Claude via the Anthropic SDK

See [CLAUDE.md](CLAUDE.md) for full architecture details, credentials setup, and TypeScript config.

## Branch Comparison

Three branches were developed during and after the hackathon, each building on the last.

| Feature | `main` | `shahbaz-branch` | `merge-shahbaz-into-john` |
|---|---|---|---|
| Real Claude API (analysis) | ✅ | ❌ mocked | ✅ |
| Role-based login (caseworker / team leader / applicant) | ✅ | ❌ | ✅ |
| Team leader dashboard + case assignment | ✅ | ❌ | ✅ |
| Applicant status view | ✅ | ❌ | ✅ |
| Server-side in-memory state (approvals, timeline, status) | ❌ | ✅ | ✅ |
| Action classifier (A / B / C / D) | ❌ | ✅ | ✅ |
| Approve / reject POSTs to server | ❌ UI only | ✅ | ✅ |
| Timeline entry added on approval | ❌ | ✅ | ✅ |
| Status override on approval | ❌ | ✅ | ✅ |
| `/chat` endpoint with typed responses | ✅ | ✅ draft-focused | ✅ both patterns |
| Escalation staleness flag | ❌ | ✅ | ✅ |

### main

John's implementation. Built during the hackathon in approximately two hours using React, TypeScript, Vite, and an Express AI server. Connects to the real Claude API (Opus 4) for live case analysis. Includes role-based login, a team leader dashboard, and an applicant status view. Approve and reject are UI-only — no server state is updated.

### shahbaz-branch

Shabaz's implementation. Python FastAPI backend with a vanilla HTML/JS frontend — no build step. AI content (summaries, observations, drafts) is pre-written and served from mock JSON files with simulated latency. Only the `/chat` endpoint makes real Claude API calls. The backend maintains full in-memory session state: approvals persist across requests, timeline entries are appended, and case status updates when an action is approved. Includes a sophisticated action classifier (A/B/C/D) with conditional logic.

### merge-shahbaz-into-john

The combined implementation. Takes John's React frontend, real Claude integration, and role system, and adds Shabaz's server-side state management, action classifier, and approval backend. Approve and reject now POST to the server, update the timeline, and can trigger status transitions. The recommended branch for continued development.