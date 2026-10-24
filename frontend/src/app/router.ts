import { useSyncExternalStore } from 'react'

export type AppRoute =
  | { page: 'login' }
  | { page: 'register' }
  | { page: 'dashboard' }
  | { page: 'projects'; create?: boolean }
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
  return typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}`
}

export function parseRoute(path: string): AppRoute {
  const [pathname, search = ''] = path.split('?')
  if (pathname === '/login') return { page: 'login' }
  if (pathname === '/register') return { page: 'register' }
  if (pathname === '/' || pathname === '/dashboard') return { page: 'dashboard' }
  if (pathname === '/projects') return { page: 'projects', create: new URLSearchParams(search).get('create') === '1' }
  if (pathname === '/team-members') return { page: 'team-members' }
  if (pathname === '/tasks') return { page: 'tasks' }
  if (pathname === '/timeline') return { page: 'timeline' }
  if (pathname === '/ai-planner') return { page: 'ai-planner' }
  if (pathname === '/notifications') return { page: 'notifications' }
  if (pathname === '/profile') return { page: 'profile' }
  if (pathname === '/settings') return { page: 'settings' }
  const projectMatch = pathname.match(/^\/projects\/(\d+)$/)
  if (projectMatch) return { page: 'project-detail', id: Number(projectMatch[1]) }
  const taskMatch = pathname.match(/^\/tasks\/(\d+)$/)
  if (taskMatch) return { page: 'task-detail', id: Number(taskMatch[1]) }
  return { page: 'not-found' }
}

export function safeRedirectPath(candidate: string | null): string | null {
  if (!candidate?.startsWith('/') || candidate.startsWith('//')) return null
  const destination = parseRoute(candidate)
  if (destination.page === 'login' || destination.page === 'register' || destination.page === 'not-found') return null
  return candidate
}

export function navigate(path: string, options: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return
  if (options.replace) window.history.replaceState({}, '', path)
  else window.history.pushState({}, '', path)
  notifyRouteChange()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

export function taskDetailPath(taskId: number, from: string): string {
  return `/tasks/${taskId}?from=${encodeURIComponent(from)}`
}

export function taskDetailReturnPath(path: string): string {
  const from = new URLSearchParams(path.split('?')[1] ?? '').get('from')
  if (from && (/^\/projects\/\d+$/.test(from) || /^\/tasks(?:\/\d+)?(?:\?.+)?$/.test(from) || from === '/timeline' || from === '/dashboard')) return from
  return '/tasks'
}

export function taskDetailSourcePath(path: string): string {
  let sourcePath = taskDetailReturnPath(path)
  let depth = 0
  while (/^\/tasks\/\d+(?:\?.*)?$/.test(sourcePath) && depth < 12) {
    sourcePath = taskDetailReturnPath(sourcePath)
    depth += 1
  }
  return sourcePath
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
