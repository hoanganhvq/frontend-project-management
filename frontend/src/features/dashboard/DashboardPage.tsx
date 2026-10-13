import { useMemo } from 'react'
import { navigate } from '../../app/router'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, projectTone, taskTone } from '../../lib/format'
import { projectStatusLabel, taskStatusLabel } from '../../types/domain'

export function DashboardPage() {
  const { workspace } = useDemoWorkspace()
  const activeProjects = workspace.projects.filter((project) => project.status === 'in_progress')
  const openTasks = workspace.tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress')
  const completedTasks = workspace.tasks.filter((task) => task.status === 'done').length
  const focusTasks = useMemo(() => [...openTasks].sort((a, b) => (a.endDate || '9999').localeCompare(b.endDate || '9999')).slice(0, 4), [workspace.tasks])

  return <div className="dashboard-page">
    <PageHeader eyebrow="WORKSPACE OVERVIEW" title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${workspace.profile.name.split(' ')[0]}`} description="A focused view of work in your browser demo workspace." actions={<Button variant="primary" onClick={() => navigate('/projects')}>Browse projects <Icon name="arrow" /></Button>} />
    <aside className="preview-notice" aria-label="Demo data notice"><span className="preview-notice__icon"><Icon name="sparkles" /></span><p><strong>Demo workspace.</strong> Project and task figures below come from editable sample data stored in this browser. They are not server data.</p><span className="demo-label"><span aria-hidden="true" />Demo data</span></aside>
    <section className="metric-grid" aria-label="Demo workspace summary">
      <article className="metric-card"><span>Active projects</span><strong>{activeProjects.length}</strong><small>From this browser’s demo data</small></article>
      <article className="metric-card"><span>Open tasks</span><strong>{openTasks.length}</strong><small>To do or in progress</small></article>
      <article className="metric-card"><span>Completed tasks</span><strong>{completedTasks}</strong><small>Marked done in the demo</small></article>
    </section>
    <section className="dashboard-grid" aria-label="Dashboard sections">
      <section className="content-panel project-panel" aria-labelledby="projects-heading">
        <div className="panel-heading"><div><h2 id="projects-heading">Active projects</h2><p>Current progress is illustrative demo data</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all <Icon name="arrow" /></Button></div>
        <div className="project-list">{activeProjects.slice(0, 5).map((project, index) => {
          const tasks = workspace.tasks.filter((task) => task.projectId === project.id)
          const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0
          return <article className="project-row" key={project.id}>
            <span className={`project-icon project-icon--${index % 2 ? 'blue' : 'purple'}`} aria-hidden="true"><Icon name="folder" /></span>
            <button className="project-row__main table-link" onClick={() => navigate(`/projects/${project.id}`)}><strong>{project.name}</strong><span><Icon name="calendar" />{formatDate(project.startDate)} – {formatDate(project.endDate)}</span></button>
            <StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge>
            <div className="progress-wrap"><div className="progress-wrap__labels"><span>Demo progress</span><strong>{progress}%</strong></div><progress className="progress-bar" value={progress} max={100} aria-label={`${progress}% demo progress for ${project.name}`} /></div>
            <span className="task-count-summary">{tasks.length} tasks</span>
            <Button className="row-chevron" variant="ghost" size="sm" aria-label={`Open ${project.name}`} onClick={() => navigate(`/projects/${project.id}`)}><Icon name="chevron" /></Button>
          </article>
        })}</div>
        {!activeProjects.length && <div className="dashboard-empty">No active demo projects. <Button variant="ghost" onClick={() => navigate('/projects')}>View projects</Button></div>}
        <div className="panel-footer"><span>Showing {activeProjects.length} active demo projects</span><span className="panel-footer__note">Browser only</span></div>
      </section>
      <section className="content-panel insights-panel" aria-labelledby="focus-heading">
        <div className="panel-heading"><div><h2 id="focus-heading">Upcoming focus</h2><p>Open tasks with the nearest due dates</p></div><span className="demo-label"><span />Demo data</span></div>
        <div className="focus-list">{focusTasks.map((task) => <button type="button" className="focus-item focus-item--button" key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}>
          <span className="focus-item__icon focus-item__icon--blue"><Icon name="board" /></span><span className="focus-item__copy"><strong>{task.title}</strong><span>{workspace.projects.find((project) => project.id === task.projectId)?.name ?? 'Project unavailable'}</span></span><span className="focus-item__date">{task.endDate ? formatDate(task.endDate) : 'No due date'}</span>
        </button>)}{!focusTasks.length && <div className="dashboard-empty">No open demo tasks. <Button variant="ghost" onClick={() => navigate('/tasks')}>Open task board</Button></div>}</div>
        <div className="focus-footer"><span>Task board</span><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>Open board <Icon name="arrow" /></Button></div>
      </section>
    </section>
    <section className="today-section" aria-labelledby="today-heading"><div className="panel-heading"><div><h2 id="today-heading">Open tasks</h2><p>Change task status and priority from the task board.</p></div><Button size="sm" variant="secondary" onClick={() => navigate('/tasks')}>View task board <Icon name="arrow" /></Button></div>
      <div className="today-list">{focusTasks.slice(0, 3).map((task) => <button className="today-row today-row--button" key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}><span className="task-check" aria-hidden="true"><Icon name="check" /></span><span className="today-row__title"><strong>{task.title}</strong><span className="today-row__meta"><span>{workspace.projects.find((project) => project.id === task.projectId)?.name}</span><StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge></span></span><span className="today-row__date"><Icon name="clock" />{task.endDate ? formatDate(task.endDate) : 'No due date'}</span></button>)}</div>
      <div className="demo-footnote"><Icon name="inbox" />Dashboard values are calculated from browser-local demo data; they are not backend metrics.</div>
    </section>
  </div>
}
