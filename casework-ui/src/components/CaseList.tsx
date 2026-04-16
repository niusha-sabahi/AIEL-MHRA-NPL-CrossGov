import { useState } from 'react'
import type { Case, CaseStatus } from '../types'

interface Props {
  cases: Case[]
  selectedId: string
  onSelect: (c: Case) => void
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  case_created: 'Created',
  awaiting_evidence: 'Awaiting Evidence',
  under_review: 'Under Review',
  pending_decision: 'Pending Decision',
  escalated: 'Escalated',
  closed: 'Closed',
}

const STATUS_DOT: Record<CaseStatus, string> = {
  case_created: 'bg-gray-400',
  awaiting_evidence: 'bg-amber-500',
  under_review: 'bg-blue-500',
  pending_decision: 'bg-purple-500',
  escalated: 'bg-red-500',
  closed: 'bg-green-600',
}

const TYPE_LABELS: Record<string, string> = {
  benefit_review: 'Benefit Review',
  licence_application: 'Licence Application',
  compliance_check: 'Compliance Check',
}

const TYPE_BG: Record<string, string> = {
  benefit_review: 'bg-blue-50 text-blue-800',
  licence_application: 'bg-purple-50 text-purple-800',
  compliance_check: 'bg-orange-50 text-orange-800',
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

const FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'all' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Awaiting Evidence', value: 'awaiting_evidence' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Pending Decision', value: 'pending_decision' },
  { label: 'Closed', value: 'closed' },
]

export default function CaseList({ cases, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = cases.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      c.case_id.toLowerCase().includes(q) ||
      c.applicant.name.toLowerCase().includes(q) ||
      c.applicant.reference.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-govuk-grey-1 border-r border-gray-200 overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <input
          type="text"
          placeholder="Search cases or applicants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border-2 border-govuk-grey-2 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-govuk-blue"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex overflow-x-auto bg-white border-b border-gray-200 flex-shrink-0">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              filter === opt.value
                ? 'border-govuk-blue text-govuk-blue'
                : 'border-transparent text-govuk-grey-3 hover:text-govuk-black'
            }`}
          >
            {opt.label}
            {opt.value !== 'all' && (
              <span className="ml-1 text-govuk-grey-4">
                ({cases.filter(c => c.status === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Case count */}
      <div className="px-3 py-2 text-xs text-govuk-grey-3 bg-govuk-grey-1 flex-shrink-0">
        Showing {filtered.length} of {cases.length} cases
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-govuk-grey-3 text-center">No cases match your search.</div>
        ) : (
          filtered.map(c => {
            const overdue = isOverdue(c)
            const isSelected = c.case_id === selectedId
            return (
              <button
                key={c.case_id}
                onClick={() => onSelect(c)}
                className={`w-full text-left px-3 py-3 border-b border-gray-200 transition-colors ${
                  isSelected
                    ? 'bg-govuk-blue text-white'
                    : 'bg-white hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-xs font-bold font-mono ${isSelected ? 'text-blue-100' : 'text-govuk-grey-3'}`}>
                    {c.case_id}
                  </span>
                  {overdue && !isSelected && (
                    <span className="flex-shrink-0 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded font-medium">
                      Overdue
                    </span>
                  )}
                  {c.status === 'escalated' && !isSelected && (
                    <span className="flex-shrink-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      Escalated
                    </span>
                  )}
                </div>

                <div className={`font-semibold text-sm mb-1 ${isSelected ? 'text-white' : 'text-govuk-black'}`}>
                  {c.applicant.name}
                </div>

                <div className={`text-xs mb-2 ${isSelected ? 'text-blue-100' : 'text-govuk-grey-3'}`}>
                  {c.applicant.reference}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      isSelected ? 'bg-white/20 text-white' : TYPE_BG[c.case_type]
                    }`}
                  >
                    {TYPE_LABELS[c.case_type]}
                  </span>

                  <span className="flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-white' : STATUS_DOT[c.status]
                      }`}
                    />
                    <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-govuk-grey-3'}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </span>
                </div>

                <div className={`text-xs mt-1.5 ${isSelected ? 'text-blue-200' : 'text-govuk-grey-4'}`}>
                  Updated {daysSince(c.last_updated)}d ago · {c.assigned_to.replace(/_/g, ' ')}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}