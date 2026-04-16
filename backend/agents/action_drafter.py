import asyncio

from backend.core import loader
from backend.schemas.draft import Draft


async def draft_action(case_id: str, action_type: str) -> Draft | None:
    """Return a pre-written draft after simulating LLM latency (2200ms)."""
    await asyncio.sleep(2.2)
    drafts = loader.get_drafts(case_id)
    if not drafts or action_type not in drafts:
        return None
    return Draft(**drafts[action_type])


async def draft_all(case_id: str) -> list[Draft]:
    """Return all available drafts for a case."""
    await asyncio.sleep(2.2)
    drafts = loader.get_drafts(case_id)
    if not drafts:
        return []
    return [Draft(**d) for d in drafts.values()]
