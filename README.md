# Casework Decision Support Tool

An AI-powered casework support application built for the AI Engineering Lab Hackathon (Challenge 3). This tool helps government caseworkers make faster, more informed decisions by surfacing relevant policy information, workflow status, and AI-generated case analysis in a single unified view.

Hackathon repo - https://github.com/Version1/ai-engineering-lab-hackathon-london-2026/

## Overview

Caseworkers across government spend significant time gathering information from multiple systems before making decisions. This tool reduces that overhead by automatically:

- Displaying case details, timelines, and notes in a clear, structured layout
- Matching and surfacing relevant policy extracts based on case type
- Showing workflow status and required next actions
- Flagging overdue evidence and escalation thresholds
- Providing AI-generated case summaries and recommendations via Claude API

## Features

### Core Capabilities

- **Case View** — Structured display of applicant details, event timeline, and case notes
- **Policy Matching** — Automatic surfacing of relevant policies based on case type
- **Workflow Status** — Current state, required actions, and allowed transitions
- **Deadline Tracking** — Highlights overdue evidence and escalation flags
- **Team Dashboard** — Overview of all cases with status and deadline warnings
- **Team Management** — Team lead case assignment to team members 
- **AI Analysis** — Claude-powered case summaries with recommendations, risk flags, and priority levels
- **Applicant View** — Applicant login to view application status

### Architecture

- **Frontend** — React + TypeScript + Vite + Tailwind CSS (port 5173)
- **AI Server** — Express proxy for secure Claude API calls (port 8000)
- **Offline Fallback** — Mock responses when AI server is unavailable
- **Prompt Isolation** — All AI logic in `server/prompt.ts` for easy iteration

## Quick Start

### Prerequisites

- Node.js (LTS version recommended)
- Anthropic API key or access to the team proxy

### Installation

```bash
# Clone the repository
git clone https://github.com/niusha-sabahi/AIEL-MHRA-NPL-CrossGov.git
cd AIEL-MHRA-NPL-CrossGov/casework-ui

# Install dependencies
npm install

# Configure credentials
cp .env.example .env
# Edit .env and add your API credentials
```

### Running the Application

You need two terminal windows:

**Terminal 1 — Frontend:**
```bash
npm run dev
```

**Terminal 2 — AI Server:**
```bash
npm run server
```

Then open http://localhost:5173 in your browser.

## Configuration

Create a `.env` file in the `casework-ui/` directory:

**For team proxy:**
```env
ANTHROPIC_BASE_URL=https://licenseportal.aiengineeringlab.co.uk
ANTHROPIC_AUTH_TOKEN=<your-token>
ANTHROPIC_DEFAULT_OPUS_MODEL=eu.anthropic.claude-opus-4-6-v1
```

**For direct Anthropic API:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Project Structure

```
casework-ui/
├── src/
│   ├── components/          # React components
│   │   ├── CaseList.tsx     # Case overview dashboard
│   │   ├── CaseDetail.tsx   # Individual case view
│   │   ├── AnalysisTabEditable.tsx  # AI analysis display
│   │   └── ...
│   ├── data/                # Sample data
│   │   ├── cases.json       # 10 synthetic cases
│   │   ├── policy-extracts.json  # Policy guidance
│   │   └── workflow-states.json  # State machine definitions
│   ├── types.ts             # TypeScript interfaces
│   └── analyseCase.ts       # API client for AI analysis
├── server/
│   ├── index.ts             # Express server (AI proxy)
│   └── prompt.ts            # Claude prompt logic
└── package.json
```

## Data

The application uses three JSON data sources:

- **cases.json** — 10 synthetic cases covering benefit reviews, licence applications, and compliance checks
- **policy-extracts.json** — Policy guidance with evidence requirements and escalation thresholds
- **workflow-states.json** — State machine definitions for case workflows

## Documentation

- [SETUP.md](./SETUP.md) — Detailed setup instructions for macOS and Windows
- [REQUIREMENTS.md](./REQUIREMENTS.md) — Full requirements and success criteria
- [challenge-03-supporting-casework-decisions.md](./challenge-03-supporting-casework-decisions.md) — Challenge brief and context

## Development

```bash
# Start frontend dev server
npm run dev

# Start AI server
npm run server

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

**AI server shows "No API key found"**
- Ensure `.env` exists in `casework-ui/` directory
- Check that `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY` is set

**"Analyse Case" shows mock response**
- The AI server isn't running — check terminal 2 for errors
- Restart with `npm run server`

**Port already in use**
- Frontend: `npm run dev -- --port 5174`
- Server: Stop existing process or check for running instances

See [SETUP.md](./SETUP.md) for more troubleshooting tips.

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Express, Node.js
- **AI:** Anthropic Claude API (claude-opus-4-6)
- **Development:** tsx, TypeScript 5.6

## License

This project was created for the AI Engineering Lab Hackathon.

## Contributors

Built by the MHRA-NPL-CrossGov team for Challenge 3: Supporting Casework Decisions.
