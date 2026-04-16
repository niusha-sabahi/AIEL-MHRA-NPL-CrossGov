from backend.core import loader


def get_matching_policies(case_type: str) -> list[dict]:
    """Return all policy extracts whose applicable_case_types includes this case_type."""
    return [
        p for p in loader.get_policies()
        if case_type in p.get("applicable_case_types", [])
    ]


def get_workflow_state(case_type: str, status: str) -> dict | None:
    """Return the workflow state definition for this case_type + status."""
    ws = loader.get_workflow_states()
    case_type_def = ws.get("case_types", {}).get(case_type)
    if not case_type_def:
        return None
    for state_def in case_type_def.get("states", []):
        if state_def["state"] == status:
            return state_def
    return None
