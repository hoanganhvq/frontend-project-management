import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/services'
import { ApiError } from '../api/client'
import type { LoginRequest, RegisterRequest, UserResponse } from '../api/models'

type AuthStatus = 'loading' | 'ready' | 'unavailable'
type AuthContextValue = {
  user: UserResponse | null
  status: AuthStatus
  error: string
  registrationSucceeded: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (details: RegisterRequest) => Promise<void>
  clearRegistrationNotice: () => void
  logout: () => Promise<void>
  expireSession: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) return 'The authentication service could not restore your session. Please retry.'
    return error.message
  }
  return 'Unable to connect to the authentication service.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false)

  const refresh = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const currentUser = await authApi.me<UserResponse>()
      setUser(currentUser)
      setStatus('ready')
    } catch (requestError) {
      setUser(null)
      if (requestError instanceof ApiError && requestError.status === 401) {
        setStatus('ready')
        return
      }
      setError(errorMessage(requestError))
      setStatus('unavailable')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const login = useCallback(async (credentials: LoginRequest) => {
    setError('')
    await authApi.login(credentials)
    const currentUser = await authApi.me<UserResponse>()
    setUser(currentUser)
    setStatus('ready')
  }, [])

  const register = useCallback(async (details: RegisterRequest) => {
    setRegistrationSucceeded(false)
    await authApi.register(details)
    setRegistrationSucceeded(true)
  }, [])

  const clearRegistrationNotice = useCallback(() => setRegistrationSucceeded(false), [])

  const expireSession = useCallback(() => {
    setUser(null)
    setStatus('ready')
    setError('')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Clear the local signed-in state even if the server is unreachable.
    } finally {
      setUser(null)
      setStatus('ready')
      setError('')
      setRegistrationSucceeded(false)
    }
  }, [])

  const value = useMemo(() => ({ user, status, error, registrationSucceeded, login, register, clearRegistrationNotice, logout, expireSession, refresh }), [user, status, error, registrationSucceeded, login, register, clearRegistrationNotice, logout, expireSession, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
