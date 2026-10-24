import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { tasksApi } from '../../api/services'
import type { TaskAssignee } from '../../api/models'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { EmptyState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { formatDate } from '../../lib/format'
import { parseLocalDateOnly } from './ganttMapping'
import type { TimelineZoom } from './DhtmlxGanttTimeline'

const DhtmlxGanttTimeline = lazy(() => import('./DhtmlxGanttTimeline').then((module) => ({ default: module.DhtmlxGanttTimeline })))

function localDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function offsetDate(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function TimelinePage() {
  const { workspace, updateTask } = useDemoWorkspace()
  const [projectId, setProjectId] = useState(String(workspace.projects[0]?.id ?? ''))
  const [zoom, setZoom] = useState<TimelineZoom>('month')
  const [offset, setOffset] = useState(0)
  const [focusToday, setFocusToday] = useState(false)
  const [assigneeNames, setAssigneeNames] = useState<Record<number, string>>({})
  const [dependenciesByTask, setDependenciesByTask] = useState<Record<number, number[]>>({})
  const [dependenciesLoading, setDependenciesLoading] = useState(false)
  const [timelineError, setTimelineError] = useState('')
  const [timelineRevision, setTimelineRevision] = useState(0)
  useEffect(() => { if (!projectId && workspace.projects[0]) setProjectId(String(workspace.projects[0].id)) }, [projectId, workspace.projects])
  const project = workspace.projects.find((item) => String(item.id) === projectId)
  const tasks = useMemo(() => workspace.tasks
    .filter((task) => task.projectId === project?.id)
    .sort((a, b) => (a.startDate || a.endDate).localeCompare(b.startDate || b.endDate)), [workspace.tasks, project?.id])
  useEffect(() => {
    if (!project) { setDependenciesByTask({}); setAssigneeNames({}); return }
    let active = true
    setDependenciesLoading(true)
    setTimelineError('')
    Promise.all(tasks.map(async (task) => {
      const [dependencies, assignees] = await Promise.all([tasksApi.getDependencies(task.id), tasksApi.getAssignees(task.id)])
      return [task.id, dependencies.map((item) => item.dependsOnTaskId), assignees.map((item: TaskAssignee) => item.userName).join(', ')] as const
    })).then((rows) => {
      if (!active) return
      setDependenciesByTask(Object.fromEntries(rows.map(([taskId, ids]) => [taskId, ids])))
      setAssigneeNames(Object.fromEntries(rows.map(([taskId, _ids, names]) => [taskId, names])))
    }).catch((error: unknown) => {
      if (active) setTimelineError(error instanceof Error ? error.message : 'Could not load timeline assignments and dependencies.')
    }).finally(() => { if (active) setDependenciesLoading(false) })
    return () => { active = false }
  }, [project?.id, tasks])
  const timelineTasks = useMemo(() => tasks.map((task) => ({
    ...task,
    dependencyIds: dependenciesByTask[task.id] ?? [],
    assigneeName: assigneeNames[task.id] ?? '',
  })), [tasks, dependenciesByTask, assigneeNames])
  const milestones = useMemo(() => (workspace.milestones ?? [])
    .filter((milestone) => milestone.projectId === project?.id)
    .sort((a, b) => a.date.localeCompare(b.date)), [workspace.milestones, project?.id])
  const today = parseLocalDateOnly(localDate(new Date())) ?? new Date()
  const rangeDays = zoom === 'day' ? 14 : zoom === 'week' ? 56 : 180
  const lookbackDays = zoom === 'day' ? 7 : zoom === 'week' ? 14 : 30
  const anchorDate = offsetDate(today, -lookbackDays + offset * rangeDays)
  const selectTimelineTask = useCallback((taskId: number) => navigate(`/tasks/${taskId}`), [])

  const saveTimelineTask = useCallback(async (taskId: number, changes: Parameters<typeof updateTask>[1]) => {
    setTimelineError('')
    try {
      if (changes.dependencyIds) {
        const current = dependenciesByTask[taskId] ?? []
        const next = changes.dependencyIds
        await Promise.all([
          ...current.filter((id) => !next.includes(id)).map((dependsOnTaskId) => tasksApi.removeDependency(taskId, dependsOnTaskId)),
          ...next.filter((id) => !current.includes(id)).map((dependsOnTaskId) => tasksApi.addDependency(taskId, dependsOnTaskId)),
        ])
        setDependenciesByTask((value) => ({ ...value, [taskId]: next }))
      }
      if (changes.startDate !== undefined || changes.endDate !== undefined) await updateTask(taskId, changes)
      setTimelineRevision((value) => value + 1)
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : 'The timeline change could not be saved.')
      setTimelineRevision((value) => value + 1)
      throw error
    }
  }, [dependenciesByTask, updateTask])

  const changeOffset = (amount: number) => {
    setOffset((value) => value + amount)
    setFocusToday(false)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="PROJECT SCHEDULE" title="Timeline & milestones" description="Task dates are loaded from your server projects." actions={<div className="timeline-toolbar">
      <Select id="timeline-project" aria-label="Project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setOffset(0); setFocusToday(false) }} options={workspace.projects.map((item) => ({ value: String(item.id), label: item.name }))} />
      <div className="zoom-control" role="group" aria-label="Timeline zoom">{(['day', 'week', 'month'] as TimelineZoom[]).map((value) => <button type="button" key={value} className={zoom === value ? 'zoom-control__active' : ''} aria-pressed={zoom === value} onClick={() => { setZoom(value); setOffset(0); setFocusToday(false) }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <Button variant="secondary" size="sm" aria-label="Previous timeline range" onClick={() => changeOffset(-1)}>←</Button>
      <Button variant="secondary" size="sm" aria-label="Next timeline range" onClick={() => changeOffset(1)}>→</Button>
      <Button variant="secondary" size="sm" onClick={() => { setOffset(0); setFocusToday(true) }}>Today</Button>
    </div>} />
    <aside className="preview-notice" aria-label="API capability notice"><span className="preview-notice__icon"><Icon name="timeline" /></span><p><strong>Server task schedule.</strong> Task dates, assignees, and dependencies load from the backend; date and dependency edits are saved there. Milestones remain preview-only.</p><span className="demo-label"><span />API</span></aside>
    {timelineError && <div className="team-members-feedback team-members-feedback--error" role="alert">{timelineError}</div>}
    {!project ? <EmptyState title="No projects" detail="There are no server projects available to display." /> : <>
      <section className="milestone-summary content-panel" aria-labelledby="milestone-heading">
        <div className="panel-heading"><div><h2 id="milestone-heading">Milestone progression</h2><p>{project.name} · milestones require a backend endpoint</p></div><span className="demo-label"><span />Preview</span></div>
        {milestones.length ? <div className="milestone-progression">{milestones.map((milestone, index) => <div className="milestone-progression__item" key={milestone.id}><span className={`milestone-progression__marker milestone-progression__marker--${milestone.status}`}>{milestone.status === 'complete' ? <Icon name="check" /> : <Icon name="clock" />}</span><strong>{milestone.title}</strong><small>{formatDate(milestone.date)}</small>{index < milestones.length - 1 && <span className={`milestone-progress-line${milestone.status === 'complete' ? ' milestone-progress-line--complete' : ''}`} />}</div>)}</div> : <p className="milestone-empty">No milestone data is available for this project.</p>}
      </section>
      <Suspense fallback={<LoadingState label="Loading project timeline…" />}>
        {dependenciesLoading ? <LoadingState label="Loading task assignments and dependencies…" /> : <DhtmlxGanttTimeline key={timelineRevision} projectName={project.name} tasks={timelineTasks} milestones={milestones} zoom={zoom} anchorDate={anchorDate} focusToday={focusToday} onTaskSelect={selectTimelineTask} onUpdateTask={saveTimelineTask} />}
      </Suspense>
      <p className="board-canceled-note">Task bars use inclusive calendar dates. Tasks without valid start and end dates remain unscheduled.</p>
    </>}
  </div>
}
