import { useEffect, useMemo, useRef } from 'react'
import { Gantt, type Task as GanttTask } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { getSettingsPreferences } from '../../app/settingsPreferences'
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
  editable: boolean
  canEditSchedule: boolean
  permissionLoading: boolean
  permissionError: string
  savingChanges: boolean
  canUndo: boolean
  hasPendingChanges: boolean
  onEdit: () => void
  onUndo: () => void
  onCancel: () => void
  onSave: () => void
  onTaskSelect: (taskId: number) => void
  onUpdateTask: (taskId: number, changes: { startDate?: string; endDate?: string }) => void
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

export function DhtmlxGanttTimeline({ projectName, tasks, milestones, zoom, anchorDate, focusToday, editable, canEditSchedule, permissionLoading, permissionError, savingChanges, canUndo, hasPendingChanges, onEdit, onUndo, onCancel, onSave, onTaskSelect, onUpdateTask }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<ReturnType<typeof Gantt.getGanttInstance> | null>(null)
  const taskIdsByGanttIdRef = useRef(new Map<string | number, number>())
  const editableRef = useRef(editable)
  const onTaskSelectRef = useRef(onTaskSelect)
  const onUpdateTaskRef = useRef(onUpdateTask)
  const lastViewRef = useRef<{ projectName: string; zoom: TimelineZoom; anchor: number; focusToday: boolean } | null>(null)
  const mapped = useMemo(() => mapTasksToGantt(tasks, milestones), [tasks, milestones])
  const taskLookup = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const previewDays = zoom === 'day' ? 14 : zoom === 'week' ? 56 : 180
  const previewEnd = useMemo(() => addCalendarDays(anchorDate, previewDays), [anchorDate, previewDays])

  taskIdsByGanttIdRef.current = new Map(tasks.filter((task) => mapped.tasks.some((ganttTask) => ganttTask.id === task.id)).map((task) => [task.id, task.id]))

  useEffect(() => { editableRef.current = editable; onTaskSelectRef.current = onTaskSelect; onUpdateTaskRef.current = onUpdateTask }, [editable, onTaskSelect, onUpdateTask])

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
    gantt.config.start_on_monday = getSettingsPreferences().weekStartsOn === 'monday'
    gantt.config.readonly = true
    gantt.config.drag_move = false
    gantt.config.drag_resize = false
    gantt.config.drag_progress = false
    gantt.config.drag_links = false
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
      if (!editableRef.current && taskId !== undefined) onTaskSelectRef.current(taskId)
      return true
    }))
    eventIds.push(gantt.attachEvent('onAfterTaskDrag', (id, mode) => {
      if (!editableRef.current) return
      if (mode !== 'move' && mode !== 'resize') return
      const taskId = taskIdsByGanttIdRef.current.get(id)
      if (taskId === undefined) return
      const task = gantt.getTask(id)
      if (!task.start_date || !task.end_date) return
      const startDate = formatLocalDateOnly(task.start_date)
      const endDate = fromGanttEndDate(task.end_date)
      if (parseLocalDateOnly(startDate) && parseLocalDateOnly(endDate)) onUpdateTaskRef.current(taskId, { startDate, endDate })
    }))

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
  }, [])

  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt) return
    gantt.config.readonly = !editable
    gantt.config.drag_move = editable
    gantt.config.drag_resize = editable
    gantt.config.drag_links = false
    gantt.render()
  }, [editable])

  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt) return
    const ganttTasks: GanttTask[] = mapped.tasks.map((task) => {
      const source = typeof task.id === 'number' ? taskLookup.get(task.id) : undefined
      return source ? { ...task, cssClass: taskColor(source) } : task
    })
    const previousScroll = gantt.getScrollState()
    gantt.clearAll()
    gantt.parse({ data: ganttTasks, links: mapped.links })
    gantt.ext.zoom.setLevel(zoom)
    gantt.config.start_date = anchorDate
    gantt.config.end_date = previewEnd
    gantt.render()
    const previousView = lastViewRef.current
    const preserveViewport = previousView?.projectName === projectName
      && previousView.zoom === zoom
      && previousView.anchor === anchorDate.getTime()
      && previousView.focusToday === focusToday
    if (preserveViewport) {
      gantt.scrollTo(previousScroll.x, previousScroll.y)
    } else {
      gantt.showDate(focusToday ? new Date() : anchorDate)
    }
    lastViewRef.current = { projectName, zoom, anchor: anchorDate.getTime(), focusToday }
  }, [mapped, projectName, zoom, anchorDate, previewEnd, taskLookup, focusToday])

  const scheduledCount = mapped.tasks.filter((task) => typeof task.id === 'number').length

  return <section className="content-panel gantt-panel timeline-gantt-panel" aria-label="Project Gantt schedule">
    <div className="gantt-panel__heading">
      <div><h2>{projectName}</h2><p>{scheduledCount} scheduled tasks · {mapped.links.length} server dependencies</p></div>
      <div className="timeline-edit-actions">
        {permissionLoading ? <span className="timeline-permission-note">Checking edit permission…</span>
          : canEditSchedule && !permissionError
            ? editable ? <>
              <Button variant="ghost" size="sm" disabled={!canUndo || savingChanges} onClick={onUndo}>Undo</Button>
              <Button variant="secondary" size="sm" disabled={savingChanges} onClick={onCancel}>Cancel</Button>
              <Button variant="primary" size="sm" disabled={!hasPendingChanges || savingChanges} onClick={onSave}>{savingChanges ? 'Saving…' : 'Save changes'}</Button>
              {hasPendingChanges && <span className="timeline-unsaved-badge">Unsaved</span>}
            </> : <Button variant="primary" size="sm" onClick={onEdit}>Edit timeline</Button>
            : <span className="timeline-permission-note">{permissionError ? 'Edit permission unavailable' : 'View only · owner or leader can edit'}</span>}
      </div>
    </div>
    {permissionError && <p className="timeline-permission-error" role="status">{permissionError}</p>}
    {tasks.length === 0 ? <EmptyState title="No tasks in this project" detail="Add demo tasks to see them on the timeline." /> : <>
      <div ref={hostRef} className="timeline-gantt-host" role="region" aria-label="Interactive, horizontally scrollable project Gantt chart" tabIndex={0} />
      {mapped.unscheduledTaskIds.length > 0 && <p className="timeline-gantt-note" role="status">{mapped.unscheduledTaskIds.length} task{mapped.unscheduledTaskIds.length === 1 ? '' : 's'} omitted because a valid start and end date are not available. No dates were assigned.</p>}
      <p className="timeline-gantt-note">{editable ? 'Move a task bar or drag either edge to change its dates. Changes stay as a draft until you save.' : 'Timeline is read only. Select a task row or bar to open its details.'} Dependencies are shown on the chart.</p>
    </>}
  </section>
}
