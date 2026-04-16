from fastapi import APIRouter, HTTPException

from backend.core.case_brief import build_case_brief, build_queue
from backend.agents.summariser import summarise
from backend.agents.case_interpreter import interpret
from backend.agents.action_drafter import draft_all

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("")
async def get_queue():
    """Return sorted queue of all cases (deterministic, instant)."""
    return build_queue()


@router.get("/{case_id}")
async def get_case(case_id: str):
    """Return full CaseBrief for a single case (deterministic, instant)."""
    brief = build_case_brief(case_id)
    if not brief:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return brief


@router.get("/{case_id}/agents/summary")
async def get_summary(case_id: str):
    """Return AI summary (simulated 800ms delay)."""
    summary = await summarise(case_id)
    return {"summary": summary}


@router.get("/{case_id}/agents/observations")
async def get_observations(case_id: str):
    """Return AI observations (simulated 1400ms delay)."""
    observations = await interpret(case_id)
    return {"observations": [o.model_dump() for o in observations]}


@router.get("/{case_id}/agents/drafts")
async def get_drafts(case_id: str):
    """Return AI drafts (simulated 2200ms delay)."""
    drafts = await draft_all(case_id)
    return {"drafts": [d.model_dump() for d in drafts]}
