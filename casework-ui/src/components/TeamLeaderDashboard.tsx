import { useState } from 'react'
import type { Case } from '../types'
import type { User } from '../auth'
import { MOCK_USERS } from '../auth'

interface Props {
  cases: Case[]
  user: User
  onViewCase: (c: Case) => void
  onAssignCase: (caseId: string, caseworkerId: string) => void
}

const TODAY = new Date('2026-04-16')

function daysSince(dateStr: string) {
  return Math.floor((TODAY.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function isOverdue(c: Case): boolean {
  if (c.status !== 'awaiting_evidence') return false
  const ev = c.timeline.find(e => e.event === 'evidence_requested')
  if (!ev) return false
  return daysSince(ev.date) > 28
}

const STATUS_LABELS: Record<string, string> = {
  case_created: 'Created',
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

export default function TeamLeaderDashboard({ cases, user, onViewCase, onAssignCase }: Props) {
  const [assigningCase, setAssigningCase] = useState<string | null>(null)
  
  const teamCases = cases.filter(c => c.assigned_to === user.team)
  const teamCaseworkers = MOCK_USERS.filter(u => u.role === 'caseworker' && u.team === user.team)
  
  const metrics = {
    total: teamCases.length,
    escalated: teamCases.filter(c => c.status === 'escalated').length,
    overdue: teamCases.filter(isOverdue).length,
    awaitingEvidence: teamCases.filter(c => c.status === 'awaiting_evidence').length,
    underReview: teamCases.filter(c => c.status === 'under_review').length,
    pendingDecision: teamCases.filter(c => c.status === 'pending_decision').length,
    closed: teamCases.filter(c => c.status === 'closed').length,
    unassigned: teamCases.filter(c => !c.assigned_caseworker).length,
  }

  const handleAssign = (caseId: string, caseworkerId: string) => {
    onAssignCase(caseId, caseworkerId)
    setAssigningCase(null)
  }

  const getCaseworkerName = (caseworkerId?: string) => {
    if (!caseworkerId) return 'Unassigned'
    const caseworker = teamCaseworkers.find(cw => cw.id === caseworkerId)
    return caseworker?.name || 'Unknown'
  }

  const riskCases = teamCases.filter(c => c.status === 'escalated' || isOverdue(c))
  const recentActivity = [...teamCases]
    .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
    .slice(0, 10)

  const casesByType = {
    benefit_review: teamCases.filter(c => c.case_type === 'benefit_review').length,
    licence_application: teamCases.filter(c => c.case_type === 'licence_application').length,
    compliance_check: teamCases.filter(c => c.case_type === 'compliance_check').length,
  }

  return (
    <div className="h-full overflow-y-auto bg-govuk-grey-1">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-govuk-black">Team Leader Dashboard</h1>
        <p className="text-sm text-govuk-grey-3 mt-1">
          {user.name} · {user.team?.replace(/_/g, ' ')}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard
            label="Total Cases"
            value={metrics.total}
            color="blue"
          />
          <MetricCard
            label="Unassigned"
            value={metrics.unassigned}
            color="amber"
            alert={metrics.unassigned > 0}
          />
          <MetricCard
            label="Escalated"
            value={metrics.escalated}
            color="red"
            alert={metrics.escalated > 0}
          />
          <MetricCard
            label="Overdue"
            value={metrics.overdue}
            color="amber"
            alert={metrics.overdue > 0}
          />
          <MetricCard
            label="Closed This Period"
            value={metrics.closed}
            color="green"
          />
        </div>

        {/* Unassigned Cases - Prominent Section */}
        {metrics.unassigned > 0 && (
          <div className="bg-amber-50 rounded-lg border-2 border-amber-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-600 text-xl">⚠</span>
              <h2 className="text-lg font-bold text-govuk-black">Unassigned Cases ({metrics.unassigned})</h2>
              <span className="text-sm text-amber-700 ml-2">— Assign these cases to your team</span>
            </div>
            <div className="space-y-2">
              {teamCases.filter(c => !c.assigned_caseworker).map(c => (
                <div
                  key={c.case_id}
                  className="p-3 bg-white border border-amber-200 rounded hover:border-amber-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onViewCase(c)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-govuk-grey-3">{c.case_id}</span>
                        <span className="font-semibold text-sm text-govuk-black">{c.applicant.name}</span>
                        {c.status === 'escalated' && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            Escalated
                          </span>
                        )}
                        {isOverdue(c) && (
                          <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-govuk-grey-3">
                        {TYPE_LABELS[c.case_type]} · {STATUS_LABELS[c.status]} · Updated {daysSince(c.last_updated)}d ago
                      </div>
                    </button>
                    <div className="flex-shrink-0">
                      {assigningCase === c.case_id ? (
                        <div className="flex flex-col gap-1 bg-white p-2 rounded border border-govuk-blue shadow-lg">
                          <div className="text-xs font-semibold text-govuk-grey-3 mb-1">Assign to:</div>
                          {teamCaseworkers.map(cw => (
                            <button
                              key={cw.id}
                              onClick={() => handleAssign(c.case_id, cw.id)}
                              className="text-xs px-3 py-1.5 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap text-left"
                            >
                              {cw.name}
                            </button>
                          ))}
                          <button
                            onClick={() => setAssigningCase(null)}
                            className="text-xs px-3 py-1.5 bg-gray-200 text-govuk-grey-3 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningCase(c.case_id)}
                          className="text-sm font-semibold px-4 py-2 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Assign Case
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-govuk-black mb-4">Status Breakdown</h2>
          <div className="grid grid-cols-4 gap-4">
            <StatusBar label="Awaiting Evidence" count={metrics.awaitingEvidence} total={metrics.total} color="amber" />
            <StatusBar label="Under Review" count={metrics.underReview} total={metrics.total} color="blue" />
            <StatusBar label="Pending Decision" count={metrics.pendingDecision} total={metrics.total} color="purple" />
            <StatusBar label="Closed" count={metrics.closed} total={metrics.total} color="green" />
          </div>
        </div>

        {/* Case Type Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-govuk-black mb-4">Case Type Distribution</h2>
          <div className="space-y-3">
            <TypeBar label="Benefit Review" count={casesByType.benefit_review} total={metrics.total} color="blue" />
            <TypeBar label="Licence Application" count={casesByType.licence_application} total={metrics.total} color="purple" />
            <TypeBar label="Compliance Check" count={casesByType.compliance_check} total={metrics.total} color="orange" />
          </div>
        </div>

        {/* Risk Cases */}
        {riskCases.length > 0 && (
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-600 text-xl">⚠</span>
              <h2 className="text-lg font-bold text-govuk-black">Cases Requiring Attention ({riskCases.length})</h2>
            </div>
            <div className="space-y-2">
              {riskCases.map(c => (
                <div
                  key={c.case_id}
                  className="p-3 border border-gray-200 rounded hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onViewCase(c)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-govuk-grey-3">{c.case_id}</span>
                        {c.status === 'escalated' && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            Escalated
                          </span>
                        )}
                        {isOverdue(c) && (
                          <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            Overdue
                          </span>
                        )}
                        {!c.assigned_caseworker && (
                          <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded font-medium">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-sm text-govuk-black">{c.applicant.name}</div>
                      <div className="text-xs text-govuk-grey-3 mt-1">
                        {TYPE_LABELS[c.case_type]} · {STATUS_LABELS[c.status]} · Updated {daysSince(c.last_updated)}d ago
                      </div>
                    </button>
                    <div className="flex-shrink-0">
                      {assigningCase === c.case_id ? (
                        <div className="flex flex-col gap-1">
                          {teamCaseworkers.map(cw => (
                            <button
                              key={cw.id}
                              onClick={() => handleAssign(c.case_id, cw.id)}
                              className="text-xs px-2 py-1 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap"
                            >
                              {cw.name}
                            </button>
                          ))}
                          <button
                            onClick={() => setAssigningCase(null)}
                            className="text-xs px-2 py-1 bg-gray-200 text-govuk-grey-3 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningCase(c.case_id)}
                          className="text-xs px-2 py-1 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap"
                        >
                          {c.assigned_caseworker ? 'Reassign' : 'Assign'}
                        </button>
                      )}
                    </div>
                  </div>
                  {c.assigned_caseworker && (
                    <div className="text-xs text-govuk-grey-3 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Assigned to: {getCaseworkerName(c.assigned_caseworker)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-govuk-black mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map(c => (
              <div
                key={c.case_id}
                className="p-3 border border-gray-200 rounded hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onViewCase(c)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-govuk-grey-3">{c.case_id}</span>
                      <span className="text-xs text-govuk-grey-3">·</span>
                      <span className="text-xs text-govuk-grey-3">{c.applicant.name}</span>
                      {!c.assigned_caseworker && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded font-medium">
                          Unassigned
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-govuk-grey-3">
                      {TYPE_LABELS[c.case_type]} · {STATUS_LABELS[c.status]} · Updated {daysSince(c.last_updated)}d ago
                    </div>
                  </button>
                  <div className="flex-shrink-0">
                    {assigningCase === c.case_id ? (
                      <div className="flex flex-col gap-1">
                        {teamCaseworkers.map(cw => (
                          <button
                            key={cw.id}
                            onClick={() => handleAssign(c.case_id, cw.id)}
                            className="text-xs px-2 py-1 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap"
                          >
                            {cw.name}
                          </button>
                        ))}
                        <button
                          onClick={() => setAssigningCase(null)}
                          className="text-xs px-2 py-1 bg-gray-200 text-govuk-grey-3 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningCase(c.case_id)}
                        className="text-xs px-2 py-1 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap"
                      >
                        {c.assigned_caseworker ? 'Reassign' : 'Assign'}
                      </button>
                    )}
                  </div>
                </div>
                {c.assigned_caseworker && (
                  <div className="text-xs text-govuk-grey-3 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Assigned to: {getCaseworkerName(c.assigned_caseworker)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Team Workload - All Cases with Assignment */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-govuk-black mb-4">Team Workload - All Cases</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {teamCases.map(c => (
              <div
                key={c.case_id}
                className="p-3 border border-gray-200 rounded hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onViewCase(c)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-govuk-grey-3">{c.case_id}</span>
                      <span className="text-xs text-govuk-grey-3">·</span>
                      <span className="text-xs font-semibold text-govuk-black">{c.applicant.name}</span>
                      {!c.assigned_caseworker && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded font-medium">
                          Unassigned
                        </span>
                      )}
                      {c.status === 'escalated' && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          Escalated
                        </span>
                      )}
                      {isOverdue(c) && (
                        <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-govuk-grey-3">
                      {TYPE_LABELS[c.case_type]} · {STATUS_LABELS[c.status]} · Updated {daysSince(c.last_updated)}d ago
                    </div>
                  </button>
                  <div className="flex-shrink-0">
                    {assigningCase === c.case_id ? (
                      <div className="flex flex-col gap-1">
                        {teamCaseworkers.map(cw => (
                          <button
                            key={cw.id}
                            onClick={() => handleAssign(c.case_id, cw.id)}
                            className="text-xs px-2 py-1 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap"
                          >
                            {cw.name}
                          </button>
                        ))}
                        <button
                          onClick={() => setAssigningCase(null)}
                          className="text-xs px-2 py-1 bg-gray-200 text-govuk-grey-3 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningCase(c.case_id)}
                        className="text-xs px-2 py-1 bg-govuk-blue text-white rounded hover:bg-govuk-blue-dark whitespace-nowrap"
                      >
                        {c.assigned_caseworker ? 'Reassign' : 'Assign'}
                      </button>
                    )}
                  </div>
                </div>
                {c.assigned_caseworker && (
                  <div className="text-xs text-govuk-grey-3 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Assigned to: {getCaseworkerName(c.assigned_caseworker)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, color, alert }: { label: string; value: number; color: string; alert?: boolean }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    green: 'bg-green-50 border-green-200 text-green-900',
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      {alert && <div className="text-2xl mb-1">⚠</div>}
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  const colorClasses = {
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-600',
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-govuk-black">{label}</span>
        <span className="text-govuk-grey-3">{count}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function TypeBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  const colorClasses = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-govuk-black">{label}</span>
        <span className="text-govuk-grey-3">{count} ({percentage}%)</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
