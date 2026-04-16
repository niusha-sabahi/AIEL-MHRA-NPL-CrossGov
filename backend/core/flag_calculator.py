from datetime import date, datetime

from backend.schemas.case_brief import Flag

REFERENCE_DATE = date(2026, 4, 16)


def _parse_date(d: str) -> date:
    return datetime.strptime(d, "%Y-%m-%d").date()


def _find_evidence_requested_date(timeline: list[dict]) -> date | None:
    """Find the most recent evidence_requested event in the timeline."""
    for entry in reversed(timeline):
        if entry["event"] == "evidence_requested":
            return _parse_date(entry["date"])
    return None


def _find_escalated_date(timeline: list[dict]) -> date | None:
    """Find escalation event date."""
    for entry in reversed(timeline):
        if entry["event"] == "escalated":
            return _parse_date(entry["date"])
    return None


def calculate_flags(
    case: dict,
    workflow_state: dict | None,
) -> list[Flag]:
    """Compute overdue flags for a case based on its timeline and workflow thresholds."""
    flags: list[Flag] = []
    timeline = case.get("timeline", [])
    status = case.get("status", "")

    if status == "closed":
        return flags

    thresholds = None
    if workflow_state:
        thresholds = workflow_state.get("escalation_thresholds")

    evidence_date = _find_evidence_requested_date(timeline)

    if thresholds and evidence_date:
        days_elapsed = (REFERENCE_DATE - evidence_date).days
        reminder_days = thresholds.get("reminder_days", 28)
        escalation_days = thresholds.get("escalation_days", 56)

        # Check escalation threshold first (more severe)
        if days_elapsed > escalation_days:
            overdue = days_elapsed - escalation_days
            flags.append(Flag(
                flag_type="escalation_overdue",
                message=f"Escalation {overdue} days overdue",
                severity="red",
                days_overdue=overdue,
            ))

        # Check reminder threshold
        if days_elapsed > reminder_days:
            overdue = days_elapsed - reminder_days
            flags.append(Flag(
                flag_type="reminder_overdue",
                message=f"Reminder {overdue} days overdue",
                severity="orange" if days_elapsed <= escalation_days else "red",
                days_overdue=overdue,
            ))

    # Check for evidence outstanding duration
    if evidence_date and status in ("awaiting_evidence", "escalated"):
        days_waiting = (REFERENCE_DATE - evidence_date).days
        if days_waiting > 56:
            flags.append(Flag(
                flag_type="evidence_overdue",
                message=f"Evidence overdue {days_waiting} days",
                severity="red",
                days_overdue=days_waiting,
            ))
        elif days_waiting > 28:
            flags.append(Flag(
                flag_type="evidence_overdue",
                message=f"Evidence outstanding {days_waiting} days",
                severity="orange",
                days_overdue=days_waiting,
            ))

    # Escalated status flag
    if status == "escalated":
        escalated_date = _find_escalated_date(timeline)
        if escalated_date:
            days_in_escalation = (REFERENCE_DATE - escalated_date).days
            if days_in_escalation > 14:
                flags.append(Flag(
                    flag_type="escalation_stale",
                    message=f"In escalation for {days_in_escalation} days",
                    severity="orange",
                    days_overdue=days_in_escalation,
                ))

    return flags
