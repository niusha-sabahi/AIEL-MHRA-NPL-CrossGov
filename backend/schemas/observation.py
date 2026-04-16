from pydantic import BaseModel


class Observation(BaseModel):
    text: str
    severity: str   # "info", "low", "medium", "high"
    source: str     # e.g. "timeline[2].note", "case_notes"
