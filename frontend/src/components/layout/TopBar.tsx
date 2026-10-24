import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { getSettingsPreferences, saveSettingsPreferences } from '../../app/settingsPreferences'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { navigate, parseRoute, taskDetailPath, taskDetailSourcePath } from '../../app/router'

type SearchItem = { title: string; detail: string; href: string; icon: 'grid' | 'folder' | 'users' | 'board' | 'timeline' | 'sparkles' | 'settings' | 'bell' }
const searchPages: SearchItem[] = [
  { title: 'Dashboard', detail: 'Workspace overview', href: '/dashboard', icon: 'grid' },
  { title: 'Projects', detail: 'Browse all projects', href: '/projects', icon: 'folder' },
  { title: 'Team members', detail: 'People and project membership', href: '/team-members', icon: 'users' },
  { title: 'Task board', detail: 'Tasks and assignments', href: '/tasks', icon: 'board' },
  { title: 'Timeline', detail: 'Project schedule', href: '/timeline', icon: 'timeline' },
  { title: 'AI planner', detail: 'Generate a project schedule', href: '/ai-planner', icon: 'sparkles' },
  { title: 'Notifications', detail: 'Recent activity', href: '/notifications', icon: 'bell' },
  { title: 'Settings', detail: 'Account and workspace settings', href: '/settings', icon: 'settings' },
]

export function TopBar({ onMenu, menuExpanded, menuButtonRef, pageTitle, onNavigate }: { onMenu: () => void; menuExpanded: boolean; menuButtonRef: (node: HTMLButtonElement | null) => void; pageTitle: string; onNavigate: (page: string) => void }) {
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTriggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  const { workspace, markNotificationRead, markAllNotificationsRead } = useDemoWorkspace()
  const unreadCount = workspace.notifications.filter((notification) => !notification.read).length
  const searchItems = useMemo(() => {
    const projects: SearchItem[] = workspace.projects.map((project) => ({ title: project.name, detail: project.description || 'Project', href: `/projects/${project.id}`, icon: 'folder' }))
    const tasks: SearchItem[] = workspace.tasks.map((task) => ({ title: task.title, detail: `${workspace.projects.find((project) => project.id === task.projectId)?.name ?? 'Task'} · ${task.description || 'Task'}`, href: taskDetailPath(task.id, '/tasks'), icon: 'board' }))
    const query = searchQuery.trim().toLocaleLowerCase()
    const all = [...searchPages, ...projects, ...tasks]
    return (query ? all.filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase().includes(query)) : searchPages).slice(0, 10)
  }, [workspace.projects, workspace.tasks, searchQuery])
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
  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
    setSelectedSearchIndex(0)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); searchTriggerRef.current?.querySelector('input')?.focus() }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [searchOpen])
  useEffect(() => {
    const openSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    const openSearchEvent = () => setSearchOpen(true)
    document.addEventListener('keydown', openSearchShortcut)
    window.addEventListener('app:open-search', openSearchEvent)
    return () => { document.removeEventListener('keydown', openSearchShortcut); window.removeEventListener('app:open-search', openSearchEvent) }
  }, [])

  function selectSearchResult(item: SearchItem) {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(item.href)
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedSearchIndex((index) => Math.min(index + 1, searchItems.length - 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedSearchIndex((index) => Math.max(0, index - 1)) }
    if (event.key === 'Enter' && searchItems[selectedSearchIndex]) { event.preventDefault(); selectSearchResult(searchItems[selectedSearchIndex]) }
  }

  function toggleTheme() {
    const current = getSettingsPreferences()
    const darkNow = document.documentElement.dataset.theme === 'dark'
    saveSettingsPreferences({ ...current, theme: darkNow ? 'light' : 'dark' })
  }

  return <>
  <header className="topbar">
    <button ref={menuButtonRef} className="topbar__menu icon-button" aria-label={menuExpanded ? 'Navigation open' : 'Open navigation'} aria-expanded={menuExpanded} aria-controls="main-sidebar" onClick={onMenu}><Icon name="menu" /></button>
    <nav className="breadcrumbs" aria-label="Breadcrumb">{breadcrumbs.map((crumb, index) => <span className="breadcrumbs__item" key={`${crumb.label}-${index}`}>{index > 0 && <Icon name="chevron" />}{crumb.href ? <button type="button" onClick={() => navigate(crumb.href!)}>{crumb.label}</button> : <strong aria-current="page">{crumb.label}</strong>}</span>)}</nav>
    <div className="topbar__actions">
      <div ref={searchTriggerRef} className="topbar__search-trigger"><Input id="global-search" placeholder="Search anything…" leadingIcon={<Icon name="search" />} className="topbar__search-input" aria-label="Search anything" readOnly onClick={() => setSearchOpen(true)} /></div>
      <Button variant="ghost" className="topbar__search-mobile" aria-label="Search anything" onClick={() => setSearchOpen(true)}><Icon name="search" /></Button>
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
      <Button variant="ghost" className="topbar__theme-toggle" aria-label={`Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggleTheme}><Icon name={document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'} /></Button>
    </div>
  </header>
  {searchOpen && createPortal(<div className="global-search-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false) }}><section className="global-search-dialog" role="dialog" aria-modal="true" aria-label="Search anything"><div className="global-search-dialog__field"><Icon name="search" /><input ref={searchInputRef} type="search" value={searchQuery} placeholder="Search projects, tasks, and pages…" aria-label="Search projects, tasks, and pages" aria-controls="global-search-results" aria-activedescendant={searchItems[selectedSearchIndex] ? `global-search-result-${selectedSearchIndex}` : undefined} onChange={(event) => { setSearchQuery(event.target.value); setSelectedSearchIndex(0) }} onKeyDown={handleSearchKeyDown} /><kbd>ESC</kbd><button type="button" className="icon-button" aria-label="Close search" onClick={() => setSearchOpen(false)}><Icon name="close" /></button></div><div id="global-search-results" className="global-search-results" role="listbox" aria-label="Search results">{searchItems.length ? searchItems.map((item, index) => <button type="button" id={`global-search-result-${index}`} role="option" aria-selected={selectedSearchIndex === index} className={`global-search-result${selectedSearchIndex === index ? ' global-search-result--active' : ''}`} key={`${item.href}-${item.title}`} onMouseEnter={() => setSelectedSearchIndex(index)} onClick={() => selectSearchResult(item)}><span className="global-search-result__icon"><Icon name={item.icon} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="arrow" className="global-search-result__arrow" /></button>) : <p className="global-search-empty">No projects, tasks, or pages match “{searchQuery}”.</p>}</div><footer className="global-search-dialog__footer"><span>Search across projects and tasks</span><span><kbd>↑</kbd><kbd>↓</kbd> to navigate <kbd>↵</kbd> to open</span></footer></section></div>, document.body)}
  </>
}
