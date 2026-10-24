import { useMemo } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate, taskDetailPath } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { formatDate, formatNumber, projectTone, taskTone, toLocalDateInput } from '../../lib/format'
import { projectStatusLabel, taskStatusLabel, type ProjectStatus, type TaskStatus } from '../../types/domain'

function normalizeProjectStatus(status: ProjectStatus): ProjectStatus {
  return status === 'completed' || status === 'cancelled' ? status : 'in_progress'
}

function normalizeTaskStatus(status: TaskStatus): TaskStatus {
  return status === 'done' || status === 'in_progress' || status === 'canceled' ? status : 'todo'
}

export function DashboardPage() {
  const { user } = useAuth()
  const { workspace, workspaceStatus, refresh } = useDemoWorkspace()
  const data = { projects: workspace.projects, tasks: workspace.tasks }

  const activeProjects = useMemo(() => data.projects.filter((project) => normalizeProjectStatus(project.status) === 'in_progress'), [data.projects])
  const openTasks = useMemo(() => data.tasks.filter((task) => {
    const status = normalizeTaskStatus(task.status)
    return status === 'todo' || status === 'in_progress'
  }), [data.tasks])
  const completedTasks = data.tasks.filter((task) => normalizeTaskStatus(task.status) === 'done').length
  const today = toLocalDateInput(new Date())
  const dueSoonDate = new Date()
  dueSoonDate.setDate(dueSoonDate.getDate() + 7)
  const dueSoonThrough = toLocalDateInput(dueSoonDate)
  const overdueTasks = useMemo(() => openTasks.filter((task) => !!task.endDate && task.endDate < today), [openTasks, today])
  const dueSoonTasks = useMemo(() => openTasks.filter((task) => !!task.endDate && task.endDate >= today && task.endDate <= dueSoonThrough), [openTasks, today, dueSoonThrough])
  const focusTasks = useMemo(() => [...openTasks]
    .sort((a, b) => (a.endDate || '9999-12-31').localeCompare(b.endDate || '9999-12-31'))
    .slice(0, 4), [openTasks])
  const projectsById = useMemo(() => new Map(data.projects.map((project) => [project.id, project])), [data.projects])
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'

  return <div className="dashboard-page">
    <PageHeader eyebrow="WORKSPACE OVERVIEW" title={`Good ${greeting}, ${firstName}`} description="A current view of projects and tasks you can access." actions={<Button variant="primary" onClick={() => navigate('/projects')}>Browse projects <Icon name="arrow" /></Button>} />

    {workspaceStatus === 'loading' ? <LoadingState label="Loading your projects and tasks…" /> : workspaceStatus === 'error' ? <ErrorState title="Dashboard could not load" detail="The project service could not load your workspace. Check the connection and retry." action={<Button variant="secondary" onClick={() => void refresh()}>Try again</Button>} /> : <>
      <section className="metric-grid" aria-label="Project and task summary">
        <article className="metric-card"><span>Active projects</span><strong>{formatNumber(activeProjects.length)}</strong><small>Projects in progress</small></article>
        <article className="metric-card"><span>Open tasks</span><strong>{formatNumber(openTasks.length)}</strong><small>To do or in progress</small></article>
        <article className="metric-card"><span>Completed tasks</span><strong>{formatNumber(completedTasks)}</strong><small>Across accessible projects</small></article>
        <article className="metric-card"><span>Overdue tasks</span><strong>{formatNumber(overdueTasks.length)}</strong><small>Open tasks past their due date</small></article>
        <article className="metric-card"><span>Due in 7 days</span><strong>{formatNumber(dueSoonTasks.length)}</strong><small>Including tasks due today</small></article>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard sections">
        <section className="content-panel project-panel" aria-labelledby="projects-heading">
          <div className="panel-heading"><div><h2 id="projects-heading">Active projects</h2><p>Projects currently in progress</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all <Icon name="arrow" /></Button></div>
          <div className="project-list">{activeProjects.slice(0, 5).map((project, index) => {
            const tasks = data.tasks.filter((task) => task.projectId === project.id)
            const progressTasks = tasks.filter((task) => task.status !== 'canceled')
            const progress = progressTasks.length ? Math.round(progressTasks.filter((task) => task.status === 'done').length / progressTasks.length * 100) : 0
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
          <div className="focus-list">{focusTasks.map((task) => <button type="button" className="focus-item focus-item--button" key={task.id} onClick={() => navigate(taskDetailPath(task.id, '/dashboard'))}>
            <span className="focus-item__icon focus-item__icon--blue"><Icon name="board" /></span><span className="focus-item__copy"><strong>{task.title}</strong><span>{projectsById.get(task.projectId)?.name ?? 'Project unavailable'}</span></span><span className="focus-item__date">{task.endDate ? formatDate(task.endDate) : 'No due date'}</span>
          </button>)}{!focusTasks.length && <div className="dashboard-empty">No open tasks due. <Button variant="ghost" onClick={() => navigate('/tasks')}>Open task board</Button></div>}</div>
          <div className="focus-footer"><span>Task board</span><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>Open board <Icon name="arrow" /></Button></div>
        </section>
      </section>

      <section className="today-section" aria-labelledby="today-heading"><div className="panel-heading"><div><h2 id="today-heading">Open tasks</h2><p>Tasks across projects you can access.</p></div><Button size="sm" variant="secondary" onClick={() => navigate('/tasks')}>View task board <Icon name="arrow" /></Button></div>
        <div className="today-list">{focusTasks.slice(0, 3).map((task) => {
          const status = normalizeTaskStatus(task.status)
          return <button className="today-row today-row--button" key={task.id} onClick={() => navigate(taskDetailPath(task.id, '/dashboard'))}><span className="task-check" aria-hidden="true"><Icon name="check" /></span><span className="today-row__title"><strong>{task.title}</strong><span className="today-row__meta"><span>{projectsById.get(task.projectId)?.name}</span><StatusBadge tone={taskTone(status)}>{taskStatusLabel(status)}</StatusBadge></span></span><span className="today-row__date"><Icon name="clock" />{task.endDate ? formatDate(task.endDate) : 'No due date'}</span></button>
        })}</div>
      </section>
    </>}
  </div>
}
