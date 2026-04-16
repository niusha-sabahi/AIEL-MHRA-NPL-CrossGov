import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core import loader
from backend.core.case_brief import build_case_brief

router = APIRouter(prefix="/api", tags=["chat"])

API_BASE_URL = os.environ.get(
    "ANTHROPIC_BASE_URL",
    "https://licenseportal.aiengineeringlab.co.uk",
)
API_KEY = os.environ.get("ANTHROPIC_AUTH_TOKEN", "sk-ncE9tbj0h6MwO4DGmPbScg")
MODEL = os.environ.get("ANTHROPIC_DEFAULT_SONNET_MODEL", "eu.anthropic.claude-sonnet-4-6")


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    case_id: str
    action_type: str
    current_draft: str
    messages: list[ChatMessage]


def _build_system_prompt(case_id: str, action_type: str, current_draft: str) -> str:
    brief = build_case_brief(case_id)
    if not brief:
        return "You are a helpful assistant for government casework."

    policies_text = "\n".join(
        f"- {p.policy_id}: {p.title}\n  {p.body}" for p in brief.policies
    )
    flags_text = "\n".join(f"- {f.message}" for f in brief.flags) if brief.flags else "None"
    timeline_text = "\n".join(
        f"- {t.date}: {t.event} — {t.note}" for t in brief.timeline
    )

    return f"""You are an AI assistant helping a government caseworker refine a draft document.

CASE DETAILS:
- Case ID: {brief.case_id}
- Case Type: {brief.case_type}
- Status: {brief.status}
- Applicant: {brief.applicant.name} ({brief.applicant.reference})
- Assigned to: {brief.assigned_to}

TIMELINE:
{timeline_text}

CASE NOTES:
{brief.case_notes}

FLAGS:
{flags_text}

RELEVANT POLICIES:
{policies_text}

CURRENT DRAFT ({action_type}):
{current_draft}

INSTRUCTIONS:
- Help the caseworker refine the draft document above.
- Maintain a formal, professional tone appropriate for government correspondence.
- Reference specific policy numbers and case details where relevant.
- If asked to rewrite, return the full updated draft.
- Keep responses concise and actionable.
- If the caseworker asks for changes, apply them to the current draft and return the updated version."""


@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat with Claude to refine a draft action."""
    system_prompt = _build_system_prompt(
        request.case_id, request.action_type, request.current_draft
    )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    api_url = f"{API_BASE_URL.rstrip('/')}/v1/messages"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                api_url,
                headers={
                    "x-api-key": API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": MODEL,
                    "max_tokens": 2048,
                    "system": system_prompt,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()

            # Extract text from response
            content = data.get("content", [])
            reply = ""
            for block in content:
                if block.get("type") == "text":
                    reply += block.get("text", "")

            return {"reply": reply}

        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Claude API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to connect to Claude API: {str(e)}",
            )
