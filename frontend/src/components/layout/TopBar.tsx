import { useEffect, useRef, useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { authApi } from '../../api/services'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { navigate, parseRoute, taskDetailSourcePath } from '../../app/router'

export function TopBar({ onMenu, menuExpanded, menuButtonRef, pageTitle, onNavigate }: { onMenu: () => void; menuExpanded: boolean; menuButtonRef: (node: HTMLButtonElement | null) => void; pageTitle: string; onNavigate: (page: string) => void }) {
  const [noticeOpen, setNoticeOpen] = useState(false)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  const { workspace, markNotificationRead, markAllNotificationsRead } = useDemoWorkspace()
  const unreadCount = workspace.notifications.filter((notification) => !notification.read).length
  const route = parseRoute(`${window.location.pathname}${window.location.search}`)
  const projectId = route.page === 'project-detail' ? route.id : route.page === 'task-detail' ? workspace.tasks.find((task) => task.id === route.id)?.projectId : undefined
  const taskSourcePath = route.page === 'task-detail' ? taskDetailSourcePath(`${window.location.pathname}${window.location.search}`) : ''
  const breadcrumbs = route.page === 'projects'
    ? [{ label: 'Workspace', href: '/dashboard' }, { label: 'Project' }]
    : route.page === 'project-detail'
      ? [{ label: 'Workspace', href: '/dashboard' }, { label: 'Project', href: '/projects' }, { label: 'Project Detail' }]
      : route.page === 'task-detail'
        ? /^\/projects\/\d+$/.test(taskSourcePath)
          ? [{ label: 'Workspace', href: '/dashboard' }, { label: 'Project', href: '/projects' }, { label: 'Project Detail', href: projectId ? `/projects/${projectId}` : taskSourcePath }, { label: 'Task Detail' }]
          : taskSourcePath === '/timeline'
            ? [{ label: 'Workspace', href: '/dashboard' }, { label: 'Timeline', href: '/timeline' }, { label: 'Task Detail' }]
            : taskSourcePath === '/dashboard'
              ? [{ label: 'Workspace', href: '/dashboard' }, { label: 'Dashboard' }, { label: 'Task Detail' }]
              : [{ label: 'Workspace', href: '/dashboard' }, { label: 'Task', href: '/tasks' }, { label: 'Task Detail' }]
        : [{ label: 'Workspace', href: '/dashboard' }, { label: pageTitle }]
  useEffect(() => {
    if (!noticeOpen) return
    popoverRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
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
    <nav className="breadcrumbs" aria-label="Breadcrumb">{breadcrumbs.map((crumb, index) => <span className="breadcrumbs__item" key={`${crumb.label}-${index}`}>{index > 0 && <Icon name="chevron" />}{crumb.href ? <button type="button" onClick={() => navigate(crumb.href!)}>{crumb.label}</button> : <strong aria-current="page">{crumb.label}</strong>}</span>)}</nav>
    <div className="topbar__actions">
      <Input id="global-search" placeholder="Search anything…" leadingIcon={<Icon name="search" />} className="topbar__search-input" aria-label="Search anything" disabled />
      <div className="notification-menu">
        <Button ref={notificationButtonRef} variant="ghost" className="topbar__notification" aria-label={`Notifications, ${unreadCount} unread`} aria-haspopup="dialog" aria-expanded={noticeOpen} aria-controls="notification-popover" onClick={() => setNoticeOpen((value) => !value)}><Icon name="bell" />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</Button>
        {noticeOpen && <section ref={popoverRef} id="notification-popover" className="notification-popover" role="dialog" aria-label="Recent demo notifications">
          <div className="notification-popover__header"><div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread demo alerts` : 'All caught up'}</span></div><div className="notification-popover__actions">{unreadCount > 0 && <button type="button" className="notification-text-action" onClick={markAllNotificationsRead}>Mark all read</button>}<button type="button" className="icon-button" aria-label="Close notifications" onClick={() => { setNoticeOpen(false); notificationButtonRef.current?.focus() }}><Icon name="close" /></button></div></div>
          {workspace.notifications.length === 0 && <div className="notification-popover__empty"><strong>You’re all caught up</strong><span>New workspace activity will appear here.</span></div>}
          {workspace.notifications.slice(0, 4).map((notification) => <button key={notification.id} type="button" className={`notification-preview${notification.read ? '' : ' notification-preview--unread'}`} onClick={() => markNotificationRead(notification.id)}>
            <span className={`notification-preview__dot notification-preview__dot--${notification.tone}`} aria-hidden="true" />
            <span><strong>{notification.title}</strong><small>{notification.detail}</small></span>
          </button>)}
          <button type="button" className="notification-view-all" onClick={() => { setNoticeOpen(false); onNavigate('Notifications') }}>View all notifications <Icon name="arrow" /></button>
        </section>}
      </div>
      <button className="role-switch" type="button" onClick={() => { void authApi.logout().catch(() => undefined).finally(() => window.location.reload()) }}><span className="presence-dot" />Sign out<Icon name="chevron" /></button>
    </div>
  </header>
}
