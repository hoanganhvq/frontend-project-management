export type ProjectStatus = 'in_progress' | 'completed' | 'cancelled'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskBoardColumn = 'todo' | 'in_progress' | 'review' | 'done'

export type Project = {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  status: ProjectStatus
}

export type Task = {
  id: number
  projectId: number
  groupId: number | null
  parentTaskId: number | null
  title: string
  description: string
  startDate: string
  endDate: string
  progress: number
  priority: TaskPriority
  status: TaskStatus
  /** Browser demo board placement; not part of the Spring task DTO. */
  boardColumn?: TaskBoardColumn
  createdByName: string
  createdAt: string
  /** Browser demo planning metadata; these fields are not present in the current API DTO. */
  assigneeName?: string
  module?: string
  estimateHours?: number
  dependencyIds?: number[]
}

export type ProjectMilestone = { id: number; projectId: number; title: string; date: string; status: 'complete' | 'active' | 'upcoming' }

export type NotificationItem = {
  id: number
  title: string
  detail: string
  createdAt: string
  read: boolean
  tone: 'blue' | 'green' | 'amber' | 'purple'
}

export type UserProfile = {
  name: string
  email: string
  position: string
}

export type DemoPreferences = {
  emailNotifications: boolean
  weeklySummary: boolean
}

export type DemoWorkspace = {
  /** Version of browser-only seed data already merged into this workspace. */
  demoSeedVersion?: number
  projects: Project[]
  tasks: Task[]
  /** Browser demo milestone data; no milestone API currently exists. */
  milestones?: ProjectMilestone[]
  notifications: NotificationItem[]
  profile: UserProfile
  preferences: DemoPreferences
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'canceled']
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']
export const PROJECT_STATUSES: ProjectStatus[] = ['in_progress', 'completed', 'cancelled']

export function taskStatusLabel(status: TaskStatus): string {
  return { todo: 'To do', in_progress: 'In progress', done: 'Done', canceled: 'Canceled' }[status]
}

export function taskPriorityLabel(priority: TaskPriority): string {
  return `${priority[0].toUpperCase()}${priority.slice(1)}`
}

export function projectStatusLabel(status: ProjectStatus): string {
  return { in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' }[status]
}

export function taskBoardColumn(task: Task): TaskBoardColumn {
  if (task.boardColumn) return task.boardColumn
  if (task.status === 'done') return 'done'
  if (task.status === 'in_progress') return 'in_progress'
  return 'todo'
}
