import { useEffect, useState } from 'react'
import { notificationsApi } from '../../api/services'
import type { AppNotification, NotificationPageResponse } from '../../api/models'
import { useNotifications } from '../../app/NotificationProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { notificationPath, notificationTone } from './notificationLinks'
import './NotificationsPage.css'

export function NotificationsPage() {
  const { unreadCount, busy, error: notificationError, revision, refresh, markRead, markAllRead } = useNotifications()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<NotificationPageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    notificationsApi.list(page, 20, unreadOnly).then((data) => {
      if (!active) return
      if (page > 0 && page >= data.totalPages) { setPage(Math.max(0, data.totalPages - 1)); return }
      setResult(data)
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load notifications.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, unreadOnly, revision, retry])

  async function openNotification(notification: AppNotification) {
    try {
      if (!notification.readAt) await markRead(notification.id)
      navigate(notificationPath(notification))
    } catch { /* The provider exposes the failed mutation for retry. */ }
  }

  return <div className="page-stack">
    <PageHeader eyebrow="ACTIVITY" title="Notifications" description={`${unreadCount} unread notifications from your projects, tasks, and AI drafts.`}
      actions={<><Button variant="secondary" disabled={loading || busy} onClick={() => { setRetry((value) => value + 1); void refresh() }}>Refresh</Button><Button variant="primary" disabled={!unreadCount || busy} onClick={() => void markAllRead().catch(() => undefined)}>Mark all read</Button></>} />
    <section className="content-panel notifications-panel" aria-label="Your notifications">
      <div className="notifications-filters" role="group" aria-label="Filter notifications">
        <Button variant={!unreadOnly ? 'primary' : 'ghost'} size="sm" aria-pressed={!unreadOnly} onClick={() => { setUnreadOnly(false); setPage(0) }}>All</Button>
        <Button variant={unreadOnly ? 'primary' : 'ghost'} size="sm" aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(true); setPage(0) }}>Unread</Button>
        {loading && result && <span role="status">Updating…</span>}
      </div>
      {(error || notificationError) && <ErrorState title="Could not update notifications" detail={error || notificationError} action={<Button onClick={() => { setRetry((value) => value + 1); void refresh() }}>Try again</Button>} />}
      {loading && !result ? <LoadingState label="Loading notifications…" /> : result && <>
        {!result.content.length && <EmptyState title={unreadOnly ? 'All caught up' : 'No notifications yet'} detail={unreadOnly ? 'You have read all your notifications.' : 'Project invitations, task assignments, and ready AI drafts will appear here.'} />}
        <div aria-busy={loading} className="notifications-items">
          {result.content.map((notification) => <article className={`notifications-item${notification.readAt ? '' : ' notifications-item--unread'}`} key={notification.id}>
            <span className={`notification-preview__dot notification-preview__dot--${notificationTone(notification)}`} aria-hidden="true" />
            <button className="notifications-item__open" type="button" disabled={busy} onClick={() => void openNotification(notification)}>
              <strong>{notification.title}{!notification.readAt && <span className="notifications-item__unread">Unread</span>}</strong>
              <span>{notification.message}</span>
              <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
            </button>
            {!notification.readAt && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void markRead(notification.id).catch(() => undefined)}>Mark read</Button>}
          </article>)}
        </div>
        {result.totalPages > 1 && <nav className="notifications-pagination" aria-label="Notification pages">
          <Button size="sm" disabled={!page || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>Page {page + 1} of {result.totalPages}</span>
          <Button size="sm" disabled={page + 1 >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </nav>}
      </>}
    </section>
  </div>
}
