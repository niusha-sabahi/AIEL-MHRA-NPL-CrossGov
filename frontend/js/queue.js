import { fetchQueue } from './api.js';

let allCases = [];

function formatCaseType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderStats(cases) {
  const total = cases.length;
  const urgent = cases.filter(c => c.severity >= 3).length;
  const escalated = cases.filter(c => c.status === 'escalated').length;
  const pending = cases.filter(c => c.pending_actions_count > 0).length;

  document.getElementById('stats-bar').innerHTML = `
    <div class="stats-bar__counts">
      <span><strong>${total}</strong> cases</span>
      <span><strong>${urgent}</strong> need urgent action</span>
      <span><strong>${escalated}</strong> escalated</span>
      <span><strong>${pending}</strong> with pending actions</span>
    </div>
  `;
}

function renderQueue(cases) {
  const container = document.getElementById('queue-list');

  if (cases.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: #505a5f;">No cases match your filters.</div>';
    return;
  }

  container.innerHTML = cases.map(c => `
    <a href="/case?id=${c.case_id}" class="queue-row queue-row--${c.severity_colour}">
      <div class="queue-row__indicator indicator--${c.severity_colour}"></div>
      <div class="queue-row__main">
        <div class="queue-row__top">
          <span class="queue-row__case-id">${c.case_id}</span>
          <span class="queue-row__name">${c.applicant_name}</span>
        </div>
        <div class="queue-row__meta">
          ${formatCaseType(c.case_type)} · ${formatStatus(c.status)}
          ${c.pending_actions_count > 0 ? ` · <strong>${c.pending_actions_count} action${c.pending_actions_count > 1 ? 's' : ''} pending</strong>` : ''}
        </div>
        <div class="queue-row__headline">${c.headline}</div>
      </div>
      <div class="queue-row__chevron">&#8250;</div>
    </a>
  `).join('');
}

function applyFilters() {
  const typeFilter = document.getElementById('filter-type').value;
  const statusFilter = document.getElementById('filter-status').value;
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  let filtered = allCases;

  if (typeFilter) {
    filtered = filtered.filter(c => c.case_type === typeFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter(c => c.status === statusFilter);
  }
  if (searchTerm) {
    filtered = filtered.filter(c =>
      c.case_id.toLowerCase().includes(searchTerm) ||
      c.applicant_name.toLowerCase().includes(searchTerm) ||
      c.headline.toLowerCase().includes(searchTerm)
    );
  }

  renderQueue(filtered);
}

async function init() {
  try {
    allCases = await fetchQueue();
    renderStats(allCases);
    renderQueue(allCases);

    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);
  } catch (err) {
    console.error('Failed to load queue:', err);
    document.getElementById('queue-list').innerHTML =
      '<div style="padding: 40px; text-align: center; color: #d4351c;">Failed to load cases. Is the backend running?</div>';
  }
}

init();
