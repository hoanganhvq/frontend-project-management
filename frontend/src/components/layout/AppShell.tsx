import type { KeyboardEvent, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'

export function AppShell({ activePage, pageTitle, onNavigate, children }: { activePage: string; pageTitle: string; onNavigate: (page: string) => void; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const { persistenceNotice } = useDemoWorkspace()

  const closeMobileNav = useCallback(() => {
    setMobileOpen(false)
    requestAnimationFrame(() => menuButtonRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLButtonElement>('.nav-link:not(:disabled)')?.focus())
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])

  const handleSidebarKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!mobileOpen) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMobileNav()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') ?? [])
      .filter((element) => element.getClientRects().length > 0)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return <div className={`app-shell${collapsed ? ' app-shell--collapsed' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={closeMobileNav} />}
    <Sidebar
      activePage={activePage}
      collapsed={collapsed}
      mobileOpen={mobileOpen}
      sidebarRef={(node) => { sidebarRef.current = node }}
      onKeyDown={handleSidebarKeyDown}
      onNavigate={(page) => { onNavigate(page); closeMobileNav() }}
      onToggle={() => mobileOpen ? closeMobileNav() : setCollapsed((value) => !value)}
    />
    <div className="app-shell__main">
      <TopBar menuButtonRef={(node) => { menuButtonRef.current = node }} menuExpanded={mobileOpen} onMenu={() => setMobileOpen(true)} pageTitle={pageTitle} onNavigate={onNavigate} />
      <div className="demo-mode-banner" role="status"><span className="demo-mode-banner__dot" /><span>{activePage === 'Team members' ? <><strong>Live project membership</strong> · This tab reads and writes project roster data through the server; other workspace pages may still use browser demo data.</> : <><strong>Demo mode</strong> · Changes are saved only in this browser and are not sent to the project server.</>}</span></div>
      {persistenceNotice && <div className="storage-warning" role="alert">{persistenceNotice}</div>}
      <main id="main-content" className="main-content">{children}</main>
    </div>
  </div>
}
