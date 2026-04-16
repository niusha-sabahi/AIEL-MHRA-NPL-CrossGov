import { useState } from 'react'
import casesData from './data/cases.json'
import policiesData from './data/policy-extracts.json'
import workflowData from './data/workflow-states.json'
import CaseList from './components/CaseList'
import CaseDetail from './components/CaseDetail'
import type { Case, PolicyExtract, WorkflowData } from './types'

const cases = casesData as Case[]
const policies = policiesData as PolicyExtract[]
const workflow = workflowData as WorkflowData

export default function App() {
  const [selectedCase, setSelectedCase] = useState<Case>(cases[0])

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
            Signed in as: <span className="text-white">J. Griffiths</span>
          </span>
          <span className="bg-govuk-blue text-white text-xs px-2 py-0.5 rounded">Team A</span>
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