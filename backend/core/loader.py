import json
import copy
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent.parent

_cases: list[dict] = []
_policies: list[dict] = []
_workflow_states: dict = {}
_summaries: dict = {}
_observations: dict = {}
_drafts: dict = {}

# In-memory mutable state for the session (approvals, edits, state changes)
_action_states: dict[str, dict[str, str]] = {}  # case_id -> {action_type: "approved"/"rejected"}
_timeline_additions: dict[str, list[dict]] = {}  # case_id -> [extra timeline entries]
_status_overrides: dict[str, str] = {}  # case_id -> new status


def load_all() -> None:
    global _cases, _policies, _workflow_states
    global _summaries, _observations, _drafts

    data_dir = _BASE_DIR / "data"
    mocks_dir = _BASE_DIR / "mocks"

    with open(data_dir / "cases.json") as f:
        _cases = json.load(f)

    with open(data_dir / "policy-extracts.json") as f:
        _policies = json.load(f)

    with open(data_dir / "workflow-states.json") as f:
        _workflow_states = json.load(f)

    with open(mocks_dir / "summaries.json") as f:
        _summaries = json.load(f)

    with open(mocks_dir / "observations.json") as f:
        _observations = json.load(f)

    with open(mocks_dir / "drafts.json") as f:
        _drafts = json.load(f)


def get_cases() -> list[dict]:
    result = []
    for case in _cases:
        c = copy.deepcopy(case)
        if c["case_id"] in _status_overrides:
            c["status"] = _status_overrides[c["case_id"]]
        if c["case_id"] in _timeline_additions:
            c["timeline"] = c["timeline"] + _timeline_additions[c["case_id"]]
        result.append(c)
    return result


def get_case(case_id: str) -> dict | None:
    for case in _cases:
        if case["case_id"] == case_id:
            c = copy.deepcopy(case)
            if case_id in _status_overrides:
                c["status"] = _status_overrides[case_id]
            if case_id in _timeline_additions:
                c["timeline"] = c["timeline"] + _timeline_additions[case_id]
            return c
    return None


def get_policies() -> list[dict]:
    return _policies


def get_workflow_states() -> dict:
    return _workflow_states


def get_summary(case_id: str) -> str | None:
    return _summaries.get(case_id)


def get_observations(case_id: str) -> list[dict] | None:
    return _observations.get(case_id)


def get_drafts(case_id: str) -> dict | None:
    return _drafts.get(case_id)


def get_action_state(case_id: str, action_type: str) -> str | None:
    return _action_states.get(case_id, {}).get(action_type)


def set_action_state(case_id: str, action_type: str, state: str) -> None:
    if case_id not in _action_states:
        _action_states[case_id] = {}
    _action_states[case_id][action_type] = state


def add_timeline_entry(case_id: str, entry: dict) -> None:
    if case_id not in _timeline_additions:
        _timeline_additions[case_id] = []
    _timeline_additions[case_id].append(entry)


def set_status_override(case_id: str, new_status: str) -> None:
    _status_overrides[case_id] = new_status
