import { useEffect, useMemo, useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { DataTable, type DataColumn } from '../../components/ui/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDateRange, projectTone } from '../../lib/format'
import { projectStatusLabel, taskStatusLabel } from '../../types/domain'
import type { Project, ProjectStatus } from '../../types/domain'
import { navigate } from '../../app/router'
import { ProjectFormDialog, type ProjectValues } from './ProjectFormDialog'
import { TaskFormDialog, type TaskValues } from '../tasks/TaskFormDialog'
import { priorityTone, taskTone } from '../../lib/format'

type StatusFilter = 'all' | ProjectStatus

export function ProjectsPage() {
  const { workspace, createProject } = useDemoWorkspace()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState('name')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') === '1') {
      setFormOpen(true)
      window.history.replaceState({}, '', '/projects')
    }
  }, [])

  const projects = useMemo(() => workspace.projects
    .filter((project) => (status === 'all' || project.status === status)
      && `${project.name} ${project.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'endDate' ? a.endDate.localeCompare(b.endDate) : a.name.localeCompare(b.name)),
  [workspace.projects, query, status, sort])

  const columns: DataColumn<Project>[] = [
    { key: 'name', header: 'Project', render: (project) => <button type="button" className="table-link" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}<small>{project.description || 'No description'}</small></button> },
    { key: 'dates', header: 'Schedule', render: (project) => formatDateRange(project.startDate, project.endDate) },
    { key: 'tasks', header: 'Tasks', render: (project) => workspace.tasks.filter((task) => task.projectId === project.id).length },
    { key: 'status', header: 'Status', render: (project) => <StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge> },
    { key: 'open', header: '', render: (project) => <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}`)}>Open project</Button> },
  ]

  function saveProject(values: ProjectValues) {
    const id = createProject(values)
    setFormOpen(false)
    navigate(`/projects/${id}`)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="WORKSPACE" title="Projects" description="Browse and organize the projects in this demo workspace." actions={<Button variant="primary" icon={<Icon name="plus" />} onClick={() => setFormOpen(true)}>New project</Button>} />
    <div className="page-toolbar" aria-label="Project filters">
      <Input id="project-search" leadingIcon={<Icon name="search" />} placeholder="Search projects" aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select id="project-filter-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} options={[{ value: 'all', label: 'All statuses' }, { value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <Select id="project-sort" label="Sort" value={sort} onChange={(event) => setSort(event.target.value)} options={[{ value: 'name', label: 'Name' }, { value: 'endDate', label: 'End date' }]} />
      <span className="result-count">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
    </div>
    {projects.length > 0
      ? <DataTable caption="Projects in the demo workspace" columns={columns} rows={projects} rowKey={(project) => project.id} />
      : <EmptyState title={workspace.projects.length ? 'No matching projects' : 'No projects yet'} detail={workspace.projects.length ? 'Try changing the search or status filters.' : 'Create a demo project to explore project details and tasks.'} action={!workspace.projects.length && <Button variant="primary" onClick={() => setFormOpen(true)}>Create project</Button>} />}
    <ProjectFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSave={saveProject} />
  </div>
}

export function ProjectDetailPage({ id }: { id: number }) {
  const { workspace, updateProject, deleteProject, createTask } = useDemoWorkspace()
  const project = workspace.projects.find((item) => item.id === id)
  const tasks = workspace.tasks.filter((task) => task.projectId === id)
  const [formOpen, setFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!project) return <section className="page-stack"><PageHeader title="Project not found" description="This project is not present in the current browser demo workspace." /><EmptyState title="Project unavailable" detail="Return to projects and choose an available demo project." action={<Button onClick={() => navigate('/projects')}>Back to projects</Button>} /></section>

  const taskColumns: DataColumn<(typeof tasks)[number]>[] = [
    { key: 'title', header: 'Task', render: (task) => <button type="button" className="table-link" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}<small>{task.description || 'No description'}</small></button> },
    { key: 'dates', header: 'Due', render: (task) => formatDateRange(task.startDate, task.endDate) },
    { key: 'priority', header: 'Priority', render: (task) => <StatusBadge tone={priorityTone(task.priority)}>{task.priority}</StatusBadge> },
    { key: 'status', header: 'Status', render: (task) => <StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge> },
  ]

  function saveProject(values: ProjectValues) {
    updateProject(id, values)
    setFormOpen(false)
  }

  function saveTask(values: TaskValues) {
    const taskId = createTask(values)
    setTaskFormOpen(false)
    navigate(`/tasks/${taskId}`)
  }

  return <div className="page-stack">
    <div className="back-link-row"><Button variant="ghost" size="sm" icon={<Icon name="arrow" className="icon-rotate" />} onClick={() => navigate('/projects')}>All projects</Button></div>
    <PageHeader eyebrow="PROJECT DETAILS" title={project.name} description={project.description || 'No project description has been added.'} actions={<div className="page-actions"><Button variant="secondary" onClick={() => setFormOpen(true)}>Edit project</Button><Button variant="secondary" onClick={() => setTaskFormOpen(true)} icon={<Icon name="plus" />}>Add task</Button><Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button></div>} />
    <div className="detail-summary">
      <div><span>Project status</span><StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div>
      <div><span>Schedule</span><strong>{formatDateRange(project.startDate, project.endDate)}</strong></div>
      <div><span>Tasks in this browser</span><strong>{tasks.length}</strong></div>
    </div>
    <section className="content-panel" aria-labelledby="project-tasks-heading">
      <div className="panel-heading"><div><h2 id="project-tasks-heading">Project tasks</h2><p>Tasks are demo data stored in this browser.</p></div><Button size="sm" variant="primary" onClick={() => setTaskFormOpen(true)} icon={<Icon name="plus" />}>Add task</Button></div>
      {tasks.length ? <DataTable caption={`Tasks for ${project.name}`} columns={taskColumns} rows={tasks} rowKey={(task) => task.id} /> : <EmptyState title="No tasks in this project" detail="Add a demo task to start organizing the work." action={<Button variant="primary" onClick={() => setTaskFormOpen(true)}>Add task</Button>} />}
    </section>
    <ProjectFormDialog open={formOpen} project={project} onClose={() => setFormOpen(false)} onSave={saveProject} />
    <TaskFormDialog open={taskFormOpen} projectId={id} onClose={() => setTaskFormOpen(false)} onSave={saveTask} />
    <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete demo project?" description="This removes the project and its tasks from this browser’s demo workspace.">
      <div className="dialog__actions"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" onClick={() => { deleteProject(id); setConfirmDelete(false); navigate('/projects') }}>Delete demo project</Button></div>
    </Dialog>
  </div>
}

