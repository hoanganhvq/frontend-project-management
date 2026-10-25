import { useState, type KeyboardEvent } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { navigate } from '../../app/router'
import { Icon } from '../ui/Icon'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

const workspaceLinks = [
  { label: 'Dashboard', icon: 'grid' as const },
  { label: 'Projects', icon: 'folder' as const },
  { label: 'Team members', icon: 'users' as const },
]
const projectLinks = [
  { label: 'AI planner', icon: 'sparkles' as const },
  { label: 'Timeline', icon: 'timeline' as const },
  { label: 'Task board', icon: 'board' as const },
  { label: 'Settings', icon: 'settings' as const },
]

export function Sidebar({ activePage, collapsed, mobileOpen, workspaceName, workspaceLogo, sidebarRef, onKeyDown, onNavigate, onToggle }: { activePage: string; collapsed: boolean; mobileOpen: boolean; workspaceName: string; workspaceLogo: string; sidebarRef: (node: HTMLElement | null) => void; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void; onNavigate: (page: string) => void; onToggle: () => void }) {
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const { user, logout } = useAuth()
  const userName = user?.name || 'Signed-in user'
  const userInitials = userName.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const userPosition = user?.position || 'Project member'

  async function signOut() {
    setSignOutBusy(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSignOutBusy(false)
    }
  }

  const renderLink = (item: { label: string; icon: 'grid' | 'folder' | 'users' | 'sparkles' | 'timeline' | 'board' | 'settings'; disabled?: boolean }) => <button
    key={item.label}
    className={`nav-link${activePage === item.label ? ' nav-link--active' : ''}`}
    type="button"
    onClick={() => onNavigate(item.label)}
    disabled={item.disabled}
    title={item.label}
    aria-label={item.label}
    aria-current={activePage === item.label ? 'page' : undefined}
  >
    <Icon name={item.icon} /><span>{item.label}</span>
    {item.label === 'AI planner' && <span className="nav-link__planned">Limited</span>}
  </button>

  return <aside ref={sidebarRef} id="main-sidebar" className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}${mobileOpen ? ' sidebar--mobile-open' : ''}`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label={mobileOpen ? 'Primary navigation' : undefined} onKeyDown={onKeyDown}>
    <div className="sidebar__brand-row">
      <div className="brand-mark"><Icon name="sparkles" /></div>
      <span className="brand-name">Orbit<span>AI</span></span>
      <button className="sidebar__collapse icon-button" type="button" onClick={onToggle} aria-label={mobileOpen ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={mobileOpen ? true : !collapsed} aria-controls="main-sidebar"><Icon name={mobileOpen ? 'close' : 'chevron'} /></button>
    </div>
    <button className="workspace-switcher" type="button" disabled aria-label={workspaceName}><span className="workspace-avatar">{workspaceLogo ? <img src={workspaceLogo} alt="" /> : workspaceName.trim().slice(0, 1).toUpperCase() || 'W'}</span><span className="workspace-switcher__copy"><strong>{workspaceName}</strong><small>Connected account</small></span><Icon name="chevron" /></button>
    <button className="sidebar-search" type="button" aria-label="Search anything" onClick={() => window.dispatchEvent(new CustomEvent('app:open-search'))}><Icon name="search" /><span>Quick search</span><kbd>⌘ K</kbd></button>
    <button className="button button--primary sidebar__create" type="button" onClick={() => onNavigate('New project')} aria-label="Create a project"><Icon name="plus" /><span>New project</span></button>
    <nav className="sidebar__nav" aria-label="Main navigation">
      <p className="nav-label">Workspace</p>{workspaceLinks.map(renderLink)}
      <p className="nav-label nav-label--spaced">Current project</p>{projectLinks.map(renderLink)}
    </nav>
    <div className="sidebar__bottom">
      <button className="profile-button" type="button" onClick={() => onNavigate('Profile')} aria-label={`Open profile for ${userName}`}><span className="profile-avatar">{userInitials}</span><span className="profile-button__copy"><strong>{userName}</strong><small>{userPosition}</small></span><Icon name="dots" /></button>
      <button className="sign-out-button" type="button" onClick={() => setConfirmSignOut(true)}><Icon name="logout" /><span>Sign out</span></button>
    </div>
    <Dialog open={confirmSignOut} title="Sign out?" description="Are you sure you want to sign out of OrbitAI?" onClose={() => { if (!signOutBusy) setConfirmSignOut(false) }} actions={<><Button variant="secondary" disabled={signOutBusy} onClick={() => setConfirmSignOut(false)}>Cancel</Button><Button variant="danger" disabled={signOutBusy} onClick={() => void signOut()}>{signOutBusy ? 'Signing out…' : 'Sign out'}</Button></>}>
      <p>Your current session will end, and you’ll need to sign in again to return to your workspace.</p>
    </Dialog>
  </aside>
}
