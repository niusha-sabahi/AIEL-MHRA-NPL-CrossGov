import type { Case } from '../types'
import type { User } from '../auth'

interface Props {
  cases: Case[]
  user: User
  onViewCase: (c: Case) => void
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

export default function TeamLeaderDashboard({ cases, user, onViewCase }: Props) {
  const teamCases = cases.filter(c => c.assigned_to === user.team)
  
  const metrics = {
    total: teamCases.length,
    escalated: teamCases.filter(c => c.status === 'escalated').length,
    overdue: teamCases.filter(isOverdue).length,
    awaitingEvidence: teamCases.filter(c => c.status === 'awaiting_evidence').length,
    underReview: teamCases.filter(c => c.status === 'under_review').length,
    pendingDecision: teamCases.filter(c => c.status === 'pending_decision').length,
    closed: teamCases.filter(c => c.status === 'closed').length,
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
    <div className="flex-1 overflow-y-auto bg-govuk-grey-1">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-govuk-black">Team Leader Dashboard</h1>
        <p className="text-sm text-govuk-grey-3 mt-1">
          {user.name} · {user.team?.replace(/_/g, ' ')}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Total Cases"
            value={metrics.total}
            color="blue"
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
                <button
                  key={c.case_id}
                  onClick={() => onViewCase(c)}
                  className="w-full text-left p-3 border border-gray-200 rounded hover:bg-blue-50 hover:border-govuk-blue transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
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
                      </div>
                      <div className="font-semibold text-sm text-govuk-black">{c.applicant.name}</div>
                      <div className="text-xs text-govuk-grey-3 mt-1">
                        {TYPE_LABELS[c.case_type]} · {STATUS_LABELS[c.status]} · Updated {daysSince(c.last_updated)}d ago
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-govuk-black mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map(c => (
              <button
                key={c.case_id}
                onClick={() => onViewCase(c)}
                className="w-full text-left p-3 border border-gray-200 rounded hover:bg-blue-50 hover:border-govuk-blue transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-govuk-grey-3">{c.case_id}</span>
                      <span className="text-xs text-govuk-grey-3">·</span>
                      <span className="text-xs text-govuk-grey-3">{c.applicant.name}</span>
                    </div>
                    <div className="text-xs text-govuk-grey-3">
                      {TYPE_LABELS[c.case_type]} · {STATUS_LABELS[c.status]} · Updated {daysSince(c.last_updated)}d ago
                    </div>
                  </div>
                </div>
              </button>
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
