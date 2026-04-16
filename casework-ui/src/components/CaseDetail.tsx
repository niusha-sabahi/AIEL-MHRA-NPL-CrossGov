import { useState } from 'react'
import type { Case, PolicyExtract, WorkflowData, WorkflowState, AnalysisResult, Priority } from '../types'
import { analyseCase } from '../mockAnalyse'

interface Props {
  currentCase: Case
  policies: PolicyExtract[]
  workflow: WorkflowData
}

const TODAY = new Date('2026-04-16')

function daysSince(dateStr: string) {
  return Math.floor((TODAY.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  case_created: 'bg-gray-100 text-gray-700 border-gray-300',
  awaiting_evidence: 'bg-amber-100 text-amber-800 border-amber-300',
  under_review: 'bg-blue-100 text-blue-800 border-blue-300',
  pending_decision: 'bg-purple-100 text-purple-800 border-purple-300',
  escalated: 'bg-red-100 text-red-800 border-red-300',
  closed: 'bg-green-100 text-green-800 border-green-300',
}

const STATUS_LABELS: Record<string, string> = {
  case_created: 'Case Created',
  awaiting_evidence: 'Awaiting Evidence',
  under_review: 'Under Review',
  pending_decision: 'Pending Decision',
  escalated: 'Escalated',
  closed: 'Closed',
}

const TYPE_LABELS: Record<string, string> = {
  benefit_review: 'Benefit Review',
  licence_application: 'Licence Application',
  compliance_check: 'Compliance Check',
}

const TIMELINE_EVENT_LABEL: Record<string, string> = {
  case_created: 'Case created',
  evidence_requested: 'Evidence requested',
  evidence_received: 'Evidence received',
  evidence_verified: 'Evidence verified',
  under_review: 'Moved to under review',
  pending_decision: 'Decision pending',
  escalated: 'Escalated',
  closed: 'Case closed',
  site_visit: 'Site visit conducted',
  inspection_completed: 'Inspection completed',
  consultation_opened: 'Consultation opened',
}

const TIMELINE_ICON: Record<string, string> = {
  case_created: '📋',
  evidence_requested: '📤',
  evidence_received: '📥',
  evidence_verified: '✅',
  under_review: '🔍',
  pending_decision: '⏳',
  escalated: '🔺',
  closed: '✔',
  site_visit: '🏢',
  inspection_completed: '🏷',
  consultation_opened: '💬',
}

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-blue-100 text-blue-800 border-blue-300',
  high: 'bg-amber-100 text-amber-800 border-amber-300',
  urgent: 'bg-red-100 text-red-800 border-red-300',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

function getDeadlineWarnings(c: Case): Array<{ label: string; severity: 'warn' | 'danger' }> {
  const warnings: Array<{ label: string; severity: 'warn' | 'danger' }> = []
  if (c.status !== 'awaiting_evidence') return warnings

  const ev = c.timeline.find(e => e.event === 'evidence_requested')
  if (!ev) return warnings

  const days = daysSince(ev.date)
  if (days >= 56) {
    warnings.push({ label: `Evidence outstanding ${days} days — escalation threshold (56 days) exceeded`, severity: 'danger' })
  } else if (days >= 28) {
    warnings.push({ label: `Evidence outstanding ${days} days — reminder required (28-day threshold passed)`, severity: 'warn' })
  }

  return warnings
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-govuk-grey-3 mb-3 border-b border-gray-200 pb-1">
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function CaseDetail({ currentCase: c, policies, workflow }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [analysedCaseId, setAnalysedCaseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'policy' | 'analysis'>('overview')

  const matchedPolicies = policies.filter(p => p.applicable_case_types.includes(c.case_type))
  const caseWorkflow = workflow.case_types[c.case_type]
  const currentState: WorkflowState | undefined = caseWorkflow?.states.find(s => s.state === c.status)
  const deadlineWarnings = getDeadlineWarnings(c)

  async function handleAnalyse() {
    setAnalysing(true)
    setActiveTab('analysis')
    try {
      const result = await analyseCase(c)
      setAnalysis(result)
      setAnalysedCaseId(c.case_id)
    } finally {
      setAnalysing(false)
    }
  }

  // Reset analysis when case changes
  const showAnalysis = analysis && analysedCaseId === c.case_id

  const tabs: Array<{ key: typeof activeTab; label: string; badge?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline', badge: c.timeline.length },
    { key: 'policy', label: 'Policy & Workflow', badge: matchedPolicies.length },
    { key: 'analysis', label: 'AI Analysis', badge: showAnalysis ? 1 : undefined },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Case header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 pt-4 pb-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-govuk-grey-3">{c.case_id}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_STYLES[c.status]}`}
              >
                {STATUS_LABELS[c.status]}
              </span>
              {c.status === 'escalated' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-red-500 text-white border-red-600">
                  ESCALATED
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-govuk-black">{c.applicant.name}</h2>
            <p className="text-sm text-govuk-grey-3 mt-0.5">
              {TYPE_LABELS[c.case_type]} ·{' '}
              <span className="font-mono">{c.applicant.reference}</span> ·{' '}
              {c.assigned_to.replace(/_/g, ' ')}
            </p>
          </div>

          <button
            onClick={handleAnalyse}
            disabled={analysing}
            className="flex-shrink-0 flex items-center gap-2 bg-govuk-blue hover:bg-govuk-blue-dark text-white font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {analysing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analysing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.362.362A2 2 0 0116.95 19H7.05a2 2 0 01-1.414-.586l-.363-.363z" />
                </svg>
                Analyse Case
              </>
            )}
          </button>
        </div>

        {/* Deadline warnings */}
        {deadlineWarnings.map((w, i) => (
          <div
            key={i}
            className={`mb-2 px-3 py-2 rounded text-sm font-medium flex items-center gap-2 ${
              w.severity === 'danger'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span>{w.severity === 'danger' ? '⚠' : '⏰'}</span>
            {w.label}
          </div>
        ))}

        {/* Tabs */}
        <div className="flex gap-0 -mb-px mt-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-govuk-blue text-govuk-blue'
                  : 'border-transparent text-govuk-grey-3 hover:text-govuk-black hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-govuk-blue text-white' : 'bg-gray-200 text-govuk-grey-3'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <OverviewTab c={c} deadlineWarnings={deadlineWarnings} />
        )}
        {activeTab === 'timeline' && <TimelineTab c={c} />}
        {activeTab === 'policy' && (
          <PolicyTab matchedPolicies={matchedPolicies} currentState={currentState} c={c} />
        )}
        {activeTab === 'analysis' && (
          <AnalysisTab
            analysing={analysing}
            result={showAnalysis ? analysis : null}
            onAnalyse={handleAnalyse}
          />
        )}
      </div>
    </div>
  )
}

function OverviewTab({
  c,
  deadlineWarnings,
}: {
  c: Case
  deadlineWarnings: Array<{ label: string; severity: 'warn' | 'danger' }>
}) {
  return (
    <div className="max-w-2xl">
      <Section title="Applicant details">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Full name" value={c.applicant.name} />
          <InfoRow label="Reference" value={c.applicant.reference} mono />
          {c.applicant.date_of_birth && (
            <InfoRow label="Date of birth" value={formatDate(c.applicant.date_of_birth)} />
          )}
          <InfoRow label="Assigned team" value={c.assigned_to.replace(/_/g, ' ')} />
          <InfoRow label="Case opened" value={formatDate(c.created_date)} />
          <InfoRow label="Last updated" value={`${formatDate(c.last_updated)} (${daysSince(c.last_updated)}d ago)`} />
        </div>
      </Section>

      <Section title="Case notes">
        <p className="text-sm text-govuk-black leading-relaxed bg-govuk-grey-1 border border-gray-200 rounded p-4">
          {c.case_notes}
        </p>
      </Section>

      {deadlineWarnings.length > 0 && (
        <Section title="Deadline alerts">
          {deadlineWarnings.map((w, i) => (
            <div
              key={i}
              className={`p-3 rounded border text-sm mb-2 ${
                w.severity === 'danger'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {w.label}
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

function TimelineTab({ c }: { c: Case }) {
  return (
    <div className="max-w-2xl">
      <div className="relative">
        {c.timeline.map((event, idx) => (
          <div key={idx} className="flex gap-4 mb-6 relative">
            {/* Vertical line */}
            {idx < c.timeline.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
            )}
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-govuk-grey-1 border-2 border-gray-300 flex items-center justify-center text-sm z-10">
              {TIMELINE_ICON[event.event] ?? '•'}
            </div>
            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-govuk-black">
                  {TIMELINE_EVENT_LABEL[event.event] ?? event.event.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-govuk-grey-3 ml-auto">{formatDate(event.date)}</span>
              </div>
              <p className="text-sm text-govuk-grey-3">{event.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PolicyTab({
  matchedPolicies,
  currentState,
  c,
}: {
  matchedPolicies: PolicyExtract[]
  currentState: WorkflowState | undefined
  c: Case
}) {
  return (
    <div className="max-w-3xl">
      {/* Current workflow state */}
      {currentState && (
        <Section title="Current workflow state">
          <div className="bg-govuk-grey-1 border border-gray-200 rounded p-4 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-govuk-black">{currentState.label}</span>
              <span className="text-xs text-govuk-grey-3">— {c.case_type.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-govuk-grey-3 mb-3">{currentState.description}</p>

            <h4 className="text-xs font-bold uppercase text-govuk-grey-3 mb-2">Required actions</h4>
            <ul className="space-y-1">
              {currentState.required_actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-govuk-black">
                  <span className="text-govuk-blue mt-0.5 flex-shrink-0">→</span>
                  {action}
                </li>
              ))}
            </ul>

            {currentState.escalation_thresholds && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Escalation thresholds</h4>
                <div className="flex gap-4 text-sm">
                  {currentState.escalation_thresholds.reminder_days && (
                    <span className="text-amber-700">
                      Reminder after {currentState.escalation_thresholds.reminder_days} days
                    </span>
                  )}
                  {currentState.escalation_thresholds.escalation_days && (
                    <span className="text-red-700">
                      Escalate after {currentState.escalation_thresholds.escalation_days} days
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentState.allowed_transitions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Allowed next states</h4>
                <div className="flex flex-wrap gap-1">
                  {currentState.allowed_transitions.map(t => (
                    <span key={t} className="text-xs bg-white border border-gray-300 rounded px-2 py-0.5 text-govuk-grey-3">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Matched policies */}
      <Section title={`Matched policies (${matchedPolicies.length})`}>
        <div className="space-y-3">
          {matchedPolicies.map(p => (
            <div key={p.policy_id} className="border border-gray-200 rounded p-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-govuk-blue">{p.policy_id}</span>
                <span className="font-semibold text-sm text-govuk-black">{p.title}</span>
              </div>
              <p className="text-sm text-govuk-grey-3 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function AnalysisTab({
  analysing,
  result,
  onAnalyse,
}: {
  analysing: boolean
  result: AnalysisResult | null
  onAnalyse: () => void
}) {
  if (analysing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-govuk-grey-3">
        <svg className="animate-spin w-8 h-8 mb-4 text-govuk-blue" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm font-medium">Analysing case against policy database…</p>
        <p className="text-xs mt-1">POST /analyse → localhost:8000</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-govuk-grey-3">
        <div className="w-16 h-16 rounded-full bg-govuk-grey-1 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-govuk-grey-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.362.362A2 2 0 0116.95 19H7.05a2 2 0 01-1.414-.586l-.363-.363z" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1">No analysis yet</p>
        <p className="text-xs mb-4">Click 'Analyse Case' to send this case to the AI policy matcher.</p>
        <button
          onClick={onAnalyse}
          className="bg-govuk-blue text-white text-sm font-semibold px-4 py-2 rounded hover:bg-govuk-blue-dark transition-colors"
        >
          Analyse Case
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Mock disclaimer — only shown when server is unreachable and fallback was used */}
      {result._isMock && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">ℹ</span>
          <span>
            <strong>Server offline</strong> — Could not reach{' '}
            <code className="bg-amber-100 px-1 rounded">localhost:8000</code>. Start the AI server with{' '}
            <code className="bg-amber-100 px-1 rounded">npm run server</code> to get a real Claude-generated analysis.
          </span>
        </div>
      )}

      {/* Priority + policy match */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-gray-200 rounded p-3">
          <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Priority</div>
          <span className={`inline-block text-sm font-bold px-2 py-1 rounded border ${PRIORITY_STYLES[result.priority]}`}>
            {PRIORITY_LABELS[result.priority]}
          </span>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Matched Policy</div>
          <div className="font-mono text-sm font-bold text-govuk-blue">{result.matched_policy_id}</div>
          <div className="text-xs text-govuk-grey-3 truncate">{result.matched_policy_title}</div>
        </div>
      </div>

      {/* Summary */}
      <Section title="Case summary">
        <p className="text-sm text-govuk-black leading-relaxed bg-govuk-grey-1 rounded border border-gray-200 p-4">
          {result.summary}
        </p>
      </Section>

      {/* Flags */}
      {result.flags.length > 0 && (
        <Section title="Flags & alerts">
          <ul className="space-y-2">
            {result.flags.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded px-3 py-2"
              >
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recommendation */}
      <Section title="Recommendation">
        <p className="text-sm text-govuk-black leading-relaxed">{result.recommendation}</p>
      </Section>

      {/* Assignment */}
      <Section title="Assignment recommendation">
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded p-4">
          <svg className="w-5 h-5 text-govuk-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm text-blue-900">{result.assignment_recommendation}</p>
        </div>
      </Section>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold text-govuk-grey-3 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className={`text-sm text-govuk-black ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}