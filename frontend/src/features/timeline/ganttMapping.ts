import type { Link as GanttLink, Task as GanttTask } from 'dhtmlx-gantt'
import type { ProjectMilestone, Task } from '../../types/domain'

export type MappedGanttData = {
  tasks: GanttTask[]
  links: GanttLink[]
  /** Tasks without a valid start and end date are reported outside Gantt. */
  unscheduledTaskIds: number[]
}

/** Parse an ISO calendar date as local midnight, avoiding JavaScript's UTC date-only parsing. */
export function parseLocalDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

/** Format a local calendar date without converting through UTC. */
export function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Gantt treats task end dates as exclusive; add a calendar day, not 24 hours (DST-safe). */
export function toGanttEndDate(inclusiveDate: Date): Date {
  const exclusive = new Date(inclusiveDate)
  exclusive.setDate(exclusive.getDate() + 1)
  return exclusive
}

/** Reverse Gantt's exclusive end convention while preserving the local calendar day. */
export function fromGanttEndDate(exclusiveDate: Date): string {
  const inclusive = new Date(exclusiveDate)
  inclusive.setDate(inclusive.getDate() - 1)
  return formatLocalDateOnly(inclusive)
}

export function mapTasksToGantt(tasks: Task[], milestones: ProjectMilestone[] = []): MappedGanttData {
  const scheduled = new Map<number, Task & { ganttStart: Date; ganttEnd: Date }>()
  const unscheduledTaskIds: number[] = []

  for (const task of tasks) {
    const start = parseLocalDateOnly(task.startDate)
    const end = parseLocalDateOnly(task.endDate)
    if (!start || !end || end < start) {
      unscheduledTaskIds.push(task.id)
      continue
    }
    scheduled.set(task.id, { ...task, ganttStart: start, ganttEnd: toGanttEndDate(end) })
  }

  const ganttTasks: GanttTask[] = [...scheduled.values()].map((task) => ({
    id: task.id,
    text: task.title,
    owner: task.assigneeName || 'Unassigned',
    start_date: task.ganttStart,
    end_date: task.ganttEnd,
    progress: Math.min(100, Math.max(0, task.progress)) / 100,
    open: true,
  }))

  const links: GanttLink[] = []
  for (const task of scheduled.values()) {
    for (const dependencyId of task.dependencyIds ?? []) {
      if (dependencyId === task.id || !scheduled.has(dependencyId)) continue
      links.push({
        id: `dependency-${dependencyId}-${task.id}`,
        source: dependencyId,
        target: task.id,
        type: '0',
      })
    }
  }

  for (const milestone of milestones) {
    const date = parseLocalDateOnly(milestone.date)
    if (!date) continue
    ganttTasks.push({
      id: `milestone-${milestone.id}`,
      text: milestone.title,
      start_date: date,
      type: 'milestone',
      readonly: true,
      owner: 'Milestone',
    })
  }

  return { tasks: ganttTasks, links, unscheduledTaskIds }
}
