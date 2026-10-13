import type { DemoWorkspace, Task } from '../types/domain'
import { toLocalDateInput } from '../lib/format'

export const DEMO_STORAGE_KEY = 'orbit-demo-workspace-v1'

function demoDate(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return toLocalDateInput(date)
}

function demoTimestamp(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

function demoTask(
  id: number,
  projectId: number,
  title: string,
  startOffset: number,
  endOffset: number,
  status: Task['status'],
  boardColumn: NonNullable<Task['boardColumn']>,
  progress: number,
  priority: Task['priority'],
  assigneeName: string,
  module: string,
  estimateHours: number,
  dependencyIds: number[] = [],
): Task {
  return {
    id,
    projectId,
    groupId: null,
    parentTaskId: null,
    title,
    description: `${title} — illustrative sample work for the browser demo workspace.`,
    startDate: demoDate(startOffset),
    endDate: demoDate(endOffset),
    progress,
    priority,
    status,
    boardColumn,
    createdByName: 'Maya Chen',
    createdAt: demoTimestamp(-21),
    assigneeName,
    module,
    estimateHours,
    dependencyIds,
  }
}

export const initialDemoWorkspace: DemoWorkspace = {
  demoSeedVersion: 2,
  projects: [
    { id: 101, name: 'Atlas Web Platform', description: 'A sample web platform project used to demonstrate the workspace.', startDate: demoDate(-21), endDate: demoDate(28), status: 'in_progress' },
    { id: 102, name: 'Mobile App v2.0', description: 'Illustrative mobile product redesign and implementation.', startDate: demoDate(-7), endDate: demoDate(50), status: 'in_progress' },
    { id: 103, name: 'Data Migration', description: 'Illustrative migration planning and verification work.', startDate: demoDate(-60), endDate: demoDate(-10), status: 'completed' },
  ],
  tasks: [
    { id: 1001, projectId: 101, groupId: null, parentTaskId: null, title: 'Review sprint goals', description: 'Confirm the goals and acceptance criteria for the current sprint.', startDate: demoDate(-10), endDate: demoDate(-7), progress: 45, priority: 'high', status: 'in_progress', boardColumn: 'in_progress', assigneeName: 'Maya Chen', module: 'Planning', estimateHours: 6, dependencyIds: [], createdByName: 'Maya Chen', createdAt: new Date().toISOString() },
    { id: 1002, projectId: 101, groupId: null, parentTaskId: null, title: 'Validate checkout requirements', description: 'Review the checkout requirements and identify open questions.', startDate: demoDate(-6), endDate: demoDate(2), progress: 0, priority: 'medium', status: 'todo', boardColumn: 'todo', assigneeName: 'Noah Williams', module: 'Checkout', estimateHours: 8, dependencyIds: [1001], createdByName: 'Maya Chen', createdAt: new Date().toISOString() },
    { id: 1003, projectId: 102, groupId: null, parentTaskId: null, title: 'Prepare design handoff', description: 'Package the approved mobile app design notes for handoff.', startDate: demoDate(-4), endDate: demoDate(3), progress: 0, priority: 'medium', status: 'todo', boardColumn: 'review', assigneeName: 'Priya Shah', module: 'Design', estimateHours: 12, dependencyIds: [], createdByName: 'Maya Chen', createdAt: new Date().toISOString() },
    { id: 1004, projectId: 102, groupId: null, parentTaskId: null, title: 'Finalize design tokens', description: 'Review shared color, spacing, and type tokens.', startDate: demoDate(-15), endDate: demoDate(-13), progress: 100, priority: 'low', status: 'done', boardColumn: 'done', assigneeName: 'Liam Kim', module: 'Design', estimateHours: 4, dependencyIds: [], createdByName: 'Maya Chen', createdAt: new Date().toISOString() },
    { id: 1005, projectId: 103, groupId: null, parentTaskId: null, title: 'Confirm migration window', description: 'Document the sample migration window and rollback steps.', startDate: demoDate(-45), endDate: demoDate(-40), progress: 100, priority: 'high', status: 'done', boardColumn: 'done', assigneeName: 'Jordan Lee', module: 'Migration', estimateHours: 5, dependencyIds: [], createdByName: 'Maya Chen', createdAt: new Date().toISOString() },
    demoTask(1006, 101, 'Requirements validation', -20, -16, 'done', 'done', 100, 'high', 'Maya Chen', 'Planning', 10),
    demoTask(1007, 101, 'System architecture', -15, -10, 'done', 'done', 100, 'high', 'Noah Williams', 'Architecture', 16, [1006]),
    demoTask(1008, 101, 'Build authentication endpoints', 3, 12, 'todo', 'todo', 0, 'high', 'Liam Kim', 'Backend', 20, [1007, 1002]),
    demoTask(1009, 101, 'Create responsive navigation', 3, 9, 'todo', 'review', 70, 'medium', 'Priya Shah', 'Frontend', 12, [1002]),
    demoTask(1010, 101, 'Payment service integration', 13, 18, 'todo', 'todo', 0, 'high', 'Jordan Lee', 'Integration', 18, [1008, 1009]),
    demoTask(1011, 101, 'Integration testing', 19, 23, 'todo', 'todo', 0, 'medium', 'Noah Williams', 'Quality', 14, [1010]),
    demoTask(1012, 101, 'Production deployment', 24, 26, 'todo', 'todo', 0, 'medium', 'Maya Chen', 'Release', 8, [1011]),
    demoTask(1013, 102, 'Mobile prototype review', -9, -5, 'done', 'done', 100, 'medium', 'Priya Shah', 'Design', 8),
    demoTask(1014, 102, 'Implement mobile API client', 4, 13, 'todo', 'todo', 0, 'high', 'Liam Kim', 'Mobile', 20, [1003]),
    demoTask(1015, 102, 'Mobile integration testing', 14, 19, 'todo', 'todo', 0, 'medium', 'Jordan Lee', 'Quality', 16, [1014]),
    demoTask(1016, 102, 'Prepare beta release', 20, 24, 'todo', 'todo', 0, 'low', 'Maya Chen', 'Release', 8, [1015]),
    demoTask(1017, 103, 'Audit source schema', -56, -51, 'done', 'done', 100, 'high', 'Noah Williams', 'Migration', 12),
    demoTask(1018, 103, 'Run migration rehearsal', -50, -46, 'done', 'done', 100, 'high', 'Jordan Lee', 'Migration', 16, [1017]),
    demoTask(1019, 103, 'Validate migrated records', -39, -34, 'done', 'done', 100, 'medium', 'Priya Shah', 'Verification', 12, [1005, 1018]),
    demoTask(1020, 103, 'Complete migration handoff', -33, -30, 'done', 'done', 100, 'low', 'Maya Chen', 'Handoff', 4, [1019]),
  ],
  milestones: [
    { id: 1, projectId: 101, title: 'Kickoff', date: demoDate(-21), status: 'complete' },
    { id: 2, projectId: 101, title: 'Design sign-off', date: demoDate(-5), status: 'complete' },
    { id: 3, projectId: 101, title: 'Release readiness', date: demoDate(14), status: 'active' },
    { id: 4, projectId: 102, title: 'Prototype review', date: demoDate(-2), status: 'complete' },
    { id: 5, projectId: 102, title: 'UAT handoff', date: demoDate(32), status: 'upcoming' },
    { id: 6, projectId: 103, title: 'Migration complete', date: demoDate(-10), status: 'complete' },
    { id: 7, projectId: 101, title: 'API freeze', date: demoDate(12), status: 'upcoming' },
    { id: 8, projectId: 101, title: 'Code freeze', date: demoDate(20), status: 'upcoming' },
    { id: 9, projectId: 101, title: 'Release', date: demoDate(28), status: 'upcoming' },
    { id: 10, projectId: 102, title: 'Beta build', date: demoDate(20), status: 'upcoming' },
    { id: 11, projectId: 102, title: 'Store submission', date: demoDate(30), status: 'upcoming' },
    { id: 12, projectId: 103, title: 'Reconciliation signed off', date: demoDate(-34), status: 'complete' },
  ],
  notifications: [
    { id: 1, title: 'Welcome to your demo workspace', detail: 'Explore projects and tasks. Changes stay in this browser.', createdAt: demoTimestamp(0), read: false, tone: 'purple' },
    { id: 2, title: 'A task is coming up', detail: 'Review sprint goals is scheduled for the demo workspace.', createdAt: demoTimestamp(-1), read: false, tone: 'blue' },
    { id: 3, title: 'Sample project completed', detail: 'Data Migration is marked completed in the demo data.', createdAt: demoTimestamp(-3), read: true, tone: 'green' },
  ],
  profile: { name: 'Maya Chen', email: 'maya@example.test', position: 'Project manager' },
  preferences: { emailNotifications: false, weeklySummary: true },
}

export function isDemoWorkspace(value: unknown): value is DemoWorkspace {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<DemoWorkspace>
  const validProject = (item: unknown) => !!item && typeof item === 'object'
    && typeof (item as DemoWorkspace['projects'][number]).id === 'number'
    && typeof (item as DemoWorkspace['projects'][number]).name === 'string'
    && ['in_progress', 'completed', 'cancelled'].includes((item as DemoWorkspace['projects'][number]).status)
  const validTask = (item: unknown) => !!item && typeof item === 'object'
    && typeof (item as DemoWorkspace['tasks'][number]).id === 'number'
    && typeof (item as DemoWorkspace['tasks'][number]).projectId === 'number'
    && typeof (item as DemoWorkspace['tasks'][number]).title === 'string'
    && ['todo', 'in_progress', 'done', 'canceled'].includes((item as DemoWorkspace['tasks'][number]).status)
    && ['low', 'medium', 'high'].includes((item as DemoWorkspace['tasks'][number]).priority)
    && ((item as DemoWorkspace['tasks'][number]).boardColumn === undefined || ['todo', 'in_progress', 'review', 'done'].includes((item as DemoWorkspace['tasks'][number]).boardColumn!))
  const profile = candidate.profile as DemoWorkspace['profile'] | undefined
  const preferences = candidate.preferences as DemoWorkspace['preferences'] | undefined
  return Array.isArray(candidate.projects) && candidate.projects.every(validProject)
    && (candidate.demoSeedVersion === undefined || typeof candidate.demoSeedVersion === 'number')
    && Array.isArray(candidate.tasks) && candidate.tasks.every(validTask)
    && (candidate.milestones === undefined || Array.isArray(candidate.milestones))
    && Array.isArray(candidate.notifications)
    && candidate.notifications.every((item) => !!item && typeof item.id === 'number' && typeof item.title === 'string' && typeof item.detail === 'string' && typeof item.read === 'boolean')
    && !!profile && typeof profile.name === 'string' && typeof profile.email === 'string' && typeof profile.position === 'string'
    && !!preferences && typeof preferences.emailNotifications === 'boolean' && typeof preferences.weeklySummary === 'boolean'
}
