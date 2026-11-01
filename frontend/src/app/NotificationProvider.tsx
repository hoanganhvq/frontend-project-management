import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppNotification } from '../api/models'
import { notificationsApi } from '../api/services'

type NotificationContextValue = {
  recent: AppNotification[]
  unreadCount: number
  loading: boolean
  busy: boolean
  error: string
  revision: number
  refresh: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}
const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const active = useRef(false)
  const pending = useRef<Promise<void> | null>(null)
  const mutating = useRef(false)

  const refresh = useCallback((): Promise<void> => {
    if (pending.current) return pending.current
    const request = notificationsApi.list(0, 4).then((data) => {
      if (!active.current) return
      setRecent(data.content)
      setUnreadCount(data.unreadCount)
      setError('')
      setRevision((current) => current + 1)
    }).catch((requestError: unknown) => {
      if (active.current) setError(requestError instanceof Error ? requestError.message : 'Could not load notifications.')
    }).finally(() => {
      pending.current = null
      if (active.current) setLoading(false)
    })
    pending.current = request
    return request
  }, [])

  useEffect(() => {
    active.current = true
    void refresh()
    const refreshVisible = () => { if (document.visibilityState === 'visible' && !mutating.current) void refresh() }
    const interval = window.setInterval(refreshVisible, 30_000)
    document.addEventListener('visibilitychange', refreshVisible)
    window.addEventListener('focus', refreshVisible)
    return () => {
      active.current = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshVisible)
      window.removeEventListener('focus', refreshVisible)
    }
  }, [refresh])

  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    if (mutating.current) return
    mutating.current = true
    setBusy(true)
    setError('')
    try {
      // Finish any older poll before the write, then fetch the authoritative unread count.
      await pending.current
      await operation()
      if (active.current) await refresh()
    } catch (requestError) {
      if (active.current) setError(requestError instanceof Error ? requestError.message : 'Could not update notifications.')
      throw requestError
    } finally {
      mutating.current = false
      if (active.current) setBusy(false)
    }
  }, [refresh])
  const markRead = useCallback((id: number) => mutate(() => notificationsApi.markRead(id)), [mutate])
  const markAllRead = useCallback(() => mutate(() => notificationsApi.markAllRead()), [mutate])

  return <NotificationContext.Provider value={{ recent, unreadCount, loading, busy, error, revision, refresh, markRead, markAllRead }}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications requires NotificationProvider')
  return context
}
