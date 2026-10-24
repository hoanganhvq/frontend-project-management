import { useMemo } from 'react'
import { navigate } from '../../app/router'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, projectTone, taskTone, toLocalDateInput } from '../../lib/format'
import { projectStatusLabel, taskStatusLabel } from '../../types/domain'

export function DashboardPage() {
  const { workspace } = useDemoWorkspace()
  const today = toLocalDateInput(new Date())
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 7)
  const soon = toLocalDateInput(soonDate)
  const activeProjects = workspace.projects.filter((project) => project.status === 'in_progress')
  const openTasks = workspace.tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress')
  const overdueTasks = openTasks.filter((task) => task.endDate && task.endDate < today)
  const dueSoonTasks = openTasks.filter((task) => task.endDate && task.endDate >= today && task.endDate <= soon)
  const needsAttention = useMemo(() => openTasks
    .filter((task) => task.endDate && task.endDate <= soon)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 5), [workspace.tasks, soon])
  const recentActivity = useMemo(() => [...workspace.notifications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4), [workspace.notifications])
  const hour = new Date().getHours()

  return <div className="dashboard-page">
    <PageHeader eyebrow="WORKSPACE OVERVIEW" title={`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${workspace.profile.name.split(' ')[0]}`} actions={<Button variant="primary" onClick={() => navigate('/projects')}>Browse projects <Icon name="arrow" /></Button>} />
    <aside className="preview-notice" aria-label="Data source"><span className="preview-notice__icon"><Icon name="sparkles" /></span><p><strong>Server workspace.</strong> Project and task totals are loaded from your account’s accessible projects.</p><span className="demo-label"><span aria-hidden="true" />API</span></aside>
    <section className="metric-grid" aria-label="Workspace summary">
      <article className="metric-card"><span>Active projects</span><strong>{activeProjects.length}</strong><small>From the server</small></article>
      <article className="metric-card"><span>Open tasks</span><strong>{openTasks.length}</strong><small>To do or in progress</small></article>
      <article className="metric-card"><span>Overdue</span><strong>{overdueTasks.length}</strong><small>Open tasks past deadline</small></article>
      <article className="metric-card"><span>Due in 7 days</span><strong>{dueSoonTasks.length}</strong><small>Open tasks due soon</small></article>
    </section>
    <section className="dashboard-grid" aria-label="Project and task overview">
      <section className="content-panel project-panel" aria-labelledby="projects-heading">
        <div className="panel-heading"><div><h2 id="projects-heading">Active projects</h2><p>Progress from server tasks</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all <Icon name="arrow" /></Button></div>
        <div className="project-list">{activeProjects.slice(0, 4).map((project, index) => {
          const projectTasks = workspace.tasks.filter((task) => task.projectId === project.id)
          const progress = projectTasks.length ? Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length) : 0
          return <article className="project-row" key={project.id}>
            <span className={`project-icon project-icon--${index % 2 ? 'blue' : 'purple'}`} aria-hidden="true"><Icon name="folder" /></span>
            <button type="button" className="project-row__main table-link" onClick={() => navigate(`/projects/${project.id}`)}><strong>{project.name}</strong><span><Icon name="calendar" />{formatDate(project.endDate)}</span></button>
            <StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge>
            <div className="progress-wrap"><div className="progress-wrap__labels"><span>Progress</span><strong>{progress}%</strong></div><progress className="progress-bar" value={progress} max={100} aria-label={`${progress}% progress for ${project.name}`} /></div>
            <span className="task-count-summary">{projectTasks.length} tasks</span>
            <Button className="row-chevron" variant="ghost" size="sm" aria-label={`Open ${project.name}`} onClick={() => navigate(`/projects/${project.id}`)}><Icon name="chevron" /></Button>
          </article>
        })}</div>
        {!activeProjects.length && <div className="dashboard-empty">No active projects. <Button variant="ghost" onClick={() => navigate('/projects')}>View projects</Button></div>}
        <div className="panel-footer"><span>{activeProjects.length} active</span><span className="panel-footer__note">Server data</span></div>
      </section>
      <section className="content-panel insights-panel" aria-labelledby="attention-heading">
        <div className="panel-heading"><div><h2 id="attention-heading">Needs attention</h2><p>Overdue or due within 7 days</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>Task board <Icon name="arrow" /></Button></div>
        <div className="focus-list">{needsAttention.map((task) => <button type="button" className="focus-item focus-item--button" key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}>
          <span className="focus-item__icon focus-item__icon--blue"><Icon name="board" /></span><span className="focus-item__copy"><strong>{task.title}</strong><span>{workspace.projects.find((project) => project.id === task.projectId)?.name ?? 'Project unavailable'} · <StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge></span></span><span className={`focus-item__date${task.endDate < today ? ' focus-item__date--overdue' : ''}`}>{task.endDate < today ? 'Overdue' : formatDate(task.endDate)}</span>
        </button>)}{!needsAttention.length && <div className="dashboard-empty">No open tasks are due in the next 7 days.</div>}</div>
        <div className="focus-footer"><span>{needsAttention.length} tasks</span><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>Open task board <Icon name="arrow" /></Button></div>
      </section>
    </section>
    <section className="content-panel activity-panel" aria-labelledby="activity-heading">
      <div className="panel-heading"><div><h2 id="activity-heading">Recent activity</h2><p>Activity feed from the project server</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>View notifications <Icon name="arrow" /></Button></div>
      {recentActivity.length ? <ul className="activity-list">{recentActivity.map((item) => <li className="activity-item" key={item.id}><span className={`notification-row__dot notification-row__dot--${item.tone}`} aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time dateTime={item.createdAt}>{formatDate(item.createdAt.slice(0, 10))}</time>{!item.read && <span className="activity-item__unread">Unread</span>}</li>)}</ul> : <div className="dashboard-empty">The backend does not expose an activity feed yet.</div>}
    </section>
  </div>
}
