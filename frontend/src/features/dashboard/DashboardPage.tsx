import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { projectsApi, tasksApi } from '../../api/services'
import type { ProjectResponse, TaskResponse } from '../../api/models'
import { useAuth } from '../../app/AuthProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatDate, projectTone, taskTone } from '../../lib/format'
import { projectStatusLabel, taskStatusLabel, type ProjectStatus, type TaskStatus } from '../../types/domain'

type DashboardData = { projects: ProjectResponse[]; tasks: TaskResponse[] }

function normalizeProjectStatus(status: string): ProjectStatus {
  return status === 'completed' || status === 'cancelled' ? status : 'in_progress'
}

function normalizeTaskStatus(status: string): TaskStatus {
  return status === 'done' || status === 'in_progress' || status === 'canceled' ? status : 'todo'
}

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status >= 500) return 'The project service could not load your dashboard. Please try again shortly.'
  if (error instanceof ApiError && error.status === 403) return 'Your account cannot access this project data.'
  return error instanceof Error ? error.message : 'Could not load dashboard data. Please try again.'
}

export function DashboardPage() {
  const { user, expireSession } = useAuth()
  const [data, setData] = useState<DashboardData>({ projects: [], tasks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const loadDashboard = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const projects = await projectsApi.getAll()
      const taskGroups = await Promise.all(projects.map((project) => tasksApi.getByProject(project.id)))
      if (signal.aborted) return
      setData({ projects, tasks: taskGroups.flat() })
    } catch (loadError) {
      if (!signal.aborted) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          expireSession()
          setError('Your session expired. Sign in again to continue.')
        } else {
          setError(errorText(loadError))
        }
      }
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [expireSession])

  useEffect(() => {
    const controller = new AbortController()
    void loadDashboard(controller.signal)
    return () => controller.abort()
  }, [loadDashboard, reloadKey])

  const activeProjects = useMemo(() => data.projects.filter((project) => normalizeProjectStatus(project.status) === 'in_progress'), [data.projects])
  const openTasks = useMemo(() => data.tasks.filter((task) => {
    const status = normalizeTaskStatus(task.status)
    return status === 'todo' || status === 'in_progress'
  }), [data.tasks])
  const completedTasks = data.tasks.filter((task) => normalizeTaskStatus(task.status) === 'done').length
  const focusTasks = useMemo(() => [...openTasks]
    .sort((a, b) => (a.endDate || '9999-12-31').localeCompare(b.endDate || '9999-12-31'))
    .slice(0, 4), [openTasks])
  const projectsById = useMemo(() => new Map(data.projects.map((project) => [project.id, project])), [data.projects])
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'

  return <div className="dashboard-page">
    <PageHeader eyebrow="WORKSPACE OVERVIEW" title={`Good ${greeting}, ${firstName}`} description="A current view of projects and tasks you can access." actions={<Button variant="primary" onClick={() => navigate('/projects')}>Browse projects <Icon name="arrow" /></Button>} />

    {loading ? <LoadingState label="Loading your projects and tasks…" /> : error ? <ErrorState title="Dashboard could not load" detail={error} action={<Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>} /> : <>
      <section className="metric-grid" aria-label="Project and task summary">
        <article className="metric-card"><span>Active projects</span><strong>{activeProjects.length}</strong><small>Projects in progress</small></article>
        <article className="metric-card"><span>Open tasks</span><strong>{openTasks.length}</strong><small>To do or in progress</small></article>
        <article className="metric-card"><span>Completed tasks</span><strong>{completedTasks}</strong><small>Across accessible projects</small></article>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard sections">
        <section className="content-panel project-panel" aria-labelledby="projects-heading">
          <div className="panel-heading"><div><h2 id="projects-heading">Active projects</h2><p>Projects currently in progress</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all <Icon name="arrow" /></Button></div>
          <div className="project-list">{activeProjects.slice(0, 5).map((project, index) => {
            const tasks = data.tasks.filter((task) => task.projectId === project.id)
            const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + (Number(task.progress) || 0), 0) / tasks.length) : 0
            const status = normalizeProjectStatus(project.status)
            return <article className="project-row" key={project.id}>
              <span className={`project-icon project-icon--${index % 2 ? 'blue' : 'purple'}`} aria-hidden="true"><Icon name="folder" /></span>
              <button className="project-row__main table-link" onClick={() => navigate(`/projects/${project.id}`)}><strong>{project.name}</strong><span><Icon name="calendar" />{formatDate(project.startDate ?? '')} – {formatDate(project.endDate ?? '')}</span></button>
              <StatusBadge tone={projectTone(status)}>{projectStatusLabel(status)}</StatusBadge>
              <div className="progress-wrap"><div className="progress-wrap__labels"><span>Task progress</span><strong>{progress}%</strong></div><progress className="progress-bar" value={progress} max={100} aria-label={`${progress}% task progress for ${project.name}`} /></div>
              <span className="task-count-summary">{tasks.length} tasks</span>
              <Button className="row-chevron" variant="ghost" size="sm" aria-label={`Open ${project.name}`} onClick={() => navigate(`/projects/${project.id}`)}><Icon name="chevron" /></Button>
            </article>
          })}</div>
          {!activeProjects.length && <EmptyState title="No active projects" detail={data.projects.length ? 'Your accessible projects have no projects in progress.' : 'Projects you own or have joined will appear here.'} action={<Button variant="ghost" onClick={() => navigate('/projects')}>View projects</Button>} />}
          <div className="panel-footer"><span>Showing {Math.min(activeProjects.length, 5)} of {activeProjects.length} active projects</span></div>
        </section>

        <section className="content-panel insights-panel" aria-labelledby="focus-heading">
          <div className="panel-heading"><div><h2 id="focus-heading">Upcoming focus</h2><p>Open tasks with the nearest due dates</p></div></div>
          <div className="focus-list">{focusTasks.map((task) => <button type="button" className="focus-item focus-item--button" key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}>
            <span className="focus-item__icon focus-item__icon--blue"><Icon name="board" /></span><span className="focus-item__copy"><strong>{task.title}</strong><span>{projectsById.get(task.projectId)?.name ?? 'Project unavailable'}</span></span><span className="focus-item__date">{task.endDate ? formatDate(task.endDate) : 'No due date'}</span>
          </button>)}{!focusTasks.length && <div className="dashboard-empty">No open tasks due. <Button variant="ghost" onClick={() => navigate('/tasks')}>Open task board</Button></div>}</div>
          <div className="focus-footer"><span>Task board</span><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>Open board <Icon name="arrow" /></Button></div>
        </section>
      </section>

      <section className="today-section" aria-labelledby="today-heading"><div className="panel-heading"><div><h2 id="today-heading">Open tasks</h2><p>Tasks across projects you can access.</p></div><Button size="sm" variant="secondary" onClick={() => navigate('/tasks')}>View task board <Icon name="arrow" /></Button></div>
        <div className="today-list">{focusTasks.slice(0, 3).map((task) => {
          const status = normalizeTaskStatus(task.status)
          return <button className="today-row today-row--button" key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}><span className="task-check" aria-hidden="true"><Icon name="check" /></span><span className="today-row__title"><strong>{task.title}</strong><span className="today-row__meta"><span>{projectsById.get(task.projectId)?.name}</span><StatusBadge tone={taskTone(status)}>{taskStatusLabel(status)}</StatusBadge></span></span><span className="today-row__date"><Icon name="clock" />{task.endDate ? formatDate(task.endDate) : 'No due date'}</span></button>
        })}</div>
        <div className="demo-footnote"><Icon name="inbox" />Dashboard data is loaded from the project service.</div>
      </section>
    </>}
  </div>
}
