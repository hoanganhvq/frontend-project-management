import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'

export function TopBar({ onMenu, menuExpanded, menuButtonRef, pageTitle, onNavigate }: { onMenu: () => void; menuExpanded: boolean; menuButtonRef: (node: HTMLButtonElement | null) => void; pageTitle: string; onNavigate: (page: string) => void }) {
  const [noticeOpen, setNoticeOpen] = useState(false)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!noticeOpen) return
    popoverRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node) && !notificationButtonRef.current?.contains(event.target as Node)) setNoticeOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setNoticeOpen(false); notificationButtonRef.current?.focus() }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [noticeOpen])

  return <header className="topbar">
    <button ref={menuButtonRef} className="topbar__menu icon-button" aria-label={menuExpanded ? 'Navigation open' : 'Open navigation'} aria-expanded={menuExpanded} aria-controls="main-sidebar" onClick={onMenu}><Icon name="menu" /></button>
    <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" /><strong>{pageTitle}</strong></div>
    <div className="topbar__actions">
      <Input id="global-search" placeholder="Search anything…" leadingIcon={<Icon name="search" />} className="topbar__search-input" aria-label="Global search is not available" disabled />
      <div className="notification-menu">
        <Button ref={notificationButtonRef} variant="ghost" className="topbar__notification" aria-label="Notifications unavailable" aria-haspopup="dialog" aria-expanded={noticeOpen} aria-controls="notification-popover" onClick={() => setNoticeOpen((value) => !value)}><Icon name="bell" /></Button>
        {noticeOpen && <section ref={popoverRef} id="notification-popover" className="notification-popover" role="dialog" aria-label="Notifications">
          <div className="notification-popover__header"><div><strong>Notifications</strong><span>Activity feed unavailable</span></div><button type="button" className="icon-button" aria-label="Close notifications" onClick={() => { setNoticeOpen(false); notificationButtonRef.current?.focus() }}><Icon name="close" /></button></div>
          <div className="notification-popover__empty"><strong>No notification API</strong><span>The backend does not provide a notifications endpoint yet.</span></div>
          <button className="notification-view-all" type="button" onClick={() => { setNoticeOpen(false); onNavigate('Notifications') }}>View notifications page <Icon name="arrow" /></button>
        </section>}
      </div>
      <button className="role-switch" disabled aria-label={`Signed in as ${user?.role ?? 'user'}`}><span className="presence-dot" />{user?.position || user?.role || 'Account'}<Icon name="chevron" /></button>
    </div>
  </header>
}
