const API_BASE = '/api';

export async function fetchQueue() {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error(`Failed to fetch queue: ${res.status}`);
  return res.json();
}

export async function fetchCase(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch case: ${res.status}`);
  return res.json();
}

export async function fetchSummary(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/agents/summary`);
  if (!res.ok) throw new Error(`Failed to fetch summary: ${res.status}`);
  return res.json();
}

export async function fetchObservations(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/agents/observations`);
  if (!res.ok) throw new Error(`Failed to fetch observations: ${res.status}`);
  return res.json();
}

export async function fetchDrafts(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/agents/drafts`);
  if (!res.ok) throw new Error(`Failed to fetch drafts: ${res.status}`);
  return res.json();
}

export async function approveAction(caseId, actionType) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/actions/${actionType}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to approve: ${res.status}`);
  return res.json();
}

export async function rejectAction(caseId, actionType) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/actions/${actionType}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to reject: ${res.status}`);
  return res.json();
}

export async function editAction(caseId, actionType, editedBody) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/actions/${actionType}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edited_body: editedBody }),
  });
  if (!res.ok) throw new Error(`Failed to edit: ${res.status}`);
  return res.json();
}

export async function completeAction(caseId, actionType) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/actions/${actionType}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to complete: ${res.status}`);
  return res.json();
}

export async function chatWithAI(caseId, actionType, currentDraft, messages) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      case_id: caseId,
      action_type: actionType,
      current_draft: currentDraft,
      messages: messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat failed: ${err}`);
  }
  return res.json();
}
