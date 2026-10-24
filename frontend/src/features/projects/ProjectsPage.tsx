import { useEffect, useMemo, useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { DataTable, type DataColumn } from '../../components/ui/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, projectTone, toLocalDateInput } from '../../lib/format'
import { projectStatusLabel, taskStatusLabel } from '../../types/domain'
import type { Project, ProjectStatus } from '../../types/domain'
import { navigate, taskDetailPath } from '../../app/router'
import { ProjectFormDialog, type ProjectValues } from './ProjectFormDialog'
import { TaskFormDialog, type TaskValues } from '../tasks/TaskFormDialog'
import { priorityTone, taskTone } from '../../lib/format'
import { getSettingsPreferences, type SettingsPreferences } from '../../app/settingsPreferences'

type StatusFilter = 'all' | ProjectStatus
type DeadlineFilter = 'all' | 'overdue' | 'soon' | 'none'

export function ProjectsPage({ openCreate = false }: { openCreate?: boolean }) {
  const { workspace, workspaceStatus, refresh, createProject } = useDemoWorkspace()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState('name')
  const [formOpen, setFormOpen] = useState(false)
  const [projectView, setProjectView] = useState(() => getSettingsPreferences().defaultProjectView)

  useEffect(() => {
    const syncView = (event: Event) => {
      const next = (event as CustomEvent<SettingsPreferences>).detail?.defaultProjectView
      if (next) setProjectView(next)
    }
    window.addEventListener('app:settings-changed', syncView)
    return () => window.removeEventListener('app:settings-changed', syncView)
  }, [])

  useEffect(() => {
    if (openCreate) setFormOpen(true)
  }, [openCreate])

  const projects = useMemo(() => workspace.projects
    .filter((project) => (status === 'all' || project.status === status)
      && `${project.name} ${project.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'endDate' ? a.endDate.localeCompare(b.endDate) : a.name.localeCompare(b.name)),
  [workspace.projects, query, status, sort])

  const columns: DataColumn<Project>[] = [
    { key: 'name', header: 'Project', render: (project) => <button type="button" className="table-link" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}<small>{project.description || 'No description'}</small></button> },
    { key: 'startDate', header: 'Start date', render: (project) => formatDate(project.startDate) },
    { key: 'endDate', header: 'End date', render: (project) => formatDate(project.endDate) },
    { key: 'tasks', header: 'Tasks', render: (project) => workspace.tasks.filter((task) => task.projectId === project.id).length },
    { key: 'status', header: 'Status', render: (project) => <StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge> },
    { key: 'open', header: '', render: (project) => <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}`)}>Open project</Button> },
  ]

  async function saveProject(values: ProjectValues) {
    const id = await createProject(values)
    setFormOpen(false)
    navigate(`/projects/${id}`)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="WORKSPACE" title="Projects" description="Browse and organize projects from your server workspace." actions={<Button variant="primary" icon={<Icon name="plus" />} onClick={() => setFormOpen(true)}>New project</Button>} />
    {workspaceStatus === 'loading' && <LoadingState label="Loading server projects…" />}
    {workspaceStatus === 'error' && <ErrorState title="Could not load projects" detail="The server project list is unavailable. Retry to load current project data." action={<Button onClick={() => void refresh()}>Try again</Button>} />}
    <div className="page-toolbar" aria-label="Project filters">
      <Input id="project-search" leadingIcon={<Icon name="search" />} placeholder="Search projects" aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select id="project-filter-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} options={[{ value: 'all', label: 'All statuses' }, { value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <Select id="project-sort" label="Sort" value={sort} onChange={(event) => setSort(event.target.value)} options={[{ value: 'name', label: 'Name' }, { value: 'endDate', label: 'End date' }]} />
      <span className="result-count">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
    </div>
    {workspaceStatus === 'ready' && (projects.length > 0
      ? projectView === 'list'
        ? <DataTable caption="Projects in your server workspace" columns={columns} rows={projects} rowKey={(project) => project.id} />
        : <div className="projects-card-grid">{projects.map((project) => <article className="projects-card" key={project.id}><div className="projects-card__top"><span className="projects-card__icon"><Icon name="folder" /></span><StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div><button type="button" className="projects-card__title" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</button><p>{project.description || 'No description'}</p><div className="projects-card__dates"><span><small>Start date</small><strong>{formatDate(project.startDate)}</strong></span><span><small>End date</small><strong>{formatDate(project.endDate)}</strong></span></div><div className="projects-card__footer"><span>{workspace.tasks.filter((task) => task.projectId === project.id).length} tasks</span><Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}`)}>Open project</Button></div></article>)}</div>
      : <EmptyState title={workspace.projects.length ? 'No matching projects' : 'No projects yet'} detail={workspace.projects.length ? 'Try changing the search or status filters.' : 'Create a project to start organizing the work.'} action={!workspace.projects.length && <Button variant="primary" onClick={() => setFormOpen(true)}>Create project</Button>} />)}
    <ProjectFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSave={saveProject} />
  </div>
}

export function ProjectDetailPage({ id }: { id: number }) {
  const { workspace, workspaceStatus, refresh, user, updateProject, deleteProject, createTask } = useDemoWorkspace()
  const project = workspace.projects.find((item) => item.id === id)
  const tasks = useMemo(() => workspace.tasks.filter((task) => task.projectId === id), [workspace.tasks, id])
  const [formOpen, setFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | (typeof tasks)[number]['status']>('all')
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | (typeof tasks)[number]['priority']>('all')
  const [taskDeadlineFilter, setTaskDeadlineFilter] = useState<DeadlineFilter>('all')

  const today = toLocalDateInput(new Date())
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 7)
  const soon = toLocalDateInput(soonDate)
  const filteredTasks = useMemo(() => {
    const needle = taskQuery.trim().toLocaleLowerCase()
    return tasks.filter((task) => {
      const open = task.status !== 'done' && task.status !== 'canceled'
      const matchesDeadline = taskDeadlineFilter === 'all'
        || (taskDeadlineFilter === 'none' && !task.endDate)
        || (taskDeadlineFilter === 'overdue' && Boolean(task.endDate) && task.endDate < today && open)
        || (taskDeadlineFilter === 'soon' && Boolean(task.endDate) && task.endDate >= today && task.endDate <= soon && open)
      return (taskStatusFilter === 'all' || task.status === taskStatusFilter)
        && (taskPriorityFilter === 'all' || task.priority === taskPriorityFilter)
        && matchesDeadline
        && (!needle || `${task.title} ${task.description}`.toLocaleLowerCase().includes(needle))
    })
  }, [tasks, taskQuery, taskStatusFilter, taskPriorityFilter, taskDeadlineFilter, today, soon])
  const taskFiltersApplied = Boolean(taskQuery || taskStatusFilter !== 'all' || taskPriorityFilter !== 'all' || taskDeadlineFilter !== 'all')

  if (!project && workspaceStatus === 'loading') return <section className="page-stack"><PageHeader title="Project details" description="Loading the selected server project." /><LoadingState label="Loading project…" /></section>
  if (!project && workspaceStatus === 'error') return <section className="page-stack"><PageHeader title="Project details unavailable" description="The server project list could not be loaded." /><ErrorState title="Could not load project" detail="Retry the project service, then reopen this project." action={<Button onClick={() => void refresh()}>Try again</Button>} /></section>
  if (!project) return <section className="page-stack"><PageHeader title="Project not found" description="This project is not in your server workspace." /><EmptyState title="Project unavailable" detail="Return to projects and choose an accessible project." action={<Button onClick={() => navigate('/projects')}>Back to projects</Button>} /></section>

  const taskColumns: DataColumn<(typeof tasks)[number]>[] = [
    { key: 'title', header: 'Task', render: (task) => <button type="button" className="table-link" onClick={() => navigate(taskDetailPath(task.id, `/projects/${id}`))}>{task.title}<small>{task.description || 'No description'}</small></button> },
    { key: 'startDate', header: 'Start date', render: (task) => formatDate(task.startDate) },
    { key: 'endDate', header: 'End date', render: (task) => formatDate(task.endDate) },
    { key: 'priority', header: 'Priority', render: (task) => <StatusBadge tone={priorityTone(task.priority)}>{task.priority[0].toUpperCase() + task.priority.slice(1)}</StatusBadge> },
    { key: 'status', header: 'Status', render: (task) => <StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge> },
  ]

  async function saveProject(values: ProjectValues) {
    await updateProject(id, values)
    setFormOpen(false)
  }

  async function confirmDeleteProject() {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteProject(id)
      setConfirmDelete(false)
      navigate('/projects')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The project could not be deleted.')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function saveTask(values: TaskValues) {
    const taskId = await createTask(values)
    setTaskFormOpen(false)
    navigate(taskDetailPath(taskId, `/projects/${id}`))
  }

  return <div className="page-stack project-detail-page">
    <div className="back-link-row"><Button variant="ghost" size="sm" icon={<Icon name="arrow" className="icon-rotate" />} onClick={() => navigate('/projects')}>All projects</Button></div>
    <header className="project-detail-hero">
      <div className="project-detail-hero__copy"><p className="page-header__eyebrow">PROJECT DETAIL</p><h1>{project.name}</h1><p>{project.description || 'No project description has been added.'}</p></div>
      {project.ownerId === user.id && <div className="project-detail-actions"><Button variant="secondary" onClick={() => setFormOpen(true)}>Edit project</Button><Button variant="danger" onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete project</Button></div>}
    </header>
    <div className="detail-summary">
      <div><span>Project status</span><StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div>
      <div><span>Start date</span><strong>{formatDate(project.startDate)}</strong></div>
      <div><span>End date</span><strong>{formatDate(project.endDate)}</strong></div>
      <div><span>Project tasks</span><strong>{tasks.length}</strong></div>
    </div>
    <section className="content-panel" aria-labelledby="project-tasks-heading">
      <div className="panel-heading"><div><h2 id="project-tasks-heading">Project tasks</h2><p>{filteredTasks.length} of {tasks.length} shown</p></div><div className="page-actions">{taskFiltersApplied && <Button size="sm" variant="ghost" onClick={() => { setTaskQuery(''); setTaskStatusFilter('all'); setTaskPriorityFilter('all'); setTaskDeadlineFilter('all') }}>Clear filters</Button>}<Button size="sm" variant="primary" onClick={() => setTaskFormOpen(true)} icon={<Icon name="plus" />}>Add task</Button></div></div>
      {tasks.length > 0 && <div className="project-task-filters" aria-label="Filter project tasks">
        <Input id="project-task-search" type="search" value={taskQuery} onChange={(event) => setTaskQuery(event.target.value)} placeholder="Search tasks" aria-label="Search task names and descriptions" leadingIcon={<Icon name="search" />} />
        <Select id="project-task-status" aria-label="Filter tasks by status" value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as typeof taskStatusFilter)} options={[{ value: 'all', label: 'All statuses' }, { value: 'todo', label: 'To do' }, { value: 'in_progress', label: 'In progress' }, { value: 'done', label: 'Done' }, { value: 'canceled', label: 'Canceled' }]} />
        <Select id="project-task-priority" aria-label="Filter tasks by priority" value={taskPriorityFilter} onChange={(event) => setTaskPriorityFilter(event.target.value as typeof taskPriorityFilter)} options={[{ value: 'all', label: 'All priorities' }, { value: 'high', label: 'High priority' }, { value: 'medium', label: 'Medium priority' }, { value: 'low', label: 'Low priority' }]} />
        <Select id="project-task-deadline" aria-label="Filter tasks by deadline" value={taskDeadlineFilter} onChange={(event) => setTaskDeadlineFilter(event.target.value as DeadlineFilter)} options={[{ value: 'all', label: 'Any deadline' }, { value: 'overdue', label: 'Overdue' }, { value: 'soon', label: 'Due in 7 days' }, { value: 'none', label: 'No deadline' }]} />
      </div>}
      {tasks.length ? filteredTasks.length ? <DataTable caption={`Tasks for ${project.name}`} columns={taskColumns} rows={filteredTasks} rowKey={(task) => task.id} /> : <EmptyState title="No matching tasks" detail="No project tasks match the selected filters. Clear or change a filter to see more tasks." /> : <EmptyState title="No tasks in this project" detail="Add a task to start organizing the work." action={<Button variant="primary" onClick={() => setTaskFormOpen(true)}>Add task</Button>} />}
    </section>
    <ProjectFormDialog open={formOpen} project={project} onClose={() => setFormOpen(false)} onSave={saveProject} />
    <TaskFormDialog open={taskFormOpen} projectId={id} onClose={() => setTaskFormOpen(false)} onSave={saveTask} />
    <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete project?" description="This removes the project and its related data from the server.">
      {deleteError && <p className="team-members-feedback team-members-feedback--error" role="alert">{deleteError}</p>}
      <div className="dialog__actions"><Button variant="secondary" disabled={deleteBusy} onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" disabled={deleteBusy} onClick={() => void confirmDeleteProject()}>{deleteBusy ? 'Deleting…' : 'Delete project'}</Button></div>
    </Dialog>
  </div>
}
