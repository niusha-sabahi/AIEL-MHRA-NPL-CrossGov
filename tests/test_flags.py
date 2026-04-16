import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core.flag_calculator import calculate_flags


def test_case_past_escalation_threshold():
    """CASE-2026-00042: evidence requested 91 days ago, thresholds 28/56."""
    case = {
        "case_id": "CASE-2026-00042",
        "status": "awaiting_evidence",
        "timeline": [
            {"date": "2026-01-10", "event": "case_created", "note": ""},
            {"date": "2026-01-15", "event": "evidence_requested", "note": ""},
            {"date": "2026-02-02", "event": "evidence_received", "note": "Partial"},
        ],
        "case_notes": "",
    }
    ws = {
        "state": "awaiting_evidence",
        "escalation_thresholds": {"reminder_days": 28, "escalation_days": 56},
    }

    flags = calculate_flags(case, ws)
    flag_types = [f.flag_type for f in flags]

    assert "escalation_overdue" in flag_types
    assert "reminder_overdue" in flag_types
    assert "evidence_overdue" in flag_types

    escalation_flag = next(f for f in flags if f.flag_type == "escalation_overdue")
    assert escalation_flag.severity == "red"
    assert escalation_flag.days_overdue > 0


def test_case_within_thresholds():
    """CASE-2026-00158: evidence requested ~42 days ago, threshold 28."""
    case = {
        "case_id": "CASE-2026-00158",
        "status": "awaiting_evidence",
        "timeline": [
            {"date": "2026-02-28", "event": "case_created", "note": ""},
            {"date": "2026-03-05", "event": "evidence_requested", "note": ""},
        ],
        "case_notes": "",
    }
    ws = {
        "state": "awaiting_evidence",
        "escalation_thresholds": {"reminder_days": 28, "escalation_days": 56},
    }

    flags = calculate_flags(case, ws)
    flag_types = [f.flag_type for f in flags]

    # Should have reminder overdue (42 > 28) but not escalation (42 < 56)
    assert "reminder_overdue" in flag_types
    assert "escalation_overdue" not in flag_types


def test_closed_case_no_flags():
    """CASE-2026-00172: closed case should have no flags."""
    case = {
        "case_id": "CASE-2026-00172",
        "status": "closed",
        "timeline": [
            {"date": "2026-01-05", "event": "case_created", "note": ""},
            {"date": "2026-02-28", "event": "closed", "note": ""},
        ],
        "case_notes": "",
    }
    ws = {"state": "closed"}

    flags = calculate_flags(case, ws)
    assert len(flags) == 0


def test_escalated_case_with_stale_escalation():
    """CASE-2026-00214: escalated 87+ days ago, should flag stale escalation."""
    case = {
        "case_id": "CASE-2026-00214",
        "status": "escalated",
        "timeline": [
            {"date": "2025-11-10", "event": "case_created", "note": ""},
            {"date": "2025-11-17", "event": "evidence_requested", "note": ""},
            {"date": "2026-01-20", "event": "escalated", "note": ""},
        ],
        "case_notes": "",
    }
    ws = {
        "state": "escalated",
        "escalation_thresholds": {"reminder_days": 28, "escalation_days": 56},
    }

    flags = calculate_flags(case, ws)
    flag_types = [f.flag_type for f in flags]

    assert "escalation_stale" in flag_types
    assert "evidence_overdue" in flag_types
