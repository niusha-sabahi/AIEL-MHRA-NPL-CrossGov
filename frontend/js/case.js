import { fetchCase, fetchSummary, fetchObservations, fetchDrafts, approveAction, rejectAction } from './api.js';

const params = new URLSearchParams(window.location.search);
const caseId = params.get('id');

if (!caseId) {
  window.location.href = '/';
}

let caseData = null;

function formatCaseType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderHeader(data) {
  document.title = `${data.case_id} — Casework Assistant`;

  document.getElementById('case-title').textContent =
    `${data.case_id}  ·  ${data.applicant.name}  (${data.applicant.reference})`;

  document.getElementById('case-subtitle').textContent =
    `${formatCaseType(data.case_type)}  ·  ${formatStatus(data.status)}  ·  ${data.assigned_to.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`;

  const flagsEl = document.getElementById('case-flags');
  if (data.flags.length === 0) {
    flagsEl.innerHTML = '';
    return;
  }

  flagsEl.innerHTML = data.flags.map(f =>
    `<div class="flag flag--${f.severity}">${f.message}</div>`
  ).join('');
}

function renderTimeline(timeline) {
  const el = document.getElementById('timeline-content');
  el.innerHTML = timeline.map(t => {
    const isOverdue = t.note && (t.note.includes('overdue') || t.note.includes('was due'));
    return `
      <li class="timeline__item ${isOverdue ? 'timeline__item--overdue' : ''}">
        <div class="timeline__date">${formatDate(t.date)}</div>
        <div class="timeline__note">${t.note}</div>
      </li>
    `;
  }).join('');
}

function renderNotes(notes) {
  document.getElementById('notes-content').textContent = notes;
}

function renderPolicies(policies) {
  const el = document.getElementById('policy-content');
  if (policies.length === 0) {
    el.innerHTML = '<p style="color: #505a5f; font-size: 14px;">No matching policies.</p>';
    return;
  }
  el.innerHTML = policies.map(p => `
    <div class="policy-extract">
      <div class="policy-extract__id">${p.policy_id}</div>
      <div class="policy-extract__title">${p.title}</div>
      <div class="policy-extract__body">${p.body}</div>
    </div>
  `).join('');
}

function renderSummary(summary) {
  const el = document.getElementById('summary-content');
  if (!summary) {
    el.innerHTML = '<p style="color: #505a5f; font-size: 14px;">No summary available.</p>';
    return;
  }
  el.innerHTML = `<p style="font-size: 15px; line-height: 1.7;">${summary}</p>`;
}

function renderObservations(observations) {
  const el = document.getElementById('observations-content');
  if (!observations || observations.length === 0) {
    el.innerHTML = '<p style="color: #505a5f; font-size: 14px;">No observations.</p>';
    return;
  }
  el.innerHTML = observations.map(o => `
    <div class="observation observation--${o.severity}">
      <div>${o.text}</div>
      <div class="observation__source">Source: ${o.source}</div>
    </div>
  `).join('');
}

function showConfirm(title, text, onConfirm, confirmBtnClass = 'btn--green') {
  const popover = document.getElementById('confirm-popover');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;

  const okBtn = document.getElementById('confirm-ok');
  okBtn.className = `btn ${confirmBtnClass}`;

  popover.style.display = 'flex';

  return new Promise(resolve => {
    const cancel = () => { popover.style.display = 'none'; resolve(false); };
    const confirm = () => { popover.style.display = 'none'; resolve(true); };

    document.getElementById('confirm-cancel').onclick = cancel;
    okBtn.onclick = confirm;
    popover.onclick = (e) => { if (e.target === popover) cancel(); };
  });
}

function renderDrafts(drafts) {
  const el = document.getElementById('actions-content');

  if (!drafts || drafts.length === 0) {
    el.innerHTML = '<p style="color: #505a5f; font-size: 14px;">No actions require approval.</p>';
    return;
  }

  el.innerHTML = drafts.map((d, i) => `
    <div class="action-card" id="action-card-${i}" data-action-type="${d.action_type}">
      <div class="action-card__header">
        <span class="action-card__title">${d.title} <span class="ai-badge">AI</span></span>
        <span class="tag tag--blue">${d.recipient}</span>
      </div>
      <div class="action-card__body" id="action-body-${i}">${d.body}</div>
      <div class="action-card__buttons" id="action-buttons-${i}">
        <button class="btn btn--secondary" onclick="window.editDraft(${i})">Edit</button>
        <button class="btn btn--red" onclick="window.rejectDraft(${i})">Reject</button>
        <button class="btn btn--green" onclick="window.approveDraft(${i})">Approve &amp; Send</button>
      </div>
    </div>
  `).join('');
}

// Make action handlers global so inline onclick works
window.editDraft = function(index) {
  const bodyEl = document.getElementById(`action-body-${index}`);
  const buttonsEl = document.getElementById(`action-buttons-${index}`);
  const currentText = bodyEl.textContent;

  bodyEl.innerHTML = `<textarea class="action-card__editor" id="edit-textarea-${index}">${currentText}</textarea>`;
  buttonsEl.innerHTML = `
    <button class="btn btn--secondary" onclick="window.cancelEdit(${index}, ${JSON.stringify(currentText).replace(/"/g, '&quot;')})">Cancel</button>
    <button class="btn btn--green" onclick="window.approveDraft(${index}, true)">Approve edited draft</button>
  `;

  document.getElementById(`edit-textarea-${index}`).focus();
};

window.cancelEdit = function(index, originalText) {
  const bodyEl = document.getElementById(`action-body-${index}`);
  const buttonsEl = document.getElementById(`action-buttons-${index}`);

  bodyEl.innerHTML = originalText;
  buttonsEl.innerHTML = `
    <button class="btn btn--secondary" onclick="window.editDraft(${index})">Edit</button>
    <button class="btn btn--red" onclick="window.rejectDraft(${index})">Reject</button>
    <button class="btn btn--green" onclick="window.approveDraft(${index})">Approve &amp; Send</button>
  `;
};

window.approveDraft = async function(index, isEdited = false) {
  const card = document.getElementById(`action-card-${index}`);
  const actionType = card.dataset.actionType;

  const confirmed = await showConfirm(
    'Approve and send?',
    `Send this ${actionType.replace(/_/g, ' ')} to the recipient?`,
    null,
    'btn--green'
  );

  if (!confirmed) return;

  try {
    const result = await approveAction(caseId, actionType);
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    card.className = 'action-card action-card--approved';
    card.innerHTML = `
      <div class="action-card__status action-card__status--approved">
        &#10003; Sent at ${now} by Sarah Chen
        ${result.new_case_status ? `<br><em>Case status updated to: ${formatStatus(result.new_case_status)}</em>` : ''}
      </div>
    `;

    // Refresh case data to show updated timeline
    const updatedCase = await fetchCase(caseId);
    caseData = updatedCase;
    renderHeader(updatedCase);
    renderTimeline(updatedCase.timeline);
  } catch (err) {
    console.error('Approve failed:', err);
    alert('Failed to approve. Please try again.');
  }
};

window.rejectDraft = async function(index) {
  const card = document.getElementById(`action-card-${index}`);
  const actionType = card.dataset.actionType;

  const confirmed = await showConfirm(
    'Reject this draft?',
    "It won't be sent.",
    null,
    'btn--red'
  );

  if (!confirmed) return;

  try {
    await rejectAction(caseId, actionType);
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    card.className = 'action-card action-card--rejected';
    card.innerHTML = `
      <div class="action-card__status action-card__status--rejected">
        Rejected at ${now} by Sarah Chen
      </div>
    `;
  } catch (err) {
    console.error('Reject failed:', err);
    alert('Failed to reject. Please try again.');
  }
};

async function init() {
  try {
    // 1. Fetch deterministic data immediately
    caseData = await fetchCase(caseId);
    renderHeader(caseData);
    renderTimeline(caseData.timeline);
    renderNotes(caseData.case_notes);
    renderPolicies(caseData.policies);

    // 2. Fire three parallel agent calls
    fetchSummary(caseId).then(data => renderSummary(data.summary));
    fetchObservations(caseId).then(data => renderObservations(data.observations));
    fetchDrafts(caseId).then(data => renderDrafts(data.drafts));

  } catch (err) {
    console.error('Failed to load case:', err);
    document.getElementById('case-title').textContent = 'Error loading case';
  }
}

init();
