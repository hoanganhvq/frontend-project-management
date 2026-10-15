import { useEffect, useRef, useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { useAuth } from '../../app/AuthProvider'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'

export function TopBar({ onMenu, menuExpanded, menuButtonRef, pageTitle, onNavigate }: { onMenu: () => void; menuExpanded: boolean; menuButtonRef: (node: HTMLButtonElement | null) => void; pageTitle: string; onNavigate: (page: string) => void }) {
  const [noticeOpen, setNoticeOpen] = useState(false)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  const { workspace, markNotificationRead, markAllNotificationsRead } = useDemoWorkspace()
  const { user } = useAuth()
  const unreadCount = workspace.notifications.filter((notification) => !notification.read).length
  useEffect(() => {
    if (!noticeOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node) && !notificationButtonRef.current?.contains(event.target as Node)) setNoticeOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNoticeOpen(false)
        notificationButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [noticeOpen])
  return <header className="topbar">
    <button ref={menuButtonRef} className="topbar__menu icon-button" aria-label={menuExpanded ? 'Navigation open' : 'Open navigation'} aria-expanded={menuExpanded} aria-controls="main-sidebar" onClick={onMenu}><Icon name="menu" /></button>
    <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" /><strong>{pageTitle}</strong></div>
    <div className="topbar__actions">
      <Input id="global-search" placeholder="Search anything…" leadingIcon={<Icon name="search" />} className="topbar__search-input" aria-label="Search anything" disabled />
      <Button ref={notificationButtonRef} variant="ghost" className="topbar__notification" aria-label={`Notifications, ${unreadCount} unread`} aria-haspopup="dialog" aria-expanded={noticeOpen} aria-controls="notification-popover" onClick={() => setNoticeOpen((value) => !value)}><Icon name="bell" />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</Button>
      <button className="role-switch" disabled aria-label={`Signed in as ${user?.role ?? 'user'}`}><span className="presence-dot" />{user?.position || user?.role || 'Account'}<Icon name="chevron" /></button>
    </div>
    {noticeOpen && <section ref={popoverRef} id="notification-popover" className="notification-popover" role="dialog" aria-label="Recent demo notifications">
      <div className="notification-popover__header"><div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread demo alerts` : 'All caught up'}</span></div>{unreadCount > 0 && <button type="button" className="notification-text-action" onClick={markAllNotificationsRead}>Mark all read</button>}</div>
      {workspace.notifications.length === 0 && <div className="notification-popover__empty"><strong>You’re all caught up</strong><span>New workspace activity will appear here.</span></div>}
      {workspace.notifications.slice(0, 4).map((notification) => <button key={notification.id} type="button" className={`notification-preview${notification.read ? '' : ' notification-preview--unread'}`} onClick={() => markNotificationRead(notification.id)}>
        <span className={`notification-preview__dot notification-preview__dot--${notification.tone}`} aria-hidden="true" />
        <span><strong>{notification.title}</strong><small>{notification.detail}</small></span>
      </button>)}
      <button type="button" className="notification-view-all" onClick={() => { setNoticeOpen(false); onNavigate('Notifications') }}>View all notifications <Icon name="arrow" /></button>
    </section>}
  </header>
}
