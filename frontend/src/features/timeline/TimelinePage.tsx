import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
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
  const project = workspace.projects.find((item) => String(item.id) === projectId)
  const tasks = useMemo(() => workspace.tasks
    .filter((task) => task.projectId === project?.id)
    .sort((a, b) => (a.startDate || a.endDate).localeCompare(b.startDate || b.endDate)), [workspace.tasks, project?.id])
  const milestones = useMemo(() => (workspace.milestones ?? [])
    .filter((milestone) => milestone.projectId === project?.id)
    .sort((a, b) => a.date.localeCompare(b.date)), [workspace.milestones, project?.id])
  const today = parseLocalDateOnly(localDate(new Date())) ?? new Date()
  const rangeDays = zoom === 'day' ? 14 : zoom === 'week' ? 56 : 180
  const lookbackDays = zoom === 'day' ? 7 : zoom === 'week' ? 14 : 30
  const anchorDate = offsetDate(today, -lookbackDays + offset * rangeDays)
  const selectTimelineTask = useCallback((taskId: number) => navigate(`/tasks/${taskId}`), [])

  const changeOffset = (amount: number) => {
    setOffset((value) => value + amount)
    setFocusToday(false)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="PROJECT SCHEDULE · DEMO" title="Timeline & milestones" description="Project schedule from the shared browser demo workspace." actions={<div className="timeline-toolbar">
      <Select id="timeline-project" aria-label="Project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setOffset(0); setFocusToday(false) }} options={workspace.projects.map((item) => ({ value: String(item.id), label: item.name }))} />
      <div className="zoom-control" role="group" aria-label="Timeline zoom">{(['day', 'week', 'month'] as TimelineZoom[]).map((value) => <button type="button" key={value} className={zoom === value ? 'zoom-control__active' : ''} aria-pressed={zoom === value} onClick={() => { setZoom(value); setOffset(0); setFocusToday(false) }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <Button variant="secondary" size="sm" aria-label="Previous timeline range" onClick={() => changeOffset(-1)}>←</Button>
      <Button variant="secondary" size="sm" aria-label="Next timeline range" onClick={() => changeOffset(1)}>→</Button>
      <Button variant="secondary" size="sm" onClick={() => { setOffset(0); setFocusToday(true) }}>Today</Button>
    </div>} />
    <aside className="preview-notice" aria-label="Demo data notice"><span className="preview-notice__icon"><Icon name="timeline" /></span><p><strong>Browser demo schedule.</strong> Task date and dependency edits update this browser workspace only; they are not sent to the server. The backend has no dependency or milestone API.</p><span className="demo-label"><span />Demo data</span></aside>
    {!project ? <EmptyState title="No demo projects" detail="There are no projects available to display." /> : <>
      <section className="milestone-summary content-panel" aria-labelledby="milestone-heading">
        <div className="panel-heading"><div><h2 id="milestone-heading">Milestone progression</h2><p>{project.name} · checkpoints from the browser demo workspace</p></div><span className="demo-label"><span />Demo data</span></div>
        {milestones.length ? <div className="milestone-progression">{milestones.map((milestone, index) => <div className="milestone-progression__item" key={milestone.id}><span className={`milestone-progression__marker milestone-progression__marker--${milestone.status}`}>{milestone.status === 'complete' ? <Icon name="check" /> : <Icon name="clock" />}</span><strong>{milestone.title}</strong><small>{formatDate(milestone.date)}</small>{index < milestones.length - 1 && <span className={`milestone-progress-line${milestone.status === 'complete' ? ' milestone-progress-line--complete' : ''}`} />}</div>)}</div> : <p className="milestone-empty">No milestone data is available for this project.</p>}
      </section>
      <Suspense fallback={<LoadingState label="Loading project timeline…" />}>
        <DhtmlxGanttTimeline projectName={project.name} tasks={tasks} milestones={milestones} zoom={zoom} anchorDate={anchorDate} focusToday={focusToday} onTaskSelect={selectTimelineTask} onUpdateTask={updateTask} />
      </Suspense>
      <p className="board-canceled-note">Task bars use inclusive calendar dates. Dependency connectors show only explicit browser demo dependency links. Tasks without valid start and end dates remain unscheduled.</p>
    </>}
  </div>
}
