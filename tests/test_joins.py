import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core import loader
from backend.core.joiner import get_matching_policies, get_workflow_state

# Load data once for all tests
loader.load_all()


def test_benefit_review_policies():
    """Benefit review cases should match POL-BR-* policies."""
    policies = get_matching_policies("benefit_review")
    policy_ids = [p["policy_id"] for p in policies]

    assert "POL-BR-001" in policy_ids
    assert "POL-BR-002" in policy_ids
    assert "POL-BR-003" in policy_ids
    assert "POL-BR-004" in policy_ids
    # Should NOT include licence or compliance policies
    assert all(not pid.startswith("POL-LA") for pid in policy_ids)
    assert all(not pid.startswith("POL-CC") for pid in policy_ids)


def test_licence_application_policies():
    """Licence application cases should match POL-LA-* policies."""
    policies = get_matching_policies("licence_application")
    policy_ids = [p["policy_id"] for p in policies]

    assert "POL-LA-001" in policy_ids
    assert "POL-LA-002" in policy_ids
    assert "POL-LA-003" in policy_ids
    assert all(not pid.startswith("POL-BR") for pid in policy_ids)


def test_compliance_check_policies():
    """Compliance check cases should match POL-CC-* policies."""
    policies = get_matching_policies("compliance_check")
    policy_ids = [p["policy_id"] for p in policies]

    assert "POL-CC-001" in policy_ids
    assert "POL-CC-002" in policy_ids
    assert "POL-CC-003" in policy_ids


def test_workflow_state_awaiting_evidence():
    """Should return correct workflow state for benefit_review + awaiting_evidence."""
    ws = get_workflow_state("benefit_review", "awaiting_evidence")
    assert ws is not None
    assert ws["state"] == "awaiting_evidence"
    assert "escalation_thresholds" in ws
    assert ws["escalation_thresholds"]["reminder_days"] == 28
    assert ws["escalation_thresholds"]["escalation_days"] == 56


def test_workflow_state_not_found():
    """Should return None for nonexistent case_type/status."""
    ws = get_workflow_state("nonexistent", "whatever")
    assert ws is None


def test_workflow_state_closed():
    """Closed state should have empty allowed_transitions."""
    ws = get_workflow_state("benefit_review", "closed")
    assert ws is not None
    assert ws["allowed_transitions"] == []
