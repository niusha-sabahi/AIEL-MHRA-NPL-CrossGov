import asyncio

from backend.core import loader
from backend.schemas.observation import Observation


async def interpret(case_id: str) -> list[Observation]:
    """Return pre-written observations after simulating LLM latency (1400ms)."""
    await asyncio.sleep(1.4)
    raw = loader.get_observations(case_id)
    if not raw:
        return []
    return [Observation(**obs) for obs in raw]
