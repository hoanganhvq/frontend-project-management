import type { KeyboardEvent } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { navigate } from '../../app/router'
import { Icon } from '../ui/Icon'

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

export function Sidebar({ activePage, collapsed, mobileOpen, sidebarRef, onKeyDown, onNavigate, onToggle }: { activePage: string; collapsed: boolean; mobileOpen: boolean; sidebarRef: (node: HTMLElement | null) => void; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void; onNavigate: (page: string) => void; onToggle: () => void }) {
  const { user, logout } = useAuth()
  const userName = user?.name || 'Signed-in user'
  const userInitials = userName.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
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
    <button className="button button--primary sidebar__create" type="button" onClick={() => onNavigate('New project')} aria-label="Create a project"><Icon name="plus" /><span>New project</span></button>
    <nav className="sidebar__nav" aria-label="Main navigation">
      <p className="nav-label">Workspace</p>{workspaceLinks.map(renderLink)}
      <p className="nav-label nav-label--spaced">Current project</p>{projectLinks.map(renderLink)}
    </nav>
    <div className="sidebar__bottom">
      <div className="storage" aria-label="Illustrative demo storage use"><div><span>Demo storage</span><strong>68%</strong></div><div className="storage__track"><span /></div><small>Illustrative only</small></div>
      <button className="profile-button" type="button" onClick={() => onNavigate('Profile')} aria-label={`Open profile for ${userName}`}><span className="profile-avatar">{user?.photo ? <img src={user.photo} alt="" /> : userInitials}</span><span className="profile-button__copy"><strong>{userName}</strong><small>{user?.position || user?.role || 'Account'}</small></span><Icon name="dots" /></button>
      <button className="sign-out-button" type="button" onClick={() => void signOut()}><Icon name="logout" /><span>Sign out</span></button>
    </div>
  </aside>
}
