import { useState } from 'react'
import casesData from './data/cases.json'
import policiesData from './data/policy-extracts.json'
import workflowData from './data/workflow-states.json'
import CaseList from './components/CaseList'
import CaseDetail from './components/CaseDetail'
import Login from './components/Login'
import TeamLeaderDashboard from './components/TeamLeaderDashboard'
import ApplicantView from './components/ApplicantView'
import type { Case, PolicyExtract, WorkflowData } from './types'
import type { User } from './auth'

const cases = casesData as Case[]
const policies = policiesData as PolicyExtract[]
const workflow = workflowData as WorkflowData

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedCase, setSelectedCase] = useState<Case>(cases[0])
  const [view, setView] = useState<'dashboard' | 'case'>('dashboard')

  if (!user) {
    return <Login onLogin={setUser} />
  }

  const handleViewCase = (c: Case) => {
    setSelectedCase(c)
    setView('case')
  }

  const handleLogout = () => {
    setUser(null)
    setView('dashboard')
  }

  // Applicant view
  if (user.role === 'applicant') {
    return (
      <div className="min-h-screen">
        <ApplicantView cases={cases} user={user} />
        <button
          onClick={handleLogout}
          className="fixed bottom-4 right-4 bg-govuk-grey-3 text-white text-sm px-4 py-2 rounded hover:bg-govuk-black transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  // Team Leader view
  if (user.role === 'team_leader') {
    if (view === 'case') {
      return (
        <div className="flex h-screen overflow-hidden bg-white">
          {/* Header bar */}
          <div className="fixed top-0 left-0 right-0 h-14 bg-govuk-black z-10 flex items-center px-4 gap-4">
            <div className="w-8 h-8 bg-govuk-blue flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">GOV</span>
            </div>
            <span className="text-white font-bold text-sm tracking-wide">
              Casework Decision Support
            </span>
            <button
              onClick={() => setView('dashboard')}
              className="text-govuk-grey-2 text-xs hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-govuk-grey-2 text-xs">
                Signed in as: <span className="text-white">{user.name}</span>
              </span>
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded">Team Leader</span>
              <span className="bg-govuk-blue text-white text-xs px-2 py-0.5 rounded">
                {user.team?.replace(/_/g, ' ')}
              </span>
              <button
                onClick={handleLogout}
                className="text-govuk-grey-2 text-xs hover:text-white transition-colors ml-2"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Body below header */}
          <div className="flex w-full mt-14 overflow-hidden">
            <CaseList
              cases={cases}
              selectedId={selectedCase.case_id}
              onSelect={setSelectedCase}
            />
            <CaseDetail
              currentCase={selectedCase}
              policies={policies}
              workflow={workflow}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Header bar */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-govuk-black z-10 flex items-center px-4 gap-4">
          <div className="w-8 h-8 bg-govuk-blue flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">GOV</span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">
            Casework Decision Support
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-govuk-grey-2 text-xs">
              Signed in as: <span className="text-white">{user.name}</span>
            </span>
            <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded">Team Leader</span>
            <span className="bg-govuk-blue text-white text-xs px-2 py-0.5 rounded">
              {user.team?.replace(/_/g, ' ')}
            </span>
            <button
              onClick={handleLogout}
              className="text-govuk-grey-2 text-xs hover:text-white transition-colors ml-2"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Body below header */}
        <div className="w-full mt-14 overflow-hidden">
          <TeamLeaderDashboard cases={cases} user={user} onViewCase={handleViewCase} />
        </div>
      </div>
    )
  }

  // Caseworker view
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Header bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-govuk-black z-10 flex items-center px-4 gap-4">
        <div className="w-8 h-8 bg-govuk-blue flex items-center justify-center">
          <span className="text-white text-xs font-bold leading-none">GOV</span>
        </div>
        <span className="text-white font-bold text-sm tracking-wide">
          Casework Decision Support
        </span>
        <span className="text-govuk-grey-2 text-xs ml-2">
          — {cases.length} active cases loaded
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-govuk-grey-2 text-xs">
            Signed in as: <span className="text-white">{user.name}</span>
          </span>
          <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">Caseworker</span>
          <span className="bg-govuk-blue text-white text-xs px-2 py-0.5 rounded">
            {user.team?.replace(/_/g, ' ')}
          </span>
          <button
            onClick={handleLogout}
            className="text-govuk-grey-2 text-xs hover:text-white transition-colors ml-2"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Body below header */}
      <div className="flex w-full mt-14 overflow-hidden">
        <CaseList
          cases={cases}
          selectedId={selectedCase.case_id}
          onSelect={setSelectedCase}
        />
        <CaseDetail
          currentCase={selectedCase}
          policies={policies}
          workflow={workflow}
        />
      </div>
    </div>
  )
}