import asyncio

from backend.agents.summariser import summarise
from backend.agents.case_interpreter import interpret
from backend.agents.action_drafter import draft_all
from backend.schemas.observation import Observation
from backend.schemas.draft import Draft


async def get_all_agent_results(case_id: str) -> dict:
    """Fire all three agents in parallel and return combined results."""
    summary_task = asyncio.create_task(summarise(case_id))
    observations_task = asyncio.create_task(interpret(case_id))
    drafts_task = asyncio.create_task(draft_all(case_id))

    summary, observations, drafts = await asyncio.gather(
        summary_task, observations_task, drafts_task
    )

    return {
        "summary": summary,
        "observations": [o.model_dump() for o in observations] if observations else [],
        "drafts": [d.model_dump() for d in drafts] if drafts else [],
    }
