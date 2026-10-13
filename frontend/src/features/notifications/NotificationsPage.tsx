import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatDate } from '../../lib/format'

export function NotificationsPage() {
  const { workspace, markNotificationRead, markAllNotificationsRead } = useDemoWorkspace()
  const unreadCount = workspace.notifications.filter((item) => !item.read).length
  return <div className="page-stack"><PageHeader eyebrow="ACTIVITY" title="Notifications" description="Sample notifications stored in this browser demo workspace." actions={<Button variant="secondary" onClick={markAllNotificationsRead} disabled={!unreadCount}>Mark all read</Button>} />
    {workspace.notifications.length ? <section className="content-panel notification-list" aria-label="Demo notifications">{workspace.notifications.map((item) => <article className={`notification-row${item.read ? '' : ' notification-row--unread'}`} key={item.id}><span className={`notification-row__dot notification-row__dot--${item.tone}`} aria-hidden="true" /><div><h2>{item.title}</h2><p>{item.detail}</p><time dateTime={item.createdAt}>{formatDate(item.createdAt.slice(0, 10))}</time></div><Button size="sm" variant="ghost" disabled={item.read} onClick={() => markNotificationRead(item.id)}>{item.read ? 'Read' : 'Mark read'}</Button></article>)}</section> : <EmptyState title="No notifications" detail="New demo workspace activity will appear here." />}
  </div>
}
