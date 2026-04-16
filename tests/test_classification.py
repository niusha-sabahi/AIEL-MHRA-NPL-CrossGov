import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core.action_classifier import classify_actions


def _make_case(days_since_evidence=91, status="awaiting_evidence", notes=""):
    """Helper: create a minimal case dict."""
    from datetime import date, timedelta
    ref_date = date(2026, 4, 16)
    ev_date = (ref_date - timedelta(days=days_since_evidence)).isoformat()
    return {
        "case_id": "TEST",
        "status": status,
        "timeline": [
            {"date": "2026-01-01", "event": "case_created", "note": ""},
            {"date": ev_date, "event": "evidence_requested", "note": ""},
        ],
        "case_notes": notes,
    }


def test_send_evidence_request_is_category_b():
    actions = ["Send evidence request to applicant"]
    case = _make_case()
    result = classify_actions(actions, case, None)
    assert result[0].category == "B"
    assert result[0].action_type == "evidence_request"


def test_draft_decision_is_category_b():
    actions = ["Draft decision letter"]
    case = _make_case(status="pending_decision")
    result = classify_actions(actions, case, None)
    assert result[0].category == "B"
    assert result[0].action_type == "decision_letter"


def test_log_date_is_category_c():
    actions = ["Log date of evidence request"]
    case = _make_case()
    result = classify_actions(actions, case, None)
    assert result[0].category == "C"


def test_archive_is_category_c():
    actions = ["Archive all evidence and documentation"]
    case = _make_case()
    result = classify_actions(actions, case, None)
    assert result[0].category == "C"


def test_identity_check_is_category_a():
    actions = ["Confirm applicant identity against records"]
    case = _make_case()
    result = classify_actions(actions, case, None)
    assert result[0].category == "A"


def test_verify_evidence_is_category_a():
    actions = ["Verify all evidence meets requirements"]
    case = _make_case()
    result = classify_actions(actions, case, None)
    assert result[0].category == "A"


def test_reminder_not_applicable_before_28_days():
    """If evidence was requested only 10 days ago, reminder is category D."""
    actions = ["Issue reminder if evidence outstanding after 28 days"]
    case = _make_case(days_since_evidence=10)
    ws = {"state": "awaiting_evidence", "escalation_thresholds": {"reminder_days": 28, "escalation_days": 56}}
    result = classify_actions(actions, case, ws)
    assert result[0].category == "D"
    assert result[0].applicable is False


def test_reminder_applicable_after_28_days():
    """If evidence was requested 35 days ago, reminder is category B."""
    actions = ["Issue reminder if evidence outstanding after 28 days"]
    case = _make_case(days_since_evidence=35)
    ws = {"state": "awaiting_evidence", "escalation_thresholds": {"reminder_days": 28, "escalation_days": 56}}
    result = classify_actions(actions, case, ws)
    assert result[0].category == "B"


def test_brief_team_leader_is_category_b():
    actions = ["Brief team leader on case history and reason for escalation"]
    case = _make_case(status="escalated")
    result = classify_actions(actions, case, None)
    assert result[0].category == "B"
    assert result[0].action_type == "escalation_briefing"


def test_multiple_actions_classified_correctly():
    actions = [
        "Confirm applicant identity against records",
        "Send evidence request to applicant",
        "Log date of evidence request",
        "Issue reminder if evidence outstanding after 28 days",
    ]
    case = _make_case(days_since_evidence=10)
    ws = {"state": "awaiting_evidence", "escalation_thresholds": {"reminder_days": 28, "escalation_days": 56}}
    result = classify_actions(actions, case, ws)

    assert result[0].category == "A"  # identity check
    assert result[1].category == "B"  # evidence request
    assert result[2].category == "C"  # log date
    assert result[3].category == "D"  # reminder (not yet applicable)
