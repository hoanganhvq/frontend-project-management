import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { authApi, projectMembersApi, projectsApi, tasksApi } from '../api/services'
import { ApiError } from '../api/client'
import { useAuth } from './AuthProvider'
import type { ProjectResponse, TaskResponse } from '../api/models'
import type { DemoPreferences, DemoWorkspace, Project, ProjectMilestone, ProjectStatus, Task, UserProfile } from '../types/domain'

type ProjectValues = Omit<Project, 'id'>
type TaskValues = Omit<Task, 'id' | 'createdAt' | 'createdByName'>
type User = { id: number; name: string; email: string; position?: string | null }
type WorkspaceContextValue = {
  workspace: DemoWorkspace
  workspaceStatus: 'loading' | 'ready' | 'error'
  persistenceNotice: string | null
  user: User
  refresh: () => Promise<void>
  createProject: (project: ProjectValues) => Promise<number>
  updateProject: (id: number, changes: Omit<Partial<Project>, 'id'>) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  createTask: (task: TaskValues) => Promise<number>
  updateTask: (id: number, changes: Omit<Partial<Task>, 'id' | 'projectId'>) => Promise<void>
  addMilestones: (milestones: Omit<ProjectMilestone, 'id'>[]) => void
  deleteTask: (id: number) => Promise<void>
  markNotificationRead: (id: number) => void
  markAllNotificationsRead: () => void
  updateProfile: (profile: UserProfile) => void
  updatePreferences: (preferences: DemoPreferences) => void
  resetDemoWorkspace: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const emptyWorkspace = (user: User): DemoWorkspace => ({
  projects: [], tasks: [], milestones: [], notifications: [],
  profile: { name: user.name, email: user.email, position: user.position ?? 'Project member' },
  preferences: { emailNotifications: true, weeklySummary: false },
})

function mapProject(project: ProjectResponse): Project {
  const status: ProjectStatus = project.status === 'completed' || project.status === 'cancelled' ? project.status : 'in_progress'
  return { id: project.id, ownerId: project.owner?.id, name: project.name, description: project.description ?? '', startDate: project.startDate ?? '', endDate: project.endDate ?? '', status }
}

function mapTask(task: TaskResponse): Task {
  return {
    id: task.id, projectId: task.projectId, groupId: task.groupId, parentTaskId: task.parentTaskId,
    title: task.title, description: task.description ?? '', startDate: task.startDate ?? '', endDate: task.endDate ?? '',
    progress: task.progress ?? 0, priority: task.priority, status: task.status,
    boardColumn: task.status === 'done' ? 'done' : task.status === 'todo' ? 'todo' : 'in_progress',
    createdByName: task.createdByName ?? '', createdAt: task.createdAt ?? '',
  }
}

export function DemoWorkspaceProvider({ user, children }: { user: User; children: ReactNode }) {
  const { expireSession } = useAuth()
  const [workspace, setWorkspace] = useState(() => emptyWorkspace(user))
  const [workspaceStatus, setWorkspaceStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(null)
  const workspaceRef = useRef(workspace)
  const reportError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setPersistenceNotice('Your session expired. Sign in again to continue.')
      expireSession()
      return
    }
    setPersistenceNotice(error instanceof ApiError && error.status >= 500
        ? 'The project service could not complete that request. Please try again shortly.'
        : error instanceof ApiError && error.status === 403
          ? 'Your account does not have permission to change this project.'
          : error instanceof ApiError ? error.message
            : 'The server request could not be completed.')
  }, [expireSession])

  const refresh = useCallback(async () => {
    try {
      const visible = await projectMembersApi.getVisibleProjects()
      const loaded = await Promise.all(visible.map(async ({ id }) => projectsApi.getById(id)))
      const projects = loaded.map(mapProject)
      const taskLists = await Promise.all(projects.map((project) => tasksApi.getByProject(project.id)))
      const next = { ...workspaceRef.current, projects, tasks: taskLists.flat().map(mapTask) }
      workspaceRef.current = next
      setWorkspace(next)
      setPersistenceNotice(null)
      setWorkspaceStatus('ready')
    } catch (error) {
      reportError(error)
      setWorkspaceStatus('error')
    }
  }, [reportError])

  useEffect(() => { void refresh() }, [refresh])

  const createProject = useCallback(async (project: ProjectValues) => {
    try {
      const created = await projectsApi.create({ ...project, startDate: project.startDate || null, endDate: project.endDate || null, ownerId: user.id })
      await refresh()
      return created.id
    } catch (error) { reportError(error); throw error }
  }, [user.id, refresh, reportError])

  const updateProject = useCallback(async (id: number, changes: Omit<Partial<Project>, 'id'>) => {
    const previous = workspaceRef.current.projects.find((item) => item.id === id)
    if (!previous) throw new Error('This project is no longer available. Refresh the page and try again.')
    try {
      await projectsApi.update(id, {
        name: changes.name ?? previous.name, description: changes.description ?? previous.description,
        startDate: (changes.startDate ?? previous.startDate) || null, endDate: (changes.endDate ?? previous.endDate) || null,
        status: changes.status ?? previous.status,
      })
      await refresh()
    } catch (error) { reportError(error); throw error }
  }, [refresh, reportError])

  const deleteProject = useCallback(async (id: number) => {
    try { await projectsApi.delete(id); await refresh() } catch (error) { reportError(error); throw error }
  }, [refresh, reportError])

  const createTask = useCallback(async (task: TaskValues) => {
    try {
      const created = await tasksApi.create({
        projectId: task.projectId, groupId: task.groupId, parentTaskId: task.parentTaskId,
        title: task.title, description: task.description, startDate: task.startDate || null, endDate: task.endDate || null,
        progress: task.progress, priority: task.priority, status: task.status, createdById: user.id,
      })
      await refresh()
      return created.id
    } catch (error) { reportError(error); throw error }
  }, [user.id, refresh, reportError])

  const updateTask = useCallback(async (id: number, changes: Omit<Partial<Task>, 'id' | 'projectId'>) => {
    const task = workspaceRef.current.tasks.find((item) => item.id === id)
    if (!task) throw new Error('This task is no longer available. Refresh the page and try again.')
    const status = changes.status ?? (changes.boardColumn === 'done' ? 'done' : changes.boardColumn === 'todo' ? 'todo' : changes.boardColumn ? 'in_progress' : task.status)
    try {
      await tasksApi.update(id, {
        groupId: changes.groupId ?? task.groupId, parentTaskId: changes.parentTaskId ?? task.parentTaskId,
        title: changes.title ?? task.title, description: changes.description ?? task.description,
        startDate: (changes.startDate ?? task.startDate) || null, endDate: (changes.endDate ?? task.endDate) || null,
        progress: changes.progress ?? (status === 'done' ? 100 : task.progress), priority: changes.priority ?? task.priority, status,
      })
      await refresh()
    } catch (error) { reportError(error); throw error }
  }, [refresh, reportError])

  const deleteTask = useCallback(async (id: number) => {
    try { await tasksApi.delete(id); await refresh() } catch (error) { reportError(error); throw error }
  }, [refresh, reportError])
  const previewOnly = useCallback(() => undefined, [])
  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace, workspaceStatus, persistenceNotice, user, refresh, createProject, updateProject, deleteProject,
    createTask, updateTask, deleteTask, addMilestones: previewOnly, markNotificationRead: previewOnly,
    markAllNotificationsRead: previewOnly, updateProfile: previewOnly, updatePreferences: previewOnly, resetDemoWorkspace: previewOnly,
  }), [workspace, workspaceStatus, persistenceNotice, user, refresh, createProject, updateProject, deleteProject, createTask, updateTask, deleteTask, previewOnly])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useDemoWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useDemoWorkspace must be used inside DemoWorkspaceProvider')
  return value
}

export async function getCurrentUser(): Promise<User> {
  return authApi.me<User>()
}
