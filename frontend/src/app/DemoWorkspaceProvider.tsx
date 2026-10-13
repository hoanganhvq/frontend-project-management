import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { DEMO_STORAGE_KEY, initialDemoWorkspace, isDemoWorkspace } from '../data/demoWorkspace'
import type { DemoPreferences, DemoWorkspace, NotificationItem, Project, ProjectMilestone, Task, UserProfile } from '../types/domain'

type NewProject = Omit<Project, 'id'>
type NewTask = Omit<Task, 'id' | 'createdAt' | 'createdByName'>
type WorkspaceContextValue = {
  workspace: DemoWorkspace
  persistenceNotice: string | null
  createProject: (project: NewProject) => number
  updateProject: (id: number, changes: Omit<Partial<Project>, 'id'>) => void
  deleteProject: (id: number) => void
  createTask: (task: NewTask) => number
  updateTask: (id: number, changes: Omit<Partial<Task>, 'id' | 'projectId'>) => void
  addMilestones: (milestones: Omit<ProjectMilestone, 'id'>[]) => void
  deleteTask: (id: number) => void
  markNotificationRead: (id: number) => void
  markAllNotificationsRead: () => void
  updateProfile: (profile: UserProfile) => void
  updatePreferences: (preferences: DemoPreferences) => void
  resetDemoWorkspace: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function copyInitialWorkspace(): DemoWorkspace {
  return {
    ...initialDemoWorkspace,
    projects: initialDemoWorkspace.projects.map((project) => ({ ...project })),
    tasks: initialDemoWorkspace.tasks.map((task) => ({ ...task })),
    milestones: initialDemoWorkspace.milestones?.map((milestone) => ({ ...milestone })) ?? [],
    notifications: initialDemoWorkspace.notifications.map((notification) => ({ ...notification })),
    profile: { ...initialDemoWorkspace.profile },
    preferences: { ...initialDemoWorkspace.preferences },
  }
}

function readWorkspace(): { workspace: DemoWorkspace; issue: string | null } {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return { workspace: copyInitialWorkspace(), issue: null }
    const value: unknown = JSON.parse(raw)
    if (isDemoWorkspace(value)) {
      const workspace = mergeNewSeedData(value)
      if (workspace !== value) {
        try {
          window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(workspace))
        } catch {
          return { workspace, issue: 'New demo sample data is loaded in this tab, but browser storage could not save the update.' }
        }
      }
      return { workspace, issue: null }
    }
    return { workspace: copyInitialWorkspace(), issue: 'Saved demo data could not be read. A fresh demo workspace is loaded; future changes may overwrite the invalid browser copy.' }
  } catch {
    return { workspace: copyInitialWorkspace(), issue: 'Browser storage is unavailable. Changes will last only until this tab is closed.' }
  }
}

function nextId(items: { id: number }[]): number {
  return items.reduce((largest, item) => Math.max(largest, item.id), 0) + 1
}

function mergeNewSeedData(workspace: DemoWorkspace): DemoWorkspace {
  const seedVersion = initialDemoWorkspace.demoSeedVersion ?? 1
  if ((workspace.demoSeedVersion ?? 0) >= seedVersion) return workspace

  const projectIds = new Set(workspace.projects.map((project) => project.id))
  const seedTasks = initialDemoWorkspace.tasks.filter((task) => task.id >= 1006 && projectIds.has(task.projectId))
  const taskIdMap = new Map<number, number>()
  let nextTaskId = nextId(workspace.tasks)
  for (const seedTask of seedTasks) {
    const existing = workspace.tasks.find((task) => task.id === seedTask.id && task.projectId === seedTask.projectId && task.title === seedTask.title)
    taskIdMap.set(seedTask.id, existing?.id ?? nextTaskId++)
  }
  const tasksToAdd = seedTasks.flatMap((seedTask) => {
    const exists = workspace.tasks.some((task) => task.id === seedTask.id && task.projectId === seedTask.projectId && task.title === seedTask.title)
    if (exists) return []
    return [{
      ...seedTask,
      id: taskIdMap.get(seedTask.id)!,
      dependencyIds: seedTask.dependencyIds?.map((id) => taskIdMap.get(id) ?? id),
    }]
  })

  const milestones = workspace.milestones ?? []
  const seedMilestones = (initialDemoWorkspace.milestones ?? []).filter((item) => item.id >= 7 && projectIds.has(item.projectId))
  let nextMilestoneId = nextId(milestones)
  const milestonesToAdd = seedMilestones.flatMap((seedMilestone) => {
    const exists = milestones.some((item) => item.id === seedMilestone.id && item.projectId === seedMilestone.projectId && item.title === seedMilestone.title)
    return exists ? [] : [{ ...seedMilestone, id: nextMilestoneId++ }]
  })

  return {
    ...workspace,
    demoSeedVersion: seedVersion,
    tasks: [...workspace.tasks, ...tasksToAdd],
    milestones: [...milestones, ...milestonesToAdd],
  }
}

function appendDemoNotification(workspace: DemoWorkspace, notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): NotificationItem[] {
  return [{ ...notification, id: nextId(workspace.notifications), createdAt: new Date().toISOString(), read: false }, ...workspace.notifications]
}

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(readWorkspace)
  const [workspace, setWorkspace] = useState(loaded.workspace)
  const workspaceRef = useRef(loaded.workspace)
  const [persistenceNotice, setPersistenceNotice] = useState(loaded.issue)

  const commit = useCallback((update: (current: DemoWorkspace) => DemoWorkspace) => {
    const next = update(workspaceRef.current)
    workspaceRef.current = next
    setWorkspace(next)
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next))
      setPersistenceNotice(null)
    } catch {
      setPersistenceNotice('Changes are active for this tab only because browser storage is unavailable. They are not saved to the server.')
    }
  }, [])

  const createProject = useCallback((project: NewProject) => {
    const id = nextId(workspaceRef.current.projects)
    commit((current) => ({ ...current, projects: [...current.projects, { ...project, id }] }))
    return id
  }, [commit])

  const updateProject = useCallback((id: number, changes: Omit<Partial<Project>, 'id'>) => {
    commit((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...changes } : project) }))
  }, [commit])

  const deleteProject = useCallback((id: number) => {
    commit((current) => {
      const project = current.projects.find((item) => item.id === id)
      if (!project) return current
      return {
        ...current,
        projects: current.projects.filter((item) => item.id !== id),
        tasks: current.tasks.filter((task) => task.projectId !== id),
        milestones: (current.milestones ?? []).filter((milestone) => milestone.projectId !== id),
        notifications: appendDemoNotification(current, { title: 'Demo project removed', detail: `${project.name} and its demo tasks were removed from this browser.`, tone: 'amber' }),
      }
    })
  }, [commit])

  const createTask = useCallback((task: NewTask) => {
    const id = nextId(workspaceRef.current.tasks)
    commit((current) => ({
      ...current,
      tasks: [...current.tasks, { ...task, id, createdByName: current.profile.name, createdAt: new Date().toISOString() }],
      notifications: appendDemoNotification(current, { title: 'Demo task created', detail: `${task.title} was added to this browser’s demo workspace.`, tone: 'blue' }),
    }))
    return id
  }, [commit])

  const updateTask = useCallback((id: number, changes: Omit<Partial<Task>, 'id' | 'projectId'>) => {
    commit((current) => ({ ...current, tasks: current.tasks.map((task) => {
      if (task.id !== id) return task
      const updated = { ...task, ...changes }
      if (changes.boardColumn) updated.status = changes.boardColumn === 'done' ? 'done' : changes.boardColumn === 'todo' ? 'todo' : 'in_progress'
      else if (changes.status && changes.status !== 'canceled') updated.boardColumn = changes.status === 'done' ? 'done' : changes.status
      if (updated.status === 'done') updated.progress = 100
      else if (task.status === 'done' && (changes.status || changes.boardColumn)) updated.progress = 0
      return updated
    }) }))
  }, [commit])

  const addMilestones = useCallback((milestones: Omit<ProjectMilestone, 'id'>[]) => {
    commit((current) => {
      let id = nextId(current.milestones ?? [])
      return { ...current, milestones: [...(current.milestones ?? []), ...milestones.map((milestone) => ({ ...milestone, id: id++ }))] }
    })
  }, [commit])

  const deleteTask = useCallback((id: number) => {
    commit((current) => {
      const task = current.tasks.find((item) => item.id === id)
      if (!task) return current
      return {
        ...current,
        tasks: current.tasks.filter((item) => item.id !== id).map((item) => ({ ...item, dependencyIds: item.dependencyIds?.filter((dependencyId) => dependencyId !== id) })),
        notifications: appendDemoNotification(current, { title: 'Demo task removed', detail: `${task.title} was removed from this browser.`, tone: 'amber' }),
      }
    })
  }, [commit])

  const markNotificationRead = useCallback((id: number) => {
    commit((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }))
  }, [commit])

  const markAllNotificationsRead = useCallback(() => {
    commit((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }))
  }, [commit])

  const updateProfile = useCallback((profile: UserProfile) => {
    commit((current) => ({ ...current, profile }))
  }, [commit])

  const updatePreferences = useCallback((preferences: DemoPreferences) => {
    commit((current) => ({ ...current, preferences }))
  }, [commit])

  const resetDemoWorkspace = useCallback(() => {
    const fresh = copyInitialWorkspace()
    workspaceRef.current = fresh
    setWorkspace(fresh)
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fresh))
      setPersistenceNotice(null)
    } catch {
      setPersistenceNotice('The demo workspace reset for this tab, but browser storage is unavailable. It will reset again when this tab is reloaded.')
    }
  }, [])

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace, persistenceNotice, createProject, updateProject, deleteProject,
    createTask, updateTask, addMilestones, deleteTask, markNotificationRead, markAllNotificationsRead,
    updateProfile, updatePreferences, resetDemoWorkspace,
  }), [workspace, persistenceNotice, createProject, updateProject, deleteProject, createTask, updateTask, addMilestones, deleteTask, markNotificationRead, markAllNotificationsRead, updateProfile, updatePreferences, resetDemoWorkspace])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useDemoWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useDemoWorkspace must be used inside DemoWorkspaceProvider')
  return context
}
