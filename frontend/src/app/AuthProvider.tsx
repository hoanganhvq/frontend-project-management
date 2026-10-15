import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/services'
import { ApiError } from '../api/client'
import type { LoginRequest, UserResponse } from '../api/models'

type AuthStatus = 'loading' | 'ready' | 'unavailable'
type AuthContextValue = {
  user: UserResponse | null
  status: AuthStatus
  error: string
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unable to connect to the authentication service.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')

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

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Clear the local signed-in state even if the server is unreachable.
    } finally {
      setUser(null)
      setStatus('ready')
      setError('')
    }
  }, [])

  const value = useMemo(() => ({ user, status, error, login, logout, refresh }), [user, status, error, login, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
