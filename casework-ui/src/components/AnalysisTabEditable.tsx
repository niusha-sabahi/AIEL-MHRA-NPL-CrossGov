import { useState, useEffect } from 'react'
import type { AnalysisResult, Priority, Case, PolicyExtract, WorkflowData } from '../types'

interface Props {
  analysing: boolean
  result: AnalysisResult | null
  onAnalyse: () => void
  currentCase: Case
  policies: PolicyExtract[]
  workflow: WorkflowData
}

type ApprovalState = 'pending' | 'approved' | 'rejected' | 'editing'

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

export default function AnalysisTabEditable({ analysing, result, onAnalyse, currentCase, policies, workflow }: Props) {
  const [state, setState] = useState<ApprovalState>('pending')
  const [actionTime, setActionTime] = useState<string>('')
  
  // Chat state
  const [showChat, setShowChat] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; type?: string }>>([])
  const [chatLoading, setChatLoading] = useState(false)
  
  // Editable fields - initialized from result
  const [editedPriority, setEditedPriority] = useState<Priority>('medium')
  const [editedPolicyId, setEditedPolicyId] = useState('')
  const [editedPolicyTitle, setEditedPolicyTitle] = useState('')
  const [editedSummary, setEditedSummary] = useState('')
  const [editedFlags, setEditedFlags] = useState<string[]>([])
  const [editedRecommendation, setEditedRecommendation] = useState('')
  const [editedAssignment, setEditedAssignment] = useState('')
  
  // Saved versions
  const [savedPriority, setSavedPriority] = useState<Priority>('medium')
  const [savedPolicyId, setSavedPolicyId] = useState('')
  const [savedPolicyTitle, setSavedPolicyTitle] = useState('')
  const [savedSummary, setSavedSummary] = useState('')
  const [savedFlags, setSavedFlags] = useState<string[]>([])
  const [savedRecommendation, setSavedRecommendation] = useState('')
  const [savedAssignment, setSavedAssignment] = useState('')
  
  // Original versions (immutable)
  const [originalPriority, setOriginalPriority] = useState<Priority>('medium')
  const [originalPolicyId, setOriginalPolicyId] = useState('')
  const [originalPolicyTitle, setOriginalPolicyTitle] = useState('')
  const [originalSummary, setOriginalSummary] = useState('')
  const [originalFlags, setOriginalFlags] = useState<string[]>([])
  const [originalRecommendation, setOriginalRecommendation] = useState('')
  const [originalAssignment, setOriginalAssignment] = useState('')

  // Update all fields when result changes
  useEffect(() => {
    if (result) {
      setEditedPriority(result.priority)
      setEditedPolicyId(result.matched_policy_id)
      setEditedPolicyTitle(result.matched_policy_title)
      setEditedSummary(result.summary)
      setEditedFlags(result.flags)
      setEditedRecommendation(result.recommendation)
      setEditedAssignment(result.assignment_recommendation)

      setSavedPriority(result.priority)
      setSavedPolicyId(result.matched_policy_id)
      setSavedPolicyTitle(result.matched_policy_title)
      setSavedSummary(result.summary)
      setSavedFlags(result.flags)
      setSavedRecommendation(result.recommendation)
      setSavedAssignment(result.assignment_recommendation)

      setOriginalPriority(result.priority)
      setOriginalPolicyId(result.matched_policy_id)
      setOriginalPolicyTitle(result.matched_policy_title)
      setOriginalSummary(result.summary)
      setOriginalFlags(result.flags)
      setOriginalRecommendation(result.recommendation)
      setOriginalAssignment(result.assignment_recommendation)

      setState('pending')
    }
  }, [result])

  function timestamp() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  function handleApprove() {
    setActionTime(timestamp())
    setState('approved')
  }

  function handleReject() {
    setActionTime(timestamp())
    setState('rejected')
  }

  function handleSaveEdit() {
    setSavedPriority(editedPriority)
    setSavedPolicyId(editedPolicyId)
    setSavedPolicyTitle(editedPolicyTitle)
    setSavedSummary(editedSummary)
    setSavedFlags(editedFlags)
    setSavedRecommendation(editedRecommendation)
    setSavedAssignment(editedAssignment)
    setActionTime(timestamp())
    setState('approved')
  }

  function handleRevertToOriginal() {
    setEditedPriority(originalPriority)
    setEditedPolicyId(originalPolicyId)
    setEditedPolicyTitle(originalPolicyTitle)
    setEditedSummary(originalSummary)
    setEditedFlags(originalFlags)
    setEditedRecommendation(originalRecommendation)
    setEditedAssignment(originalAssignment)

    setSavedPriority(originalPriority)
    setSavedPolicyId(originalPolicyId)
    setSavedPolicyTitle(originalPolicyTitle)
    setSavedSummary(originalSummary)
    setSavedFlags(originalFlags)
    setSavedRecommendation(originalRecommendation)
    setSavedAssignment(originalAssignment)

    setState('pending')
  }

  function handleCancelEdit() {
    setEditedPriority(savedPriority)
    setEditedPolicyId(savedPolicyId)
    setEditedPolicyTitle(savedPolicyTitle)
    setEditedSummary(savedSummary)
    setEditedFlags(savedFlags)
    setEditedRecommendation(savedRecommendation)
    setEditedAssignment(savedAssignment)
    setState('pending')
  }

  function addFlag() {
    setEditedFlags([...editedFlags, ''])
  }

  function updateFlag(index: number, value: string) {
    const newFlags = [...editedFlags]
    newFlags[index] = value
    setEditedFlags(newFlags)
  }

  function removeFlag(index: number) {
    setEditedFlags(editedFlags.filter((_, i) => i !== index))
  }

  async function handleChatSubmit() {
    if (!chatMessage.trim() || !result) return

    const userMsg = chatMessage.trim()
    setChatMessage('')
    setChatLoading(true)

    // Add user message to history
    const newHistory = [...chatHistory, { role: 'user' as const, content: userMsg }]
    setChatHistory(newHistory)

    try {
      // Call chat endpoint - need to get case data from parent
      // For now, we'll create a mock response
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case: currentCase,
          policies,
          workflow,
          currentAnalysis: {
            matched_policy_id: savedPolicyId,
            matched_policy_title: savedPolicyTitle,
            summary: savedSummary,
            recommendation: savedRecommendation,
            assignment_recommendation: savedAssignment,
            priority: savedPriority,
            flags: savedFlags,
          },
          userMessage: userMsg,
          conversationHistory: chatHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.type === 'analysis_update' && data.analysis) {
        // Update the analysis fields
        const analysis = data.analysis
        setEditedPriority(analysis.priority)
        setEditedPolicyId(analysis.matched_policy_id)
        setEditedPolicyTitle(analysis.matched_policy_title)
        setEditedSummary(analysis.summary)
        setEditedFlags(analysis.flags)
        setEditedRecommendation(analysis.recommendation)
        setEditedAssignment(analysis.assignment_recommendation)

        setSavedPriority(analysis.priority)
        setSavedPolicyId(analysis.matched_policy_id)
        setSavedPolicyTitle(analysis.matched_policy_title)
        setSavedSummary(analysis.summary)
        setSavedFlags(analysis.flags)
        setSavedRecommendation(analysis.recommendation)
        setSavedAssignment(analysis.assignment_recommendation)

        setChatHistory([...newHistory, { 
          role: 'assistant', 
          content: 'I\'ve updated the analysis based on your request.',
          type: 'analysis_update'
        }])
      } else {
        // Regular message or text output
        setChatHistory([...newHistory, { 
          role: 'assistant', 
          content: data.content,
          type: data.type
        }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setChatHistory([...newHistory, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease check that the server is running (npm run server) and try again.`,
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const wasEdited = 
    savedPriority !== originalPriority ||
    savedPolicyId !== originalPolicyId ||
    savedPolicyTitle !== originalPolicyTitle ||
    savedSummary !== originalSummary ||
    JSON.stringify(savedFlags) !== JSON.stringify(originalFlags) ||
    savedRecommendation !== originalRecommendation ||
    savedAssignment !== originalAssignment

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

  // Rejected state
  if (state === 'rejected') {
    return (
      <div className="max-w-2xl">
        <div className="border border-gray-200 rounded p-6 bg-gray-50 text-sm text-govuk-grey-3">
          <div className="flex items-center gap-2 mb-2">
            <span>✕</span>
            <span className="font-semibold">Analysis rejected at {actionTime}</span>
            <button
              onClick={() => setState('pending')}
              className="ml-auto text-xs text-govuk-blue hover:underline"
            >
              Undo
            </button>
          </div>
          <p className="text-xs">The AI-generated analysis has been rejected and will not be used.</p>
        </div>
      </div>
    )
  }

  // Approved state
  if (state === 'approved') {
    return (
      <div className="max-w-2xl">
        {result._isMock && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">ℹ</span>
            <span>
              <strong>Server offline</strong> — Could not reach{' '}
              <code className="bg-amber-100 px-1 rounded">localhost:8000</code>.
            </span>
          </div>
        )}

        <div className="mb-4 border border-green-200 rounded p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-2 text-green-800 text-sm font-semibold">
            <span>✓</span>
            <span>Analysis approved at {actionTime}</span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setState('pending')}
                className="text-xs text-govuk-blue hover:underline font-normal"
              >
                Undo
              </button>
              {wasEdited && (
                <button
                  onClick={handleRevertToOriginal}
                  className="text-xs text-amber-700 hover:underline font-normal"
                >
                  Revert to original
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border border-gray-200 rounded p-3">
            <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Priority</div>
            <span className={`inline-block text-sm font-bold px-2 py-1 rounded border ${PRIORITY_STYLES[savedPriority]}`}>
              {PRIORITY_LABELS[savedPriority]}
            </span>
          </div>
          <div className="border border-gray-200 rounded p-3">
            <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Matched Policy</div>
            <div className="font-mono text-sm font-bold text-govuk-blue">{savedPolicyId}</div>
            <div className="text-xs text-govuk-grey-3 truncate">{savedPolicyTitle}</div>
          </div>
        </div>

        <Section title="Case summary">
          <p className="text-sm text-govuk-black leading-relaxed bg-govuk-grey-1 rounded border border-gray-200 p-4">
            {savedSummary}
          </p>
        </Section>

        {savedFlags.length > 0 && (
          <Section title="Flags & alerts">
            <ul className="space-y-2">
              {savedFlags.map((flag, i) => (
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

        <Section title="Recommended action">
          <p className="text-sm text-govuk-black leading-relaxed bg-govuk-grey-1 rounded border border-gray-200 p-4">
            {savedRecommendation}
          </p>
        </Section>

        <Section title="Assignment recommendation">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded p-4">
            <svg className="w-5 h-5 text-govuk-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm text-blue-900">{savedAssignment}</p>
          </div>
        </Section>
      </div>
    )
  }

  // Editing state
  if (state === 'editing') {
    return (
      <div className="max-w-2xl">
        {result._isMock && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">ℹ</span>
            <span>
              <strong>Server offline</strong> — Could not reach{' '}
              <code className="bg-amber-100 px-1 rounded">localhost:8000</code>.
            </span>
          </div>
        )}

        <div className="mb-4 border-2 border-govuk-blue rounded p-4 bg-blue-50">
          <div className="flex items-center gap-2 text-govuk-blue text-sm font-semibold mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Editing Analysis</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="text-sm font-semibold bg-govuk-blue text-white px-4 py-2 rounded hover:bg-govuk-blue-dark transition-colors"
            >
              Approve Edited Version
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-sm text-govuk-grey-3 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border border-govuk-blue rounded p-3 bg-white">
            <label className="text-xs font-bold uppercase text-govuk-grey-3 mb-2 block">Priority</label>
            <select
              value={editedPriority}
              onChange={e => setEditedPriority(e.target.value as Priority)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-govuk-blue"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="border border-govuk-blue rounded p-3 bg-white">
            <label className="text-xs font-bold uppercase text-govuk-grey-3 mb-2 block">Matched Policy ID</label>
            <input
              type="text"
              value={editedPolicyId}
              onChange={e => setEditedPolicyId(e.target.value)}
              className="w-full text-sm font-mono border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-govuk-blue mb-1"
            />
            <input
              type="text"
              value={editedPolicyTitle}
              onChange={e => setEditedPolicyTitle(e.target.value)}
              placeholder="Policy title"
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-govuk-blue"
            />
          </div>
        </div>

        <Section title="Case summary">
          <textarea
            value={editedSummary}
            onChange={e => setEditedSummary(e.target.value)}
            rows={6}
            className="w-full text-sm text-govuk-black leading-relaxed border-2 border-govuk-blue rounded p-3 resize-none focus:outline-none"
          />
        </Section>

        <Section title="Flags & alerts">
          <div className="space-y-2">
            {editedFlags.map((flag, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={flag}
                  onChange={e => updateFlag(i, e.target.value)}
                  placeholder="Enter flag description"
                  className="flex-1 text-sm border-2 border-govuk-blue rounded px-3 py-2 focus:outline-none"
                />
                <button
                  onClick={() => removeFlag(i)}
                  className="text-red-600 hover:text-red-800 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addFlag}
              className="text-sm text-govuk-blue hover:underline flex items-center gap-1"
            >
              <span>+</span> Add flag
            </button>
          </div>
        </Section>

        <Section title="Recommended action">
          <textarea
            value={editedRecommendation}
            onChange={e => setEditedRecommendation(e.target.value)}
            rows={4}
            className="w-full text-sm text-govuk-black leading-relaxed border-2 border-govuk-blue rounded p-3 resize-none focus:outline-none"
          />
        </Section>

        <Section title="Assignment recommendation">
          <textarea
            value={editedAssignment}
            onChange={e => setEditedAssignment(e.target.value)}
            rows={2}
            className="w-full text-sm text-govuk-black leading-relaxed border-2 border-govuk-blue rounded p-3 resize-none focus:outline-none"
          />
        </Section>
      </div>
    )
  }

  // Pending state (default view)
  return (
    <div className="max-w-2xl">
      {result._isMock && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">ℹ</span>
          <span>
            <strong>Server offline</strong> — Could not reach{' '}
            <code className="bg-amber-100 px-1 rounded">localhost:8000</code>.
          </span>
        </div>
      )}

      <div className="mb-4 border border-gray-200 rounded p-4 bg-govuk-grey-1">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleApprove}
            className="text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => setState('editing')}
            className="text-sm font-semibold text-govuk-blue border border-govuk-blue px-4 py-2 rounded hover:bg-blue-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleReject}
            className="text-sm font-semibold text-red-700 border border-red-300 px-4 py-2 rounded hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onAnalyse}
            className="text-sm font-semibold text-purple-700 border border-purple-300 px-4 py-2 rounded hover:bg-purple-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="text-sm font-semibold text-govuk-blue border border-govuk-blue px-4 py-2 rounded hover:bg-blue-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {showChat ? 'Hide' : 'Chat with AI'}
          </button>
          {wasEdited && (
            <button
              onClick={handleRevertToOriginal}
              className="text-sm font-semibold text-amber-700 border border-amber-300 px-4 py-2 rounded hover:bg-amber-50 transition-colors ml-auto"
            >
              Revert to original
            </button>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="mb-4 border-2 border-govuk-blue rounded overflow-hidden">
          <div className="bg-govuk-blue text-white px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-semibold text-sm">AI Assistant</span>
          </div>
          
          <div className="bg-white">
            {/* Chat history */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <div className="text-center text-sm text-govuk-grey-3 py-8">
                  <p className="mb-2">Ask me to refine the analysis or generate additional outputs.</p>
                  <p className="text-xs">Examples:</p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>"Make the summary more concise"</li>
                    <li>"Change priority to high"</li>
                    <li>"Write an email summary for the applicant"</li>
                    <li>"Draft a letter explaining the decision"</li>
                  </ul>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-govuk-blue text-white'
                      : msg.type === 'analysis_update'
                      ? 'bg-green-50 border border-green-200 text-green-900'
                      : 'bg-govuk-grey-1 text-govuk-black'
                  }`}>
                    {msg.type === 'analysis_update' && (
                      <div className="flex items-center gap-1 mb-1 text-xs font-semibold text-green-700">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Analysis Updated
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-govuk-grey-1 rounded px-3 py-2 text-sm text-govuk-grey-3">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                  placeholder="Ask me to refine the analysis or generate outputs..."
                  disabled={chatLoading}
                  className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-govuk-blue disabled:opacity-50"
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatMessage.trim() || chatLoading}
                  className="bg-govuk-blue text-white px-4 py-2 rounded hover:bg-govuk-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-gray-200 rounded p-3">
          <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Priority</div>
          <span className={`inline-block text-sm font-bold px-2 py-1 rounded border ${PRIORITY_STYLES[savedPriority]}`}>
            {PRIORITY_LABELS[savedPriority]}
          </span>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <div className="text-xs font-bold uppercase text-govuk-grey-3 mb-1">Matched Policy</div>
          <div className="font-mono text-sm font-bold text-govuk-blue">{savedPolicyId}</div>
          <div className="text-xs text-govuk-grey-3 truncate">{savedPolicyTitle}</div>
        </div>
      </div>

      <Section title="Case summary">
        <p className="text-sm text-govuk-black leading-relaxed bg-govuk-grey-1 rounded border border-gray-200 p-4">
          {savedSummary}
        </p>
      </Section>

      {savedFlags.length > 0 && (
        <Section title="Flags & alerts">
          <ul className="space-y-2">
            {savedFlags.map((flag, i) => (
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

      <Section title="Recommended action">
        <p className="text-sm text-govuk-black leading-relaxed bg-govuk-grey-1 rounded border border-gray-200 p-4">
          {savedRecommendation}
        </p>
      </Section>

      <Section title="Assignment recommendation">
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded p-4">
          <svg className="w-5 h-5 text-govuk-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm text-blue-900">{savedAssignment}</p>
        </div>
      </Section>
    </div>
  )
}
