import asyncio

from backend.core import loader


async def summarise(case_id: str) -> str | None:
    """Return a pre-written summary after simulating LLM latency (800ms)."""
    await asyncio.sleep(0.8)
    return loader.get_summary(case_id)
