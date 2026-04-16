from __future__ import annotations
from pydantic import BaseModel


class Applicant(BaseModel):
    name: str
    reference: str
    date_of_birth: str | None = None


class TimelineEntry(BaseModel):
    date: str
    event: str
    note: str


class Flag(BaseModel):
    flag_type: str          # "reminder_overdue", "escalation_overdue", "evidence_overdue", etc.
    message: str            # Human-readable, e.g. "Escalation 35 days overdue"
    severity: str           # "red", "orange", "yellow", "green"
    days_overdue: int       # 0 = not overdue, positive = days past threshold


class ClassifiedAction(BaseModel):
    text: str               # The original action text from workflow-states.json
    category: str           # A, B, C, D
    action_type: str | None = None  # For B actions: "reminder", "escalation", "decision_letter", etc.
    applicable: bool = True  # False for D actions that aren't yet relevant


class PolicyExtract(BaseModel):
    policy_id: str
    title: str
    body: str


class WorkflowState(BaseModel):
    state: str
    label: str
    description: str
    allowed_transitions: list[str]
    required_actions: list[str]
    escalation_thresholds: dict[str, int] | None = None


class CaseBrief(BaseModel):
    case_id: str
    case_type: str
    status: str
    applicant: Applicant
    assigned_to: str
    created_date: str
    last_updated: str
    timeline: list[TimelineEntry]
    case_notes: str
    policies: list[PolicyExtract]
    workflow_state: WorkflowState
    flags: list[Flag]
    classified_actions: list[ClassifiedAction]
    pending_b_actions: list[ClassifiedAction]  # Subset: only category B that are applicable
    severity: int           # 3=red, 2=orange, 1=yellow, 0=green, -1=grey
    headline: str           # One-line summary for the queue row


class CaseQueueItem(BaseModel):
    case_id: str
    case_type: str
    status: str
    applicant_name: str
    assigned_to: str
    severity: int
    severity_colour: str    # "red", "orange", "yellow", "green", "grey"
    headline: str
    pending_actions_count: int
    last_updated: str
