from backend.core import loader
from backend.core.joiner import get_matching_policies, get_workflow_state
from backend.core.flag_calculator import calculate_flags
from backend.core.action_classifier import classify_actions
from backend.schemas.case_brief import (
    Applicant, CaseBrief, CaseQueueItem, ClassifiedAction,
    Flag, PolicyExtract, TimelineEntry, WorkflowState,
)


def _compute_severity(case: dict, flags: list[Flag], pending_b: list[ClassifiedAction]) -> int:
    """Compute urgency severity: 3=red, 2=orange, 1=yellow, 0=green, -1=grey."""
    if case["status"] == "closed":
        return -1

    has_red = any(f.severity == "red" for f in flags)
    has_orange = any(f.severity == "orange" for f in flags)

    if has_red:
        return 3
    if case["status"] == "escalated" or has_orange:
        return 2
    if pending_b:
        return 1
    return 0


def _severity_to_colour(severity: int) -> str:
    return {3: "red", 2: "orange", 1: "yellow", 0: "green", -1: "grey"}.get(severity, "green")


def _compute_headline(case: dict, flags: list[Flag], pending_b: list[ClassifiedAction]) -> str:
    """Generate a one-line headline for the queue row."""
    status = case["status"]

    if status == "closed":
        # Find close date from timeline
        for entry in reversed(case.get("timeline", [])):
            if entry["event"] == "closed":
                return f"Closed — {entry['date']}"
        return "Closed"

    parts = []

    # Most severe flag
    if flags:
        most_severe = sorted(flags, key=lambda f: f.days_overdue, reverse=True)[0]
        parts.append(most_severe.message)

    # Pending actions count
    if pending_b:
        n = len(pending_b)
        parts.append(f"{n} action{'s' if n > 1 else ''} pending")

    # Fallback from case notes
    if not parts:
        notes = case.get("case_notes", "")
        if notes:
            first_sentence = notes.split(".")[0].strip()
            if len(first_sentence) > 80:
                first_sentence = first_sentence[:77] + "..."
            parts.append(first_sentence)

    return " · ".join(parts) if parts else "No actions required"


def build_case_brief(case_id: str) -> CaseBrief | None:
    """Build a complete CaseBrief for a single case."""
    case = loader.get_case(case_id)
    if not case:
        return None

    policies_raw = get_matching_policies(case["case_type"])
    ws_raw = get_workflow_state(case["case_type"], case["status"])

    flags = calculate_flags(case, ws_raw)

    required_actions = ws_raw.get("required_actions", []) if ws_raw else []
    classified = classify_actions(required_actions, case, ws_raw)
    pending_b = [a for a in classified if a.category == "B" and a.applicable]

    severity = _compute_severity(case, flags, pending_b)
    headline = _compute_headline(case, flags, pending_b)

    policies = [
        PolicyExtract(policy_id=p["policy_id"], title=p["title"], body=p["body"])
        for p in policies_raw
    ]

    workflow_state = WorkflowState(**ws_raw) if ws_raw else WorkflowState(
        state=case["status"], label=case["status"], description="",
        allowed_transitions=[], required_actions=[],
    )

    timeline = [TimelineEntry(**t) for t in case.get("timeline", [])]
    applicant = Applicant(**case["applicant"])

    return CaseBrief(
        case_id=case["case_id"],
        case_type=case["case_type"],
        status=case["status"],
        applicant=applicant,
        assigned_to=case.get("assigned_to", ""),
        created_date=case.get("created_date", ""),
        last_updated=case.get("last_updated", ""),
        timeline=timeline,
        case_notes=case.get("case_notes", ""),
        policies=policies,
        workflow_state=workflow_state,
        flags=flags,
        classified_actions=classified,
        pending_b_actions=pending_b,
        severity=severity,
        headline=headline,
    )


def build_queue() -> list[CaseQueueItem]:
    """Build sorted queue of all cases."""
    cases = loader.get_cases()
    items: list[CaseQueueItem] = []

    for case in cases:
        brief = build_case_brief(case["case_id"])
        if not brief:
            continue
        items.append(CaseQueueItem(
            case_id=brief.case_id,
            case_type=brief.case_type,
            status=brief.status,
            applicant_name=brief.applicant.name,
            assigned_to=brief.assigned_to,
            severity=brief.severity,
            severity_colour=_severity_to_colour(brief.severity),
            headline=brief.headline,
            pending_actions_count=len(brief.pending_b_actions),
            last_updated=brief.last_updated,
        ))

    # Sort: highest severity first, then by most overdue
    items.sort(key=lambda x: (-x.severity, x.last_updated))
    return items
