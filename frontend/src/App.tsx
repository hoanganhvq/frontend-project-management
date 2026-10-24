import { useEffect, useState, type FormEvent } from 'react'
import { DemoWorkspaceProvider, getCurrentUser } from './app/DemoWorkspaceProvider'
import { authApi } from './api/services'
import { isApiError } from './api/client'
import { useAppRoute, navigate } from './app/router'
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
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'

const pageMeta = {
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
  const [activePage, pageTitle] = pageMeta[route.page]
  let page = <DashboardPage />
  if (route.page === 'projects') page = <ProjectsPage />
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
  const [user, setUser] = useState<{ id: number; name: string; email: string; position?: string | null } | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [register, setRegister] = useState(false)

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    try {
      if (register) await authApi.register({ name: String(form.get('name') ?? '').trim(), email, password })
      await authApi.login({ email, password })
      setUser(await getCurrentUser())
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : 'Could not sign in.'
      setError(isApiError(issue) && issue.status === 401 ? 'Email or password is incorrect.' : message)
    }
  }

  if (checking) return <main className="auth-screen"><p role="status">Checking your session…</p></main>
  if (!user) return <main className="auth-screen"><section className="auth-card"><p className="auth-eyebrow">PROJECT MANAGEMENT</p><h1>{register ? 'Create your account' : 'Welcome back'}</h1><p>Sign in to load your projects and tasks from the server.</p>
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      {register && <Input id="auth-name" name="name" label="Name" autoComplete="name" required maxLength={100} />}
      <Input id="auth-email" name="email" type="email" label="Email" autoComplete="email" required />
      <Input id="auth-password" name="password" type="password" label="Password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" variant="primary">{register ? 'Create account' : 'Sign in'}</Button>
    </form>
    <button className="auth-switch" type="button" onClick={() => { setRegister((value) => !value); setError('') }}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
  </section></main>
  return <DemoWorkspaceProvider user={user}><RoutedApp /></DemoWorkspaceProvider>
}
