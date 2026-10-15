import { useEffect, useMemo, useState } from 'react'
import { authApi, projectsApi } from '../../api/services'
import type { ProjectResponse, UserResponse } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { DataTable, type DataColumn } from '../../components/ui/DataTable'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDateRange, projectTone } from '../../lib/format'
import { projectStatusLabel } from '../../types/domain'
import type { Project, ProjectStatus } from '../../types/domain'
import { navigate } from '../../app/router'
import { ProjectFormDialog, type ProjectValues } from './ProjectFormDialog'
import { ProjectWorkspace } from './ProjectWorkspace'

type StatusFilter = 'all' | ProjectStatus

function toProject(response: ProjectResponse): Project {
  const status: ProjectStatus = response.status === 'completed' || response.status === 'cancelled'
    ? response.status
    : 'in_progress'
  return {
    id: response.id,
    name: response.name,
    description: response.description ?? '',
    startDate: response.startDate ?? '',
    endDate: response.endDate ?? '',
    status,
  }
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The server request could not be completed.'
}

function describeOwner(owner: ProjectResponse['owner']): string {
  return owner?.name || owner?.email || 'Unknown owner'
}

export function ProjectsPage({ openCreate = false }: { openCreate?: boolean }) {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState('name')
  const [formOpen, setFormOpen] = useState(false)

  async function loadProjects() {
    setLoading(true)
    setError('')
    try {
      setProjects(await projectsApi.getAll())
    } catch (loadError) {
      setError(messageOf(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadProjects() }, [])
  useEffect(() => {
    if (openCreate) {
      setFormOpen(true)
      navigate('/projects', { replace: true })
    }
  }, [openCreate])

  const visibleProjects = useMemo(() => projects
    .filter((project) => {
      const normalizedStatus: ProjectStatus = project.status === 'completed' || project.status === 'cancelled' ? project.status : 'in_progress'
      return (status === 'all' || normalizedStatus === status)
        && `${project.name} ${project.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())
    })
    .sort((a, b) => sort === 'endDate'
      ? (a.endDate ?? '9999-12-31').localeCompare(b.endDate ?? '9999-12-31')
      : a.name.localeCompare(b.name)),
  [projects, query, status, sort])

  const columns: DataColumn<ProjectResponse>[] = [
    { key: 'name', header: 'Project', render: (project) => <button type="button" className="table-link" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}<small>{project.description || 'No description'}</small></button> },
    { key: 'owner', header: 'Owner', render: (project) => describeOwner(project.owner) },
    { key: 'dates', header: 'Schedule', render: (project) => formatDateRange(project.startDate ?? '', project.endDate ?? '') },
    { key: 'status', header: 'Status', render: (project) => {
      const mapped = toProject(project)
      return <StatusBadge tone={projectTone(mapped.status)}>{projectStatusLabel(mapped.status)}</StatusBadge>
    } },
    { key: 'open', header: '', render: (project) => <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}`)}>Open project</Button> },
  ]

  async function createProject(values: ProjectValues) {
    const user = await authApi.me<UserResponse>()
    const created = await projectsApi.create({
      name: values.name,
      description: values.description,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      ownerId: user.id,
    })
    setProjects((current) => [created, ...current])
    setFormOpen(false)
    navigate(`/projects/${created.id}`)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="PROJECT DIRECTORY" title="Projects" description="Projects are loaded from the project management server." actions={<Button variant="primary" icon={<Icon name="plus" />} onClick={() => setFormOpen(true)}><span>New project</span></Button>} />
    <div className="page-toolbar" aria-label="Project filters">
      <Input id="project-search" leadingIcon={<Icon name="search" />} placeholder="Search projects" aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select id="project-filter-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} options={[{ value: 'all', label: 'All statuses' }, { value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <Select id="project-sort" label="Sort" value={sort} onChange={(event) => setSort(event.target.value)} options={[{ value: 'name', label: 'Name' }, { value: 'endDate', label: 'End date' }]} />
      <span className="result-count">{visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'}</span>
    </div>
    {loading ? <LoadingState label="Loading projects from server…" />
      : error ? <ErrorState title="Could not load projects" detail={error} action={<Button onClick={() => void loadProjects()}>Try again</Button>} />
        : visibleProjects.length > 0
          ? <DataTable caption="Projects from the server" columns={columns} rows={visibleProjects} rowKey={(project) => project.id} />
          : <EmptyState title={projects.length ? 'No matching projects' : 'No projects yet'} detail={projects.length ? 'Try changing the search or status filters.' : 'Create a project to get started.'} action={!projects.length && <Button variant="primary" onClick={() => setFormOpen(true)}>Create project</Button>} />}
    <ProjectFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSave={createProject} />
  </div>
}

export function ProjectDetailPage({ id }: { id: number }) {
  const [projectResponse, setProjectResponse] = useState<ProjectResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)
  const project = projectResponse ? toProject(projectResponse) : null

  async function loadProject() {
    setLoading(true)
    setError('')
    try {
      setProjectResponse(await projectsApi.getById(id))
    } catch (loadError) {
      setError(messageOf(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadProject() }, [id])

  async function saveProject(values: ProjectValues) {
    if (!projectResponse) return
    const updated = await projectsApi.update(id, {
      name: values.name,
      description: values.description,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      status: values.status,
    })
    setProjectResponse(updated)
    setFormOpen(false)
  }

  async function removeProject() {
    setBusy(true)
    setDeleteError('')
    try {
      await projectsApi.delete(id)
      navigate('/projects')
    } catch (deleteFailure) {
      setDeleteError(messageOf(deleteFailure))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page-stack"><LoadingState label="Loading project…" /></div>
  if (error || !project || !projectResponse) return <section className="page-stack"><PageHeader title="Project unavailable" description="The project could not be loaded from the server." /><ErrorState title="Could not load project" detail={error || 'Project was not found.'} action={<><Button onClick={() => void loadProject()}>Try again</Button><Button variant="secondary" onClick={() => navigate('/projects')}>Back to projects</Button></>} /></section>

  return <div className="page-stack">
    <div className="back-link-row"><Button variant="ghost" size="sm" icon={<Icon name="arrow" className="icon-rotate" />} onClick={() => navigate('/projects')}>All projects</Button></div>
    <PageHeader eyebrow="PROJECT DETAILS · SERVER DATA" title={project.name} description={project.description || 'No project description has been added.'} actions={<div className="page-actions"><Button variant="secondary" onClick={() => setFormOpen(true)}>Edit project</Button><Button variant="danger" onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete</Button></div>} />
    <section className="content-panel detail-summary">
      <div><span>Project status</span><StatusBadge tone={projectTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div>
      <div><span>Schedule</span><strong>{formatDateRange(project.startDate, project.endDate)}</strong></div>
      <div><span>Owner</span><strong>{describeOwner(projectResponse.owner)}</strong></div>
      <div><span>Project ID</span><strong>{project.id}</strong></div>
    </section>
    <ProjectWorkspace projectId={id} />
    <ProjectFormDialog open={formOpen} project={project} onClose={() => setFormOpen(false)} onSave={saveProject} />
    <Dialog open={confirmDelete} onClose={() => { if (!busy) setConfirmDelete(false) }} title="Delete project?" description={`This deletes “${project.name}” from the server.`}>
      {deleteError && <ErrorState title="Could not delete project" detail={deleteError} />}
      <div className="dialog__actions"><Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => void removeProject()}>{busy ? 'Deleting…' : 'Delete project'}</Button></div>
    </Dialog>
  </div>
}
