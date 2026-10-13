import { useSyncExternalStore } from 'react'

export type AppRoute =
  | { page: 'dashboard' }
  | { page: 'projects' }
  | { page: 'team-members' }
  | { page: 'project-detail'; id: number }
  | { page: 'tasks' }
  | { page: 'timeline' }
  | { page: 'task-detail'; id: number }
  | { page: 'ai-planner' }
  | { page: 'notifications' }
  | { page: 'profile' }
  | { page: 'settings' }
  | { page: 'not-found' }

const listeners = new Set<() => void>()

function notifyRouteChange() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') window.addEventListener('popstate', notifyRouteChange)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function currentPath() {
  return typeof window === 'undefined' ? '/' : window.location.pathname
}

export function parseRoute(path: string): AppRoute {
  if (path === '/' || path === '/dashboard') return { page: 'dashboard' }
  if (path === '/projects') return { page: 'projects' }
  if (path === '/team-members') return { page: 'team-members' }
  if (path === '/tasks') return { page: 'tasks' }
  if (path === '/timeline') return { page: 'timeline' }
  if (path === '/ai-planner') return { page: 'ai-planner' }
  if (path === '/notifications') return { page: 'notifications' }
  if (path === '/profile') return { page: 'profile' }
  if (path === '/settings') return { page: 'settings' }
  const projectMatch = path.match(/^\/projects\/(\d+)$/)
  if (projectMatch) return { page: 'project-detail', id: Number(projectMatch[1]) }
  const taskMatch = path.match(/^\/tasks\/(\d+)$/)
  if (taskMatch) return { page: 'task-detail', id: Number(taskMatch[1]) }
  return { page: 'not-found' }
}

export function navigate(path: string, options: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return
  if (options.replace) window.history.replaceState({}, '', path)
  else window.history.pushState({}, '', path)
  notifyRouteChange()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function useAppRoute(): AppRoute {
  const path = useSyncExternalStore(subscribe, currentPath, () => '/')
  return parseRoute(path)
}

export function pathForPage(page: string): string | null {
  const paths: Record<string, string> = {
    Dashboard: '/dashboard',
    Projects: '/projects',
    'Team members': '/team-members',
    'Task board': '/tasks',
    Timeline: '/timeline',
    'AI planner': '/ai-planner',
    Notifications: '/notifications',
    Profile: '/profile',
    Settings: '/settings',
  }
  return paths[page] ?? null
}
