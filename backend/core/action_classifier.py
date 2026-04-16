from datetime import date, datetime

from backend.schemas.case_brief import ClassifiedAction

REFERENCE_DATE = date(2026, 4, 16)

# Keywords that indicate a Category B action (needs AI draft)
_B_KEYWORDS = [
    "send evidence request",
    "issue reminder",
    "draft decision",
    "include mandatory reconsideration",
    "brief team leader",
    "brief senior officer",
    "notify applicant",
    "acknowledge receipt",
    "draft decision with reasons",
    "notify applicant of outcome",
    "provide senior caseworker with full case summary",
    "issue licence or refusal notice",
    "draft outcome letter",
    "issue outcome letter",
]

# Maps action text patterns to action_type identifiers
_B_ACTION_TYPES: dict[str, str] = {
    "send evidence request": "evidence_request",
    "issue reminder": "reminder",
    "draft decision letter": "decision_letter",
    "draft decision with reasons": "decision_letter",
    "include mandatory reconsideration": "reconsideration_notice",
    "brief team leader": "escalation_briefing",
    "brief senior officer": "briefing_note",
    "notify applicant in writing": "outcome_notification",
    "notify applicant of outcome": "outcome_letter",
    "acknowledge receipt": "acknowledgement",
    "provide senior caseworker": "case_summary",
    "issue licence or refusal": "licence_notice",
    "draft outcome letter": "outcome_letter",
    "issue outcome letter": "outcome_letter",
}

# Keywords for Category C (record-only)
_C_KEYWORDS = [
    "log date",
    "log request date",
    "log escalation date",
    "log outcome",
    "update case record",
    "archive",
    "schedule follow-up",
]


def _parse_date(d: str) -> date:
    return datetime.strptime(d, "%Y-%m-%d").date()


def _find_evidence_date(timeline: list[dict]) -> date | None:
    for entry in reversed(timeline):
        if entry["event"] == "evidence_requested":
            return _parse_date(entry["date"])
    return None


def _is_conditional_and_not_applicable(action_text: str, case: dict, workflow_state: dict | None) -> bool:
    """Check if an action is conditional and not yet applicable."""
    text_lower = action_text.lower()
    timeline = case.get("timeline", [])
    evidence_date = _find_evidence_date(timeline)

    # "Issue reminder if evidence outstanding after 28 days" — only applicable if 28+ days
    if "reminder" in text_lower and "28 days" in text_lower:
        if evidence_date:
            days = (REFERENCE_DATE - evidence_date).days
            return days < 28
        return True  # No evidence requested yet

    # "Escalate to team leader if evidence outstanding after 56 days"
    if "escalate" in text_lower and "56 days" in text_lower:
        if evidence_date:
            days = (REFERENCE_DATE - evidence_date).days
            return days < 56
        return True

    # "Escalate to senior officer within 2 working days if serious breach"
    if "senior officer" in text_lower and "serious breach" in text_lower:
        notes = case.get("case_notes", "").lower()
        return "serious breach" not in notes and "breach" not in notes

    # "Include mandatory reconsideration notice if reducing or ceasing"
    if "reconsideration" in text_lower and ("reducing" in text_lower or "ceasing" in text_lower):
        notes = case.get("case_notes", "").lower()
        return "reduc" not in notes and "ceas" not in notes and "decrease" not in notes

    # "Obtain team leader sign-off if award increase exceeds £50"
    if "team leader sign-off" in text_lower and "£50" in text_lower:
        notes = case.get("case_notes", "").lower()
        return "increase" not in notes

    return False


def classify_actions(
    required_actions: list[str],
    case: dict,
    workflow_state: dict | None,
) -> list[ClassifiedAction]:
    """Classify each required action into A/B/C/D categories."""
    results: list[ClassifiedAction] = []

    for action_text in required_actions:
        text_lower = action_text.lower()

        # Check if it's a conditional action that isn't applicable yet
        if _is_conditional_and_not_applicable(action_text, case, workflow_state):
            results.append(ClassifiedAction(
                text=action_text,
                category="D",
                action_type=None,
                applicable=False,
            ))
            continue

        # Check Category B (needs AI draft)
        is_b = False
        matched_action_type = None
        for keyword, action_type in _B_ACTION_TYPES.items():
            if keyword in text_lower:
                is_b = True
                matched_action_type = action_type
                break

        if not is_b:
            for keyword in _B_KEYWORDS:
                if keyword in text_lower:
                    is_b = True
                    break

        if is_b:
            results.append(ClassifiedAction(
                text=action_text,
                category="B",
                action_type=matched_action_type,
                applicable=True,
            ))
            continue

        # Check Category C (record-only)
        is_c = any(kw in text_lower for kw in _C_KEYWORDS)
        if is_c:
            results.append(ClassifiedAction(
                text=action_text,
                category="C",
                action_type=None,
                applicable=True,
            ))
            continue

        # Default: Category A (deterministic/auto)
        results.append(ClassifiedAction(
            text=action_text,
            category="A",
            action_type=None,
            applicable=True,
        ))

    return results
