export type UserRole = 'caseworker' | 'team_leader' | 'applicant'

export interface User {
  id: string
  name: string
  role: UserRole
  team?: string // for caseworkers and team leaders
  applicantRef?: string // for applicants
}

export const MOCK_USERS: User[] = [
  // Caseworkers
  {
    id: 'cw1',
    name: 'Sarah Chen',
    role: 'caseworker',
    team: 'team_a',
  },
  {
    id: 'cw2',
    name: 'James Wilson',
    role: 'caseworker',
    team: 'team_b',
  },
  {
    id: 'cw3',
    name: 'Priya Patel',
    role: 'caseworker',
    team: 'team_c',
  },
  // Team Leaders
  {
    id: 'tl1',
    name: 'Michael Thompson',
    role: 'team_leader',
    team: 'team_a',
  },
  {
    id: 'tl2',
    name: 'Emma Rodriguez',
    role: 'team_leader',
    team: 'team_b',
  },
  // Applicants
  {
    id: 'app1',
    name: 'Jordan Smith',
    role: 'applicant',
    applicantRef: 'REF-77291',
  },
  {
    id: 'app2',
    name: 'Marcus Okonkwo',
    role: 'applicant',
    applicantRef: 'REF-55887',
  },
  {
    id: 'app3',
    name: 'Priya Mehta',
    role: 'applicant',
    applicantRef: 'REF-71049',
  },
]
