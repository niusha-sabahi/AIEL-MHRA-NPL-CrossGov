import { fetchCase, fetchSummary, fetchObservations, fetchDrafts, approveAction, rejectAction, completeAction, chatWithAI } from './api.js';

const params = new URLSearchParams(window.location.search);
const caseId = params.get('id');
if (!caseId) window.location.href = '/';

let caseData = null;
let draftsMap = {};
let chatHistories = {};

function fmt(type) { return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

function renderHeader(data) {
  document.title = `${data.case_id} — Casework Assistant`;
  document.getElementById('case-title').textContent = `${data.case_id}  ·  ${data.applicant.name}  (${data.applicant.reference})`;
  document.getElementById('case-subtitle').textContent = `${fmt(data.case_type)}  ·  ${fmt(data.status)}  ·  ${fmt(data.assigned_to)}`;
  document.getElementById('case-flags').innerHTML = data.flags.map(f => `<div class="flag flag--${f.severity}">${f.message}</div>`).join('');
}

function renderTimeline(timeline) {
  document.getElementById('timeline-content').innerHTML = timeline.map(t => {
    const overdue = t.note && (t.note.includes('overdue') || t.note.includes('was due'));
    return `<li class="timeline__item ${overdue ? 'timeline__item--overdue' : ''}"><div class="timeline__date">${fmtDate(t.date)}</div><div class="timeline__note">${t.note}</div></li>`;
  }).join('');
}

function renderNotes(notes) { document.getElementById('notes-content').textContent = notes; }

function renderPolicies(policies) {
  document.getElementById('policy-content').innerHTML = policies.length === 0
    ? '<p style="color:#505a5f;font-size:14px;">No matching policies.</p>'
    : policies.map(p => `<div class="policy-extract"><div class="policy-extract__id">${p.policy_id}</div><div class="policy-extract__title">${p.title}</div><div class="policy-extract__body">${p.body}</div></div>`).join('');
}

function renderSummary(summary) {
  document.getElementById('summary-content').innerHTML = summary
    ? `<p style="font-size:15px;line-height:1.7;">${summary}</p>`
    : '<p style="color:#505a5f;font-size:14px;">No summary available.</p>';
}

function renderObservations(obs) {
  document.getElementById('observations-content').innerHTML = (!obs || obs.length === 0)
    ? '<p style="color:#505a5f;font-size:14px;">No observations.</p>'
    : obs.map(o => `<div class="observation observation--${o.severity}"><div>${o.text}</div><div class="observation__source">Source: ${o.source}</div></div>`).join('');
}

function showConfirm(title, text, btnClass) {
  const pop = document.getElementById('confirm-popover');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  document.getElementById('confirm-ok').className = `btn ${btnClass}`;
  pop.style.display = 'flex';
  return new Promise(resolve => {
    const hide = (v) => { pop.style.display = 'none'; resolve(v); };
    document.getElementById('confirm-cancel').onclick = () => hide(false);
    document.getElementById('confirm-ok').onclick = () => hide(true);
    pop.onclick = (e) => { if (e.target === pop) hide(false); };
  });
}

function catLabel(cat) {
  return { A: 'Deterministic', B: 'AI Draft', C: 'Record', D: 'Future' }[cat] || cat;
}
function catColor(cat) {
  return { A: 'green', B: 'blue', C: 'grey', D: 'yellow' }[cat] || 'grey';
}

function renderAllActions(actions, drafts) {
  const el = document.getElementById('actions-content');
  if (!actions || actions.length === 0) {
    el.innerHTML = '<p style="color:#505a5f;font-size:14px;">No actions for this state.</p>';
    return;
  }

  // Build drafts lookup
  draftsMap = {};
  if (drafts) drafts.forEach(d => { draftsMap[d.action_type] = d; });

  el.innerHTML = actions.map((a, i) => {
    const id = a.action_type || `action_${i}`;
    const draft = a.category === 'B' && a.action_type ? draftsMap[a.action_type] : null;

    if (a.category === 'B' && draft) {
      return renderBCard(a, draft, i, id);
    } else if (a.category === 'B' && !draft) {
      return renderBCardNoDraft(a, i, id);
    } else if (a.category === 'D') {
      return renderDCard(a, i, id);
    } else {
      return renderACCard(a, i, id);
    }
  }).join('');
}

function renderBCard(a, draft, i, id) {
  return `
    <div class="action-card" id="card-${i}" data-action-type="${id}" data-index="${i}">
      <div class="action-card__header">
        <span class="action-card__title">${draft.title} <span class="ai-badge">AI</span></span>
        <span class="tag tag--blue">${draft.recipient}</span>
      </div>
      <div class="action-card__body" id="body-${i}">${draft.body}</div>
      <div class="action-card__buttons" id="btns-${i}">
        <button class="btn btn--secondary" onclick="window.toggleChat(${i})">Chat with AI</button>
        <button class="btn btn--secondary" onclick="window.editDraft(${i})">Edit</button>
        <button class="btn btn--red" onclick="window.rejectDraft(${i})">Reject</button>
        <button class="btn btn--green" onclick="window.approveDraft(${i})">Approve &amp; Send</button>
      </div>
      <div id="chat-${i}" class="chat-panel" style="display:none;">
        <div class="chat-messages" id="chat-msgs-${i}"></div>
        <div class="chat-input-row">
          <input type="text" class="chat-input" id="chat-in-${i}" placeholder="Ask AI to refine this draft..." onkeydown="if(event.key==='Enter')window.sendChat(${i})">
          <button class="btn btn--green" onclick="window.sendChat(${i})">Send</button>
        </div>
      </div>
    </div>`;
}

function renderBCardNoDraft(a, i, id) {
  return `
    <div class="action-card" id="card-${i}" data-action-type="${id}">
      <div class="action-card__header">
        <span class="action-card__title">${a.text} <span class="tag tag--${catColor('B')}">${catLabel('B')}</span></span>
      </div>
      <div class="action-card__body" style="color:#505a5f;font-style:italic;">Draft being prepared...</div>
    </div>`;
}

function renderACCard(a, i, id) {
  return `
    <div class="action-card" id="card-${i}" data-action-type="${id}" style="border-left:4px solid ${a.category === 'A' ? 'var(--govuk-green)' : 'var(--govuk-mid-grey)'}">
      <div class="action-card__header" style="padding:10px 20px;">
        <span style="font-size:14px;">${a.text} <span class="tag tag--${catColor(a.category)}">${catLabel(a.category)}</span></span>
        <button class="btn btn--secondary" style="font-size:12px;padding:4px 12px;" onclick="window.markComplete(${i},'${id}')">Mark done</button>
      </div>
    </div>`;
}

function renderDCard(a, i, id) {
  return `
    <div class="action-card" id="card-${i}" style="opacity:0.5;border-left:4px solid var(--govuk-yellow)">
      <div class="action-card__header" style="padding:10px 20px;">
        <span style="font-size:14px;">${a.text} <span class="tag tag--yellow">Not yet applicable</span></span>
      </div>
    </div>`;
}

// --- Global handlers ---

window.editDraft = function(i) {
  const body = document.getElementById(`body-${i}`);
  const btns = document.getElementById(`btns-${i}`);
  const txt = body.textContent;
  body.innerHTML = `<textarea class="action-card__editor" id="edit-${i}">${txt}</textarea>`;
  btns.innerHTML = `
    <button class="btn btn--secondary" onclick="window.cancelEdit(${i})">Cancel</button>
    <button class="btn btn--green" onclick="window.approveDraft(${i},true)">Approve edited draft</button>`;
  document.getElementById(`edit-${i}`).focus();
};

window.cancelEdit = function(i) {
  const card = document.getElementById(`card-${i}`);
  const at = card.dataset.actionType;
  const draft = draftsMap[at];
  if (!draft) return;
  document.getElementById(`body-${i}`).innerHTML = draft.body;
  document.getElementById(`btns-${i}`).innerHTML = `
    <button class="btn btn--secondary" onclick="window.toggleChat(${i})">Chat with AI</button>
    <button class="btn btn--secondary" onclick="window.editDraft(${i})">Edit</button>
    <button class="btn btn--red" onclick="window.rejectDraft(${i})">Reject</button>
    <button class="btn btn--green" onclick="window.approveDraft(${i})">Approve &amp; Send</button>`;
};

window.approveDraft = async function(i) {
  const card = document.getElementById(`card-${i}`);
  const at = card.dataset.actionType;
  if (!await showConfirm('Approve and send?', `Send this ${at.replace(/_/g,' ')} to the recipient?`, 'btn--green')) return;
  try {
    const res = await approveAction(caseId, at);
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    card.className = 'action-card action-card--approved';
    card.innerHTML = `<div class="action-card__status action-card__status--approved">&#10003; Sent at ${now} by Sarah Chen${res.new_case_status ? `<br><em>Case status updated to: ${fmt(res.new_case_status)}</em>` : ''}</div>`;
    const updated = await fetchCase(caseId);
    caseData = updated;
    renderHeader(updated);
    renderTimeline(updated.timeline);
  } catch (e) { alert('Failed to approve: ' + e.message); }
};

window.rejectDraft = async function(i) {
  const card = document.getElementById(`card-${i}`);
  const at = card.dataset.actionType;
  if (!await showConfirm('Reject this draft?', "It won't be sent.", 'btn--red')) return;
  try {
    await rejectAction(caseId, at);
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    card.className = 'action-card action-card--rejected';
    card.innerHTML = `<div class="action-card__status action-card__status--rejected">Rejected at ${now} by Sarah Chen</div>`;
  } catch (e) { alert('Failed to reject: ' + e.message); }
};

window.markComplete = async function(i, actionType) {
  const card = document.getElementById(`card-${i}`);
  try {
    await completeAction(caseId, actionType);
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    card.className = 'action-card action-card--approved';
    card.innerHTML = `<div class="action-card__status action-card__status--approved">&#10003; Completed at ${now} by Sarah Chen</div>`;
  } catch (e) { alert('Failed: ' + e.message); }
};

window.toggleChat = function(i) {
  const panel = document.getElementById(`chat-${i}`);
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') document.getElementById(`chat-in-${i}`).focus();
};

window.sendChat = async function(i) {
  const input = document.getElementById(`chat-in-${i}`);
  const msgsEl = document.getElementById(`chat-msgs-${i}`);
  const msg = input.value.trim();
  if (!msg) return;

  const card = document.getElementById(`card-${i}`);
  const at = card.dataset.actionType;
  const draft = draftsMap[at];
  const currentDraft = document.getElementById(`body-${i}`)?.textContent || draft?.body || '';

  if (!chatHistories[i]) chatHistories[i] = [];
  chatHistories[i].push({ role: 'user', content: msg });

  msgsEl.innerHTML += `<div class="chat-msg chat-msg--user"><strong>You:</strong> ${msg}</div>`;
  input.value = '';
  msgsEl.innerHTML += `<div class="chat-msg chat-msg--loading" id="loading-${i}">AI is thinking...</div>`;
  msgsEl.scrollTop = msgsEl.scrollHeight;

  try {
    const res = await chatWithAI(caseId, at, currentDraft, chatHistories[i]);
    document.getElementById(`loading-${i}`)?.remove();
    chatHistories[i].push({ role: 'assistant', content: res.reply });
    msgsEl.innerHTML += `<div class="chat-msg chat-msg--ai"><strong>AI:</strong> ${res.reply.replace(/\n/g, '<br>')}<button class="btn btn--secondary" style="font-size:11px;padding:2px 8px;margin-left:8px;" onclick="window.applyAISuggestion(${i}, this)">Apply to draft</button></div>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch (e) {
    document.getElementById(`loading-${i}`)?.remove();
    msgsEl.innerHTML += `<div class="chat-msg chat-msg--error">Error: ${e.message}</div>`;
  }
};

window.applyAISuggestion = function(i, btn) {
  const aiMsg = btn.parentElement;
  const text = aiMsg.textContent.replace('AI: ', '').replace('Apply to draft', '').trim();
  const bodyEl = document.getElementById(`body-${i}`);
  if (bodyEl) bodyEl.innerHTML = text;
};

async function init() {
  try {
    caseData = await fetchCase(caseId);
    renderHeader(caseData);
    renderTimeline(caseData.timeline);
    renderNotes(caseData.case_notes);
    renderPolicies(caseData.policies);

    fetchSummary(caseId).then(d => renderSummary(d.summary));
    fetchObservations(caseId).then(d => renderObservations(d.observations));
    fetchDrafts(caseId).then(d => renderAllActions(caseData.classified_actions, d.drafts));
  } catch (e) {
    document.getElementById('case-title').textContent = 'Error loading case';
  }
}

init();
