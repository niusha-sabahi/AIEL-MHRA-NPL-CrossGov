import { useState } from 'react'
import { MOCK_USERS, type User } from '../auth'

interface Props {
  onLogin: (user: User) => void
}

export default function Login({ onLogin }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const handleLogin = () => {
    const user = MOCK_USERS.find(u => u.id === selectedUserId)
    if (user) {
      onLogin(user)
    }
  }

  const usersByRole = {
    caseworker: MOCK_USERS.filter(u => u.role === 'caseworker'),
    team_leader: MOCK_USERS.filter(u => u.role === 'team_leader'),
    applicant: MOCK_USERS.filter(u => u.role === 'applicant'),
  }

  return (
    <div className="min-h-screen bg-govuk-grey-1 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-govuk-black mb-2">Casework Management System</h1>
          <p className="text-sm text-govuk-grey-3">Select a user to continue</p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Caseworkers */}
          <div>
            <h3 className="text-xs font-bold uppercase text-govuk-grey-3 mb-2">Caseworkers</h3>
            <div className="space-y-1">
              {usersByRole.caseworker.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                    selectedUserId === user.id
                      ? 'border-govuk-blue bg-blue-50 text-govuk-blue'
                      : 'border-gray-200 hover:border-govuk-blue hover:bg-blue-50'
                  }`}
                >
                  <div className="font-semibold text-sm">{user.name}</div>
                  <div className="text-xs text-govuk-grey-3">{user.team?.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Team Leaders */}
          <div>
            <h3 className="text-xs font-bold uppercase text-govuk-grey-3 mb-2">Team Leaders</h3>
            <div className="space-y-1">
              {usersByRole.team_leader.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                    selectedUserId === user.id
                      ? 'border-govuk-blue bg-blue-50 text-govuk-blue'
                      : 'border-gray-200 hover:border-govuk-blue hover:bg-blue-50'
                  }`}
                >
                  <div className="font-semibold text-sm">{user.name}</div>
                  <div className="text-xs text-govuk-grey-3">{user.team?.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Applicants */}
          <div>
            <h3 className="text-xs font-bold uppercase text-govuk-grey-3 mb-2">Applicants</h3>
            <div className="space-y-1">
              {usersByRole.applicant.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                    selectedUserId === user.id
                      ? 'border-govuk-blue bg-blue-50 text-govuk-blue'
                      : 'border-gray-200 hover:border-govuk-blue hover:bg-blue-50'
                  }`}
                >
                  <div className="font-semibold text-sm">{user.name}</div>
                  <div className="text-xs text-govuk-grey-3">{user.applicantRef}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={!selectedUserId}
          className="w-full bg-govuk-blue text-white font-semibold py-3 rounded hover:bg-govuk-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

        <p className="text-xs text-govuk-grey-3 text-center mt-4">
          Mock authentication — no password required
        </p>
      </div>
    </div>
  )
}
