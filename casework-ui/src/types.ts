export interface TimelineEvent {
  date: string
  event: string
  note: string
}

export interface Applicant {
  name: string
  reference: string
  date_of_birth: string | null
}

export type CaseType = 'benefit_review' | 'licence_application' | 'compliance_check'

export type CaseStatus =
  | 'case_created'
  | 'awaiting_evidence'
  | 'under_review'
  | 'pending_decision'
  | 'escalated'
  | 'closed'

export interface Case {
  case_id: string
  case_type: CaseType
  status: CaseStatus
  applicant: Applicant
  assigned_to: string // team
  assigned_caseworker?: string // individual caseworker ID
  created_date: string
  last_updated: string
  timeline: TimelineEvent[]
  case_notes: string
}

export interface PolicyExtract {
  policy_id: string
  title: string
  applicable_case_types: string[]
  body: string
}

export interface WorkflowState {
  state: string
  label: string
  description: string
  allowed_transitions: string[]
  required_actions: string[]
  escalation_thresholds?: {
    reminder_days?: number
    escalation_days?: number
  }
}

export interface WorkflowData {
  case_types: {
    [key: string]: {
      states: WorkflowState[]
    }
  }
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type ActionCategory = 'A' | 'B' | 'C' | 'D'

export interface ClassifiedAction {
  text: string
  category: ActionCategory
  actionType: string | null
  applicable: boolean
}

export interface AnalysisResult {
  matched_policy_id: string
  matched_policy_title: string
  recommendation: string
  assignment_recommendation: string
  priority: Priority
  summary: string
  flags: string[]
  classified_actions?: ClassifiedAction[]
  _isMock?: boolean
}