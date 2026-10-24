import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { projectMembersApi, tasksApi } from '../../api/services'
import type { TaskAssignee } from '../../api/models'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate, taskDetailPath } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { EmptyState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { formatDate } from '../../lib/format'
import { parseLocalDateOnly } from './ganttMapping'
import type { TimelineZoom } from './DhtmlxGanttTimeline'

const DhtmlxGanttTimeline = lazy(() => import('./DhtmlxGanttTimeline').then((module) => ({ default: module.DhtmlxGanttTimeline })))

type TimelineChanges = { startDate?: string; endDate?: string }
type TimelineDraft = Record<number, TimelineChanges>
type TimelineDraftState = { history: TimelineDraft[]; changes: TimelineDraft }
type TimelineDraftAction = { type: 'stage'; taskId: number; changes: TimelineChanges } | { type: 'undo' } | { type: 'clear' }

function timelineDraftReducer(state: TimelineDraftState, action: TimelineDraftAction): TimelineDraftState {
  if (action.type === 'clear') return { history: [], changes: {} }
  if (action.type === 'undo') {
    const previous = state.history.at(-1)
    return previous ? { history: state.history.slice(0, -1), changes: previous } : state
  }
  return {
    history: [...state.history, state.changes],
    changes: { ...state.changes, [action.taskId]: { ...state.changes[action.taskId], ...action.changes } },
  }
}

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
  const { workspace, refresh } = useDemoWorkspace()
  const [projectId, setProjectId] = useState(String(workspace.projects[0]?.id ?? ''))
  const [zoom, setZoom] = useState<TimelineZoom>('month')
  const [offset, setOffset] = useState(0)
  const [focusToday, setFocusToday] = useState(false)
  const [assigneeNames, setAssigneeNames] = useState<Record<number, string>>({})
  const [dependenciesByTask, setDependenciesByTask] = useState<Record<number, number[]>>({})
  const [dependenciesLoading, setDependenciesLoading] = useState(false)
  const [timelineError, setTimelineError] = useState('')
  const [timelineRevision, setTimelineRevision] = useState(0)
  const [canEditByProject, setCanEditByProject] = useState<Record<number, boolean>>({})
  const [permissionLoading, setPermissionLoading] = useState(true)
  const [permissionError, setPermissionError] = useState('')
  const [editing, setEditing] = useState(false)
  const [savingChanges, setSavingChanges] = useState(false)
  const [draft, dispatchDraft] = useReducer(timelineDraftReducer, { history: [], changes: {} })

  useEffect(() => {
    let active = true
    projectMembersApi.getVisibleProjects().then((visibleProjects) => {
      if (!active) return
      setCanEditByProject(Object.fromEntries(visibleProjects.map(({ id, canEditSchedule }) => [id, canEditSchedule])))
      setPermissionError('')
    }).catch((error: unknown) => {
      if (active) setPermissionError(error instanceof Error ? error.message : 'Could not verify timeline editing permissions.')
    }).finally(() => { if (active) setPermissionLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => { if (!projectId && workspace.projects[0]) setProjectId(String(workspace.projects[0].id)) }, [projectId, workspace.projects])
  const project = workspace.projects.find((item) => String(item.id) === projectId)
  const canEditSchedule = project ? canEditByProject[project.id] === true : false
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
    startDate: draft.changes[task.id]?.startDate ?? task.startDate,
    endDate: draft.changes[task.id]?.endDate ?? task.endDate,
    dependencyIds: dependenciesByTask[task.id] ?? [],
    assigneeName: assigneeNames[task.id] ?? '',
  })), [tasks, dependenciesByTask, assigneeNames, draft.changes])
  const milestones = useMemo(() => (workspace.milestones ?? [])
    .filter((milestone) => milestone.projectId === project?.id)
    .sort((a, b) => a.date.localeCompare(b.date)), [workspace.milestones, project?.id])
  const today = parseLocalDateOnly(localDate(new Date())) ?? new Date()
  const rangeDays = zoom === 'day' ? 14 : zoom === 'week' ? 56 : 180
  const lookbackDays = zoom === 'day' ? 7 : zoom === 'week' ? 14 : 30
  const anchorDate = offsetDate(today, -lookbackDays + offset * rangeDays)
  const selectTimelineTask = useCallback((taskId: number) => navigate(taskDetailPath(taskId, '/timeline')), [])

  const stageTimelineTask = useCallback((taskId: number, changes: TimelineChanges) => {
    if (!editing || !canEditSchedule) return
    setTimelineError('')
    dispatchDraft({ type: 'stage', taskId, changes })
  }, [editing, canEditSchedule])

  const hasPendingChanges = useMemo(() => Object.entries(draft.changes).some(([id, changes]) => {
    const task = tasks.find((item) => item.id === Number(id))
    if (!task) return false
    const datesChanged = (changes.startDate !== undefined && changes.startDate !== task.startDate)
      || (changes.endDate !== undefined && changes.endDate !== task.endDate)
    return datesChanged
  }), [draft.changes, tasks])

  const saveTimelineChanges = useCallback(async () => {
    if (!project || !canEditSchedule || !hasPendingChanges) return
    setSavingChanges(true)
    setTimelineError('')
    try {
      const scheduledUpdates = Object.entries(draft.changes).flatMap(([id, changes]) => {
        const taskId = Number(id)
        const task = tasks.find((item) => item.id === taskId)
        if (!task || task.startDate == null || task.endDate == null) return []
        const startDate = changes.startDate ?? task.startDate
        const endDate = changes.endDate ?? task.endDate
        if (startDate === task.startDate && endDate === task.endDate) return []
        return [{ taskId, startDate, endDate }]
      })
      if (!scheduledUpdates.length) return
      await tasksApi.updateSchedules({ projectId: project.id, tasks: scheduledUpdates })
      await refresh()
      dispatchDraft({ type: 'clear' })
      setEditing(false)
      setTimelineRevision((value) => value + 1)
    } catch (error) {
      setTimelineError(error instanceof Error ? `Could not save timeline changes. Your draft is still available to retry. ${error.message}` : 'Could not save timeline changes. Your draft is still available to retry.')
    } finally {
      setSavingChanges(false)
    }
  }, [project, canEditSchedule, hasPendingChanges, draft.changes, tasks, refresh])

  function cancelTimelineChanges() {
    if (hasPendingChanges && !window.confirm('Discard all unsaved timeline changes?')) return
    dispatchDraft({ type: 'clear' })
    setEditing(false)
    setTimelineError('')
    setTimelineRevision((value) => value + 1)
  }

  const changeOffset = (amount: number) => {
    setOffset((value) => value + amount)
    setFocusToday(false)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="PROJECT SCHEDULE" title="Timeline & milestones" description="Task dates are loaded from your server projects." actions={<div className="timeline-toolbar">
      <Select id="timeline-project" aria-label="Project" value={projectId} disabled={editing || savingChanges} onChange={(event) => { dispatchDraft({ type: 'clear' }); setEditing(false); setProjectId(event.target.value); setOffset(0); setFocusToday(false) }} options={workspace.projects.map((item) => ({ value: String(item.id), label: item.name }))} />
      <div className="zoom-control" role="group" aria-label="Timeline zoom">{(['day', 'week', 'month'] as TimelineZoom[]).map((value) => <button type="button" key={value} className={zoom === value ? 'zoom-control__active' : ''} aria-pressed={zoom === value} onClick={() => { setZoom(value); setOffset(0); setFocusToday(false) }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <Button variant="secondary" size="sm" aria-label="Previous timeline range" onClick={() => changeOffset(-1)}>←</Button>
      <Button variant="secondary" size="sm" aria-label="Next timeline range" onClick={() => changeOffset(1)}>→</Button>
      <Button variant="secondary" size="sm" onClick={() => { setOffset(0); setFocusToday(true) }}>Today</Button>
    </div>} />
    {timelineError && <div className="team-members-feedback team-members-feedback--error" role="alert">{timelineError}</div>}
    {!project ? <EmptyState title="No projects" detail="There are no server projects available to display." /> : <>
      <section className="milestone-summary content-panel" aria-labelledby="milestone-heading">
        <div className="panel-heading"><div><h2 id="milestone-heading">Milestone progression</h2><p>{project.name} · milestones require a backend endpoint</p></div><span className="demo-label"><span />Preview</span></div>
        {milestones.length ? <div className="milestone-progression">{milestones.map((milestone, index) => <div className="milestone-progression__item" key={milestone.id}><span className={`milestone-progression__marker milestone-progression__marker--${milestone.status}`}>{milestone.status === 'complete' ? <Icon name="check" /> : <Icon name="clock" />}</span><strong>{milestone.title}</strong><small>{formatDate(milestone.date)}</small>{index < milestones.length - 1 && <span className={`milestone-progress-line${milestone.status === 'complete' ? ' milestone-progress-line--complete' : ''}`} />}</div>)}</div> : <p className="milestone-empty">No milestone data is available for this project.</p>}
      </section>
      <Suspense fallback={<LoadingState label="Loading project timeline…" />}>
        {dependenciesLoading ? <LoadingState label="Loading task assignments and dependencies…" /> : <DhtmlxGanttTimeline key={timelineRevision} projectName={project.name} tasks={timelineTasks} milestones={milestones} zoom={zoom} anchorDate={anchorDate} focusToday={focusToday} editable={editing && canEditSchedule} canEditSchedule={canEditSchedule} permissionLoading={permissionLoading} permissionError={permissionError} savingChanges={savingChanges} canUndo={draft.history.length > 0} hasPendingChanges={hasPendingChanges} onEdit={() => setEditing(true)} onUndo={() => dispatchDraft({ type: 'undo' })} onCancel={cancelTimelineChanges} onSave={() => void saveTimelineChanges()} onTaskSelect={selectTimelineTask} onUpdateTask={stageTimelineTask} />}
      </Suspense>
      <p className="board-canceled-note">Task bars use inclusive calendar dates. Tasks without valid start and end dates remain unscheduled.</p>
    </>}
  </div>
}
