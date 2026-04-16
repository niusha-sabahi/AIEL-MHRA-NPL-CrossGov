from pydantic import BaseModel


class Draft(BaseModel):
    action_type: str            # "reminder", "escalation", "decision_letter", etc.
    title: str                  # Human-readable title for the card
    body: str                   # The actual draft text
    recipient: str              # "applicant", "team_leader", "senior_caseworker", "senior_officer"
    triggers_state_change: str | None = None  # Target state if approved, or None
    status: str = "pending"     # "pending", "approved", "rejected", "edited"


class ActionRequest(BaseModel):
    edited_body: str | None = None  # For edit requests
