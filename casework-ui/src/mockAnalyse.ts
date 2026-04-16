import type { Case, AnalysisResult, Priority } from './types'

const TODAY = new Date('2026-04-16')

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((TODAY.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getEvidenceRequestedDate(c: Case): string | null {
  const ev = c.timeline.find(e => e.event === 'evidence_requested')
  return ev ? ev.date : null
}

const MOCK_RESPONSES: Record<string, AnalysisResult> = {
  'CASE-2026-00042': {
    matched_policy_id: 'POL-BR-003',
    matched_policy_title: 'Evidence requirements for benefit reviews',
    recommendation:
      'Income statement has been outstanding since 15 January 2026 — over 90 days, well past the 56-day escalation threshold. Immediate escalation to team leader is required. A further attempt to contact the applicant by telephone is recommended; however the case may need to be progressed without the income statement if contact cannot be established.',
    assignment_recommendation: 'Escalate to Team B senior officer for decision on how to proceed.',
    priority: 'urgent',
    summary:
      'Benefit review for change of address/circumstances. Partial evidence received (proof of address) on 2 Feb; income statement still outstanding for 91 days. Policy POL-BR-003 requires escalation after 56 days. Case is overdue for escalation.',
    flags: [
      'Evidence outstanding 91 days — exceeds 56-day escalation threshold',
      'Income statement not received',
      'No escalation recorded despite threshold breach',
    ],
  },
  'CASE-2026-00091': {
    matched_policy_id: 'POL-LA-003',
    matched_policy_title: 'Consultation and objections process',
    recommendation:
      'Inspection passed with no concerns. Case is with a senior caseworker for final decision. No objections were received during the consultation period. Proceed to issue licence — no barriers identified.',
    assignment_recommendation: 'Remain with current senior caseworker (Team A). Decision ready to issue.',
    priority: 'low',
    summary:
      'Event licence application for annual community festival. All evidence verified, inspection passed. No objections received. Awaiting final sign-off from senior caseworker. Straightforward case.',
    flags: [],
  },
  'CASE-2026-00107': {
    matched_policy_id: 'POL-CC-003',
    matched_policy_title: 'Enforcement thresholds and escalation',
    recommendation:
      'Two serious regulatory breaches identified — unqualified staff and systematic record-keeping failures. Under POL-CC-003 this meets the threshold for serious breach. Legal proceedings should be considered. The senior officer must brief the legal team and determine whether formal enforcement action is appropriate.',
    assignment_recommendation:
      'Retain with senior officer (Team C). Legal team already copied in — await legal advice before proceeding.',
    priority: 'urgent',
    summary:
      'Compliance check on care provider triggered by third-party referral. Site visit identified two serious breaches: staff without required qualifications and record-keeping failures over 6 months. Already escalated to senior officer. Legal team involvement required.',
    flags: [
      'Serious breach: staff operating without required qualifications',
      'Serious breach: record-keeping failures over 6-month period',
      'Legal team involvement required under POL-CC-003',
    ],
  },
  'CASE-2026-00133': {
    matched_policy_id: 'POL-BR-004',
    matched_policy_title: 'Benefit review decisions — sign-off requirements',
    recommendation:
      'Case is well-progressed and ready for closure. Draft decision recommends award increase. Confirm whether the proposed increase exceeds £50/week — if so, team leader sign-off is mandatory under POL-BR-004 before notifying the claimant.',
    assignment_recommendation:
      'Check award increase amount. If over £50/week uplift, route to Team B team leader for sign-off before issuing decision letter.',
    priority: 'medium',
    summary:
      'Change of employment from full-time to part-time. All evidence received and verified. Draft decision prepared — award increase likely. Pending team leader sign-off before issue.',
    flags: [
      'POL-BR-004: Verify if award increase exceeds £50/week (team leader sign-off required if so)',
    ],
  },
  'CASE-2026-00158': {
    matched_policy_id: 'POL-BR-003',
    matched_policy_title: 'Evidence requirements for benefit reviews',
    recommendation:
      'Evidence pack sent 5 March 2026 — 42 days ago. The 28-day reminder threshold has passed without a response. A reminder should be issued immediately. Monitor for the 56-day escalation deadline (due 30 April 2026).',
    assignment_recommendation:
      'Issue reminder to applicant immediately. Flag for team leader review if no response by 30 April.',
    priority: 'high',
    summary:
      'Annual reassessment. Evidence requested 5 March — 42 days outstanding. 28-day reminder deadline has passed without a reminder being issued. 56-day escalation threshold is 30 April 2026.',
    flags: [
      'Evidence outstanding 42 days — reminder required (28-day threshold passed)',
      'Escalation deadline: 30 April 2026 (14 days)',
      'No reminder issued yet despite threshold breach',
    ],
  },
  'CASE-2026-00172': {
    matched_policy_id: 'POL-LA-001',
    matched_policy_title: 'Eligibility to hold a licence',
    recommendation:
      'Case is closed. Licence renewed successfully. No action required.',
    assignment_recommendation: 'No action required — case closed.',
    priority: 'low',
    summary:
      'Premises licence renewal for The Old Crown Ltd. Clean 5-year history, no objections. Licence renewed 28 February 2026. File closed.',
    flags: [],
  },
  'CASE-2026-00199': {
    matched_policy_id: 'POL-CC-002',
    matched_policy_title: 'Evidence gathering in compliance checks',
    recommendation:
      'Evidence requested 18 March — 29 days ago. The 28-day response window has just elapsed. Issue a follow-up communication to Greenfield Training Academy. If no response within a further 7 days, consider arranging a site visit.',
    assignment_recommendation:
      'Team C caseworker to issue follow-up request. Log non-response and plan site visit if needed.',
    priority: 'medium',
    summary:
      'Routine scheduled compliance check. Evidence requested 18 March — response window just passed (29 days). No response received. Follow-up required per POL-CC-002.',
    flags: [
      'Evidence outstanding 29 days — response window elapsed',
      'Follow-up communication required',
    ],
  },
  'CASE-2026-00214': {
    matched_policy_id: 'POL-BR-003',
    matched_policy_title: 'Evidence requirements for benefit reviews',
    recommendation:
      'Evidence has been outstanding since November 2025 — approximately 150 days. Case was correctly escalated in January. The team leader must decide whether to attempt further contact, progress the case on available information, or consider whether the claim should be suspended pending contact.',
    assignment_recommendation:
      'Team B team leader to review and instruct. Verify whether applicant telephone number can be updated from any other system.',
    priority: 'urgent',
    summary:
      'Benefit review triggered by change of address. Evidence outstanding 150+ days, escalated January 2026. Two reminder letters sent with no response. Contact details may be incorrect.',
    flags: [
      'Evidence outstanding over 150 days',
      'Applicant contact details may be incorrect',
      'Two reminders sent — no response received',
      'Awaiting team leader instruction since January 2026',
    ],
  },
  'CASE-2026-00231': {
    matched_policy_id: 'POL-LA-003',
    matched_policy_title: 'Consultation and objections process',
    recommendation:
      'Two objections received during consultation — both noise-related. Under POL-LA-003, two or more substantive objections trigger mandatory referral to a senior caseworker. The applicant has submitted an updated noise management plan. Senior caseworker must review the plan against the objections before a decision can be issued.',
    assignment_recommendation:
      'Refer to senior caseworker (Team A) for review of objections and updated noise management plan before issuing decision.',
    priority: 'high',
    summary:
      'Outdoor venue premises licence application. Two noise-related objections received. Updated noise management plan submitted by applicant. Mandatory senior caseworker review required under POL-LA-003.',
    flags: [
      'POL-LA-003: 2+ substantive objections — mandatory senior caseworker referral',
      'Updated noise management plan submitted — requires review',
    ],
  },
  'CASE-2026-00248': {
    matched_policy_id: 'POL-CC-002',
    matched_policy_title: 'Evidence gathering in compliance checks',
    recommendation:
      'Documentation largely compliant with one gap: no incident log entries for a 6-week period in autumn 2025. Clarification requested from the organisation. Await response before concluding review. If the gap cannot be satisfactorily explained, consider whether this constitutes a minor or serious breach under POL-CC-003.',
    assignment_recommendation:
      'Team C to await clarification on incident log gap. Assess breach classification once response received.',
    priority: 'medium',
    summary:
      'Compliance check triggered by whistleblower report. Full documentation received — largely compliant. One gap: missing incident logs for a 6-week period in autumn 2025. Clarification sought from organisation.',
    flags: [
      'Incident log gap — 6 weeks in autumn 2025',
      'Clarification outstanding from organisation',
      'Potential breach classification pending',
    ],
  },
}

export async function analyseCase(c: Case): Promise<AnalysisResult> {
  await new Promise(resolve => setTimeout(resolve, 800))

  if (MOCK_RESPONSES[c.case_id]) {
    return MOCK_RESPONSES[c.case_id]
  }

  // Fallback for any case not in the mock map
  const evidenceDate = getEvidenceRequestedDate(c)
  const daysPending = evidenceDate ? daysSince(evidenceDate) : 0
  let priority: Priority = 'medium'
  const flags: string[] = []

  if (c.status === 'escalated') {
    priority = 'urgent'
    flags.push('Case already escalated')
  } else if (daysPending > 56) {
    priority = 'urgent'
    flags.push(`Evidence outstanding ${daysPending} days — exceeds escalation threshold`)
  } else if (daysPending > 28) {
    priority = 'high'
    flags.push(`Evidence outstanding ${daysPending} days — reminder required`)
  }

  const policyMap: Record<string, string> = {
    benefit_review: 'POL-BR-003',
    licence_application: 'POL-LA-002',
    compliance_check: 'POL-CC-002',
  }

  return {
    matched_policy_id: policyMap[c.case_type] ?? 'N/A',
    matched_policy_title: 'Policy matched by case type',
    recommendation: `Case is currently ${c.status.replace(/_/g, ' ')}. Review required actions for this state and check for any outstanding deadlines.`,
    assignment_recommendation: `Assigned to ${c.assigned_to.replace(/_/g, ' ')}. No change recommended.`,
    priority,
    summary: `${c.case_type.replace(/_/g, ' ')} for ${c.applicant.name}. Current status: ${c.status.replace(/_/g, ' ')}.`,
    flags,
  }
}