import type { Case } from '../types'
import type { User } from '../auth'

interface Props {
  cases: Case[]
  user: User
}

const TODAY = new Date('2026-04-16')

function daysSince(dateStr: string) {
  return Math.floor((TODAY.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_INFO: Record<string, { label: string; description: string; color: string }> = {
  case_created: {
    label: 'Application Received',
    description: 'Your application has been received and is being processed.',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  awaiting_evidence: {
    label: 'Awaiting Information',
    description: 'We are waiting for additional information from you. Please check your correspondence.',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  under_review: {
    label: 'Under Review',
    description: 'Your case is currently being reviewed by a caseworker.',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  pending_decision: {
    label: 'Decision Pending',
    description: 'A decision is being prepared. You will be notified shortly.',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  escalated: {
    label: 'Escalated for Review',
    description: 'Your case has been escalated to a senior officer for additional review.',
    color: 'bg-red-100 text-red-800 border-red-300',
  },
  closed: {
    label: 'Case Closed',
    description: 'A decision has been made. You should have received notification by post.',
    color: 'bg-green-100 text-green-800 border-green-300',
  },
}

const TIMELINE_EVENT_LABEL: Record<string, string> = {
  case_created: 'Application received',
  evidence_requested: 'Information requested',
  evidence_received: 'Information received',
  evidence_verified: 'Information verified',
  under_review: 'Review started',
  pending_decision: 'Decision being prepared',
  escalated: 'Escalated for senior review',
  closed: 'Decision issued',
  site_visit: 'Site visit conducted',
  inspection_completed: 'Inspection completed',
  consultation_opened: 'Consultation opened',
}

const TYPE_LABELS: Record<string, string> = {
  benefit_review: 'Benefit Review',
  licence_application: 'Licence Application',
  compliance_check: 'Compliance Check',
}

export default function ApplicantView({ cases, user }: Props) {
  const userCases = cases.filter(c => c.applicant.reference === user.applicantRef)

  if (userCases.length === 0) {
    return (
      <div className="min-h-screen bg-govuk-grey-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-govuk-black mb-2">No Active Cases</h2>
          <p className="text-sm text-govuk-grey-3">
            You do not currently have any active cases in the system.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-govuk-grey-1">
      {/* Header */}
      <div className="bg-govuk-blue text-white px-6 py-6">
        <h1 className="text-2xl font-bold mb-1">Your Cases</h1>
        <p className="text-sm opacity-90">{user.name} · Reference: {user.applicantRef}</p>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {userCases.map(c => {
          const statusInfo = STATUS_INFO[c.status]
          const lastUpdate = c.timeline[c.timeline.length - 1]

          return (
            <div key={c.case_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Case Header */}
              <div className="bg-govuk-grey-1 px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-govuk-black">{TYPE_LABELS[c.case_type]}</h2>
                    <p className="text-sm text-govuk-grey-3">Case reference: {c.case_id}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Status Description */}
              <div className="px-6 py-4 border-b border-gray-200">
                <p className="text-sm text-govuk-black">{statusInfo.description}</p>
              </div>

              {/* Key Dates */}
              <div className="px-6 py-4 bg-govuk-grey-1 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Application Date</div>
                    <div className="text-govuk-black">{formatDate(c.created_date)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Last Updated</div>
                    <div className="text-govuk-black">
                      {formatDate(c.last_updated)} ({daysSince(c.last_updated)} days ago)
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold uppercase text-govuk-grey-3 mb-3">Case Progress</h3>
                <div className="space-y-3">
                  {c.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-govuk-blue mt-1.5" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-govuk-black">
                          {TIMELINE_EVENT_LABEL[event.event] ?? event.event.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-govuk-grey-3 mt-0.5">{formatDate(event.date)}</div>
                        {event.note && (
                          <div className="text-sm text-govuk-grey-3 mt-1">{event.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Required */}
              {c.status === 'awaiting_evidence' && (
                <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 text-xl flex-shrink-0">⏰</span>
                    <div>
                      <div className="font-semibold text-sm text-amber-900 mb-1">Action Required</div>
                      <p className="text-sm text-amber-800">
                        We are waiting for information from you. Please check your correspondence for details
                        of what is needed. If you have already sent this, please allow time for processing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
                <div className="text-xs text-blue-900">
                  <strong>Need help?</strong> Contact us at 0300 123 4567 (Monday to Friday, 9am to 5pm) or
                  email casework@example.gov.uk with your case reference.
                </div>
              </div>
            </div>
          )
        })}

        {/* General Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-bold text-govuk-black mb-3">What happens next?</h3>
          <div className="space-y-2 text-sm text-govuk-grey-3">
            <p>
              We will keep you updated as your case progresses. You will receive written notification
              at key stages and when a decision has been made.
            </p>
            <p>
              If we need any additional information from you, we will contact you by post or email.
              Please respond as quickly as possible to avoid delays.
            </p>
            <p>
              Processing times vary depending on the complexity of your case and the information provided.
              Most cases are completed within 8-12 weeks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
