import { useEffect, useMemo, useRef } from 'react'
import { Gantt, type Link as GanttLink, type Task as GanttTask } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import { EmptyState } from '../../components/ui/States'
import { formatLocalDateOnly, fromGanttEndDate, mapTasksToGantt, parseLocalDateOnly } from './ganttMapping'
import type { ProjectMilestone, Task } from '../../types/domain'
import './DhtmlxGanttTimeline.css'

export type TimelineZoom = 'day' | 'week' | 'month'

type Props = {
  projectName: string
  tasks: Task[]
  milestones: ProjectMilestone[]
  zoom: TimelineZoom
  anchorDate: Date
  focusToday: boolean
  onTaskSelect: (taskId: number) => void
  onUpdateTask: (taskId: number, changes: Omit<Partial<Task>, 'id' | 'projectId'>) => void | Promise<void>
}

function addCalendarDays(value: Date, days: number): Date {
  const result = new Date(value)
  result.setDate(result.getDate() + days)
  return result
}

function taskColor(task: Task): string {
  if (task.boardColumn === 'done' || task.status === 'done') return 'timeline-gantt-task--done'
  if (task.boardColumn === 'in_progress' || task.status === 'in_progress') return 'timeline-gantt-task--active'
  return 'timeline-gantt-task--todo'
}

export function DhtmlxGanttTimeline({ projectName, tasks, milestones, zoom, anchorDate, focusToday, onTaskSelect, onUpdateTask }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<ReturnType<typeof Gantt.getGanttInstance> | null>(null)
  const taskIdsByGanttIdRef = useRef(new Map<string | number, number>())
  const mapped = useMemo(() => mapTasksToGantt(tasks, milestones), [tasks, milestones])
  const taskLookup = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const previewDays = zoom === 'day' ? 14 : zoom === 'week' ? 56 : 180
  const previewEnd = useMemo(() => addCalendarDays(anchorDate, previewDays), [anchorDate, previewDays])

  taskIdsByGanttIdRef.current = new Map(tasks.filter((task) => mapped.tasks.some((ganttTask) => ganttTask.id === task.id)).map((task) => [task.id, task.id]))

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const gantt = Gantt.getGanttInstance()
    ganttRef.current = gantt
    gantt.plugins({ keyboard_navigation: true, marker: true, tooltip: true })
    gantt.config.keyboard_navigation = true
    gantt.config.date_format = '%Y-%m-%d'
    gantt.config.duration_unit = 'day'
    gantt.config.duration_step = 1
    gantt.config.drag_move = true
    gantt.config.drag_resize = true
    gantt.config.drag_progress = false
    gantt.config.drag_links = true
    gantt.config.details_on_create = false
    gantt.config.details_on_dblclick = false
    gantt.config.show_errors = false
    gantt.config.row_height = 48
    gantt.config.bar_height = 22
    gantt.config.scale_height = 44
    gantt.config.grid_width = 250
    gantt.config.min_column_width = 42
    gantt.config.keep_grid_width = true
    gantt.config.fit_tasks = false
    gantt.config.columns = [
      { name: 'text', label: 'Task', tree: true, width: '*', sort: false },
      { name: 'owner', label: 'Owner', width: 112, sort: false, template: (task) => String(task.owner ?? '—') },
    ]
    gantt.templates.task_class = (_start, _end, task) => String(task.cssClass ?? '')
    const todayKey = formatLocalDateOnly(new Date())
    gantt.templates.scale_cell_class = (date) => formatLocalDateOnly(date) === todayKey ? 'timeline-gantt-today-cell' : ''
    gantt.templates.task_end_date = (date) => gantt.templates.task_date(addCalendarDays(date, -1))
    gantt.ext.zoom.init({
      levels: [
        { name: 'day', scale_height: 44, min_column_width: 54, scales: [{ unit: 'day', step: 1, format: '%D, %d %M' }] },
        { name: 'week', scale_height: 44, min_column_width: 72, scales: [{ unit: 'week', step: 1, format: (date) => `Week of ${gantt.date.date_to_str('%d %M')(date)}` }, { unit: 'day', step: 1, format: '%d' }] },
        { name: 'month', scale_height: 44, min_column_width: 58, scales: [{ unit: 'month', step: 1, format: '%F %Y' }, { unit: 'week', step: 1, format: (date) => gantt.date.date_to_str('%d %M')(date) }] },
      ],
    })
    gantt.init(host)

    const eventIds: string[] = []
    eventIds.push(gantt.attachEvent('onTaskClick', (id) => {
      const taskId = taskIdsByGanttIdRef.current.get(id)
      if (taskId !== undefined) onTaskSelect(taskId)
      return true
    }))
    eventIds.push(gantt.attachEvent('onAfterTaskDrag', (id, mode) => {
      if (mode !== 'move' && mode !== 'resize') return
      const taskId = taskIdsByGanttIdRef.current.get(id)
      if (taskId === undefined) return
      const task = gantt.getTask(id)
      if (!task.start_date || !task.end_date) return
      const startDate = formatLocalDateOnly(task.start_date)
      const endDate = fromGanttEndDate(task.end_date)
      if (parseLocalDateOnly(startDate) && parseLocalDateOnly(endDate)) void Promise.resolve(onUpdateTask(taskId, { startDate, endDate })).catch(() => undefined)
    }))

    const syncDependencyTarget = (target: string | number) => {
      const taskId = taskIdsByGanttIdRef.current.get(target)
      if (taskId === undefined || typeof target !== 'number') return
      const dependencyIds = gantt.getLinks()
        .filter((link) => link.target === target && typeof link.source === 'number' && taskIdsByGanttIdRef.current.has(link.source))
        .map((link) => link.source as number)
      void Promise.resolve(onUpdateTask(taskId, { dependencyIds })).catch(() => undefined)
    }
    eventIds.push(gantt.attachEvent('onLinkValidation', (link: GanttLink) => {
      return link.source !== link.target
        && taskIdsByGanttIdRef.current.has(link.source)
        && taskIdsByGanttIdRef.current.has(link.target)
    }))
    eventIds.push(gantt.attachEvent('onAfterLinkAdd', (_id, link) => syncDependencyTarget(link.target)))
    eventIds.push(gantt.attachEvent('onAfterLinkDelete', (_id, link) => syncDependencyTarget(link.target)))
    eventIds.push(gantt.attachEvent('onAfterLinkUpdate', (_id, link) => syncDependencyTarget(link.target)))

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 900
      gantt.config.grid_width = width < 560 ? 150 : width < 760 ? 190 : 250
      gantt.render()
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
      eventIds.forEach((id) => gantt.detachEvent(id))
      gantt.destructor()
      ganttRef.current = null
    }
  }, [onTaskSelect, onUpdateTask])

  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt) return
    const ganttTasks: GanttTask[] = mapped.tasks.map((task) => {
      const source = typeof task.id === 'number' ? taskLookup.get(task.id) : undefined
      return source ? { ...task, cssClass: taskColor(source) } : task
    })
    gantt.clearAll()
    gantt.parse({ data: ganttTasks, links: mapped.links })
    gantt.ext.zoom.setLevel(zoom)
    gantt.config.start_date = anchorDate
    gantt.config.end_date = previewEnd
    gantt.render()
    gantt.showDate(focusToday ? new Date() : anchorDate)
  }, [mapped, zoom, anchorDate, previewEnd, taskLookup, focusToday])

  const scheduledCount = mapped.tasks.filter((task) => typeof task.id === 'number').length

  return <section className="content-panel gantt-panel timeline-gantt-panel" aria-label="Project Gantt schedule">
    <div className="gantt-panel__heading">
      <div><h2>{projectName}</h2><p>{scheduledCount} scheduled tasks · {mapped.links.length} server dependencies</p></div>
    </div>
    {tasks.length === 0 ? <EmptyState title="No tasks in this project" detail="Add demo tasks to see them on the timeline." /> : <>
      <div ref={hostRef} className="timeline-gantt-host" role="region" aria-label="Interactive, horizontally scrollable project Gantt chart" tabIndex={0} />
      {mapped.unscheduledTaskIds.length > 0 && <p className="timeline-gantt-note" role="status">{mapped.unscheduledTaskIds.length} task{mapped.unscheduledTaskIds.length === 1 ? '' : 's'} omitted because a valid start and end date are not available. No dates were assigned.</p>}
      <p className="timeline-gantt-note">Drag or resize a task bar to save its dates. Add or remove dependency links to update the server schedule. Select a task row or bar to open its details.</p>
    </>}
  </section>
}
