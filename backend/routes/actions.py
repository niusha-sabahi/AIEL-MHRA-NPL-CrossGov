from datetime import datetime

from fastapi import APIRouter, HTTPException

from backend.core import loader
from backend.schemas.draft import ActionRequest

router = APIRouter(prefix="/api/cases", tags=["actions"])


@router.post("/{case_id}/actions/{action_type}/approve")
async def approve_action(case_id: str, action_type: str):
    """Approve a draft action. Updates in-memory state."""
    case = loader.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    drafts = loader.get_drafts(case_id)
    if not drafts or action_type not in drafts:
        raise HTTPException(status_code=404, detail=f"No draft found for {action_type}")

    draft = drafts[action_type]

    # Mark action as approved
    loader.set_action_state(case_id, action_type, "approved")

    # Add timeline entry
    now = datetime.now().strftime("%Y-%m-%d")
    loader.add_timeline_entry(case_id, {
        "date": now,
        "event": f"{action_type}_approved",
        "note": f"{draft['title']} — approved by Sarah Chen at {datetime.now().strftime('%H:%M')}",
    })

    # Apply state transition if the draft triggers one
    if draft.get("triggers_state_change"):
        loader.set_status_override(case_id, draft["triggers_state_change"])

    return {
        "status": "approved",
        "case_id": case_id,
        "action_type": action_type,
        "new_case_status": draft.get("triggers_state_change"),
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/{case_id}/actions/{action_type}/reject")
async def reject_action(case_id: str, action_type: str):
    """Reject a draft action."""
    case = loader.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    loader.set_action_state(case_id, action_type, "rejected")

    return {
        "status": "rejected",
        "case_id": case_id,
        "action_type": action_type,
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/{case_id}/actions/{action_type}/edit")
async def edit_action(case_id: str, action_type: str, request: ActionRequest):
    """Save an edited draft body."""
    case = loader.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    loader.set_action_state(case_id, action_type, "edited")

    return {
        "status": "edited",
        "case_id": case_id,
        "action_type": action_type,
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/{case_id}/actions/{action_type}/complete")
async def complete_action(case_id: str, action_type: str):
    """Mark a non-draft action (A/C/D) as completed."""
    case = loader.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    loader.set_action_state(case_id, action_type, "completed")

    now = datetime.now().strftime("%Y-%m-%d")
    loader.add_timeline_entry(case_id, {
        "date": now,
        "event": f"{action_type}_completed",
        "note": f"Action completed by Sarah Chen at {datetime.now().strftime('%H:%M')}",
    })

    return {
        "status": "completed",
        "case_id": case_id,
        "action_type": action_type,
        "timestamp": datetime.now().isoformat(),
    }
