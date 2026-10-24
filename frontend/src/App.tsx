import { useEffect } from 'react'
import { AuthProvider, useAuth } from './app/AuthProvider'
import { DemoWorkspaceProvider } from './app/DemoWorkspaceProvider'
import { useAppRoute, navigate, taskDetailSourcePath } from './app/router'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProjectsPage, ProjectDetailPage } from './features/projects/ProjectsPage'
import { TasksPage, TaskDetailPage } from './features/tasks/TasksPage'
import { AIPlannerPage } from './features/ai-planner/AIPlannerPage'
import { NotificationsPage } from './features/notifications/NotificationsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { SettingsPage } from './features/profile/SettingsPage'
import { TimelinePage } from './features/timeline/TimelinePage'
import { TeamMembersPage } from './features/team/TeamMembersPage'
import { AuthLoadingPage, AuthUnavailablePage, LoginPage, RegisterPage } from './features/auth/LoginPage'

const pageMeta = {
  login: ['Sign in', 'Sign in'],
  register: ['Register', 'Register'],
  dashboard: ['Dashboard', 'Dashboard'],
  projects: ['Projects', 'Projects'],
  'team-members': ['Team members', 'Team Members'],
  'project-detail': ['Projects', 'Project details'],
  tasks: ['Task board', 'Tasks'],
  timeline: ['Timeline', 'Timeline'],
  'task-detail': ['Task board', 'Task details'],
  'ai-planner': ['AI planner', 'AI planner'],
  notifications: ['Dashboard', 'Notifications'],
  profile: ['Profile', 'Profile'],
  settings: ['Settings', 'Settings'],
  'not-found': ['Dashboard', 'Page not found'],
} as const

function RoutedApp() {
  const route = useAppRoute()
  const { user, status, error: authError, refresh } = useAuth()
  const [defaultActivePage, pageTitle] = pageMeta[route.page]
  const taskSourcePath = route.page === 'task-detail'
    ? taskDetailSourcePath(`${window.location.pathname}${window.location.search}`)
    : ''
  const activePage = route.page === 'task-detail'
    ? /^\/projects\/\d+$/.test(taskSourcePath)
      ? 'Projects'
      : taskSourcePath === '/timeline'
        ? 'Timeline'
        : taskSourcePath === '/dashboard'
          ? 'Dashboard'
          : 'Task board'
    : defaultActivePage

  useEffect(() => {
    if (status !== 'ready') return
    if (!user && route.page !== 'login' && route.page !== 'register') {
      const requested = `${window.location.pathname}${window.location.search}${window.location.hash}`
      navigate(`/login?redirect=${encodeURIComponent(requested)}`, { replace: true })
      return
    }
    if (user && (route.page === 'login' || route.page === 'register')) {
      const requested = new URLSearchParams(window.location.search).get('redirect')
      const target = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'
      navigate(target, { replace: true })
    }
  }, [status, user, route.page])

  if (status === 'loading') return <AuthLoadingPage />
  if (status === 'unavailable') return <AuthUnavailablePage message={authError || 'Confirm that the backend is running, then retry.'} onRetry={() => void refresh()} />
  if (!user) return route.page === 'register' ? <RegisterPage /> : <LoginPage />
  if (route.page === 'login' || route.page === 'register') return <AuthLoadingPage message="Opening your workspace…" />

  let page = <DashboardPage />
  if (route.page === 'projects') page = <ProjectsPage openCreate={route.create} />
  if (route.page === 'team-members') page = <TeamMembersPage />
  if (route.page === 'project-detail') page = <ProjectDetailPage id={route.id} />
  if (route.page === 'tasks') page = <TasksPage />
  if (route.page === 'timeline') page = <TimelinePage />
  if (route.page === 'task-detail') page = <TaskDetailPage id={route.id} />
  if (route.page === 'ai-planner') page = <AIPlannerPage />
  if (route.page === 'notifications') page = <NotificationsPage />
  if (route.page === 'profile') page = <ProfilePage />
  if (route.page === 'settings') page = <SettingsPage />
  if (route.page === 'not-found') page = <main className="page-stack"><h1>Page not found</h1><p>This page is not part of the current application.</p><button className="button button--primary" onClick={() => navigate('/dashboard')}>Go to dashboard</button></main>

  return <AppShell activePage={activePage} pageTitle={pageTitle} onNavigate={(label) => {
    const path = ({ Dashboard: '/dashboard', Projects: '/projects', 'Team members': '/team-members', 'New project': '/projects?create=1', 'Task board': '/tasks', Timeline: '/timeline', 'AI planner': '/ai-planner', Notifications: '/notifications', Profile: '/profile', Settings: '/settings' } as Record<string, string>)[label]
    if (path) navigate(path)
  }}>{page}</AppShell>
}

export default function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>
}

function AuthenticatedApp() {
  const { user } = useAuth()
  if (!user) return <RoutedApp />
  return <DemoWorkspaceProvider user={user}><RoutedApp /></DemoWorkspaceProvider>
}
