import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { groupsApi, projectMembersApi, tasksApi } from '../../api/services'
import type { ProjectGroup, ProjectMember, TaskAssignee, TaskDependency } from '../../api/models'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate, taskDetailPath, taskDetailReturnPath } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, formatDateRange, priorityTone, taskTone, toLocalDateInput } from '../../lib/format'
import { taskStatusLabel } from '../../types/domain'
import { taskBoardColumn } from '../../types/domain'
import type { Task, TaskBoardColumn } from '../../types/domain'
import { TaskFormDialog } from './TaskFormDialog'

const boardColumns: Array<{ id: TaskBoardColumn; title: string; tone: string }> = [
  { id: 'todo', title: 'To do', tone: 'gray' },
  { id: 'in_progress', title: 'In progress', tone: 'blue' },
  { id: 'done', title: 'Done', tone: 'green' },
]

export function TasksPage() {
  const { workspace, workspaceStatus, refresh, createTask, updateTask } = useDemoWorkspace()
  const [query, setQuery] = useState('')
  const [projectId, setProjectId] = useState('all')
  const [priority, setPriority] = useState('all')
  const [deadline, setDeadline] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createColumn, setCreateColumn] = useState<TaskBoardColumn>('todo')
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [assigneeNames, setAssigneeNames] = useState<Record<number, string>>({})
  const [groupNames, setGroupNames] = useState<Record<number, string>>({})
  const [assigneeError, setAssigneeError] = useState('')
  const [assigneeLoading, setAssigneeLoading] = useState(false)
  const today = toLocalDateInput(new Date())
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 3)
  const soon = toLocalDateInput(soonDate)
  const visibleTasks = useMemo(() => workspace.tasks.filter((task) => task.status !== 'canceled'
    && (projectId === 'all' || task.projectId === Number(projectId))
    && (priority === 'all' || task.priority === priority)
    && (deadline === 'all' || (deadline === 'overdue' ? !!task.endDate && task.endDate < today && task.status !== 'done' : deadline === 'soon' ? !!task.endDate && task.endDate >= today && task.endDate <= soon : !task.endDate))
    && `${task.title} ${task.description}`.toLowerCase().includes(query.trim().toLowerCase())),
  [workspace.tasks, projectId, priority, deadline, today, soon, query])

  useEffect(() => {
    let active = true
    if (workspaceStatus !== 'ready' || workspace.tasks.length === 0) {
      setAssigneeNames({})
      setAssigneeError('')
      setAssigneeLoading(false)
      return
    }
    setAssigneeLoading(true)
    setAssigneeError('')
    Promise.all(workspace.tasks.map(async (task) => {
      const assignees = await tasksApi.getAssignees(task.id)
      return [task.id, assignees.map((assignee) => assignee.userName).join(', ')] as const
    })).then((rows) => {
      if (active) setAssigneeNames(Object.fromEntries(rows))
    }).catch((error: unknown) => {
      if (active) setAssigneeError(error instanceof Error ? error.message : 'Could not load task assignees.')
    }).finally(() => { if (active) setAssigneeLoading(false) })
    return () => { active = false }
  }, [workspaceStatus, workspace.tasks])

  useEffect(() => {
    let active = true
    if (workspaceStatus !== 'ready' || workspace.projects.length === 0) {
      setGroupNames({})
      return
    }
    Promise.all(workspace.projects.map((project) => groupsApi.getByProject(project.id)))
      .then((groupsByProject: ProjectGroup[][]) => {
        if (active) setGroupNames(Object.fromEntries(groupsByProject.flat().map((group) => [group.id, group.name])))
      })
      .catch(() => {
        if (active) setGroupNames({})
      })
    return () => { active = false }
  }, [workspaceStatus, workspace.projects])

  async function saveTask(values: import('./TaskFormDialog').TaskValues) {
    if (editTask) {
      const { projectId: _projectId, ...changes } = values
      await updateTask(editTask.id, changes)
    } else {
      await createTask(values)
    }
    setCreateOpen(false)
    setEditTask(undefined)
  }

  async function changeTaskColumn(taskId: number, column: TaskBoardColumn) {
    try { await updateTask(taskId, { boardColumn: column }) } catch { /* The workspace shows the API error and the task stays unchanged. */ }
  }

  return <div className="page-stack">
    <PageHeader eyebrow="DAILY TRACKING" title="Task board" description="Track tasks from your server workspace." actions={<Button variant="primary" icon={<Icon name="plus" />} onClick={() => { setCreateColumn('todo'); setCreateOpen(true) }} disabled={!workspace.projects.length}>Add task</Button>} />
    <aside className="preview-notice"><span className="preview-notice__icon"><Icon name="board" /></span><p><strong>Server task data.</strong> Task changes are saved to the backend. Board columns match the server task statuses.</p><span className="demo-label"><span />API</span></aside>
    {workspaceStatus === 'loading' && <LoadingState label="Loading server tasks…" />}
    {workspaceStatus === 'error' && <ErrorState title="Could not load tasks" detail="The server task list is unavailable. Retry to load current project data." action={<Button onClick={() => void refresh()}>Try again</Button>} />}
    {assigneeError && <ErrorState title="Could not load task assignees" detail={assigneeError} action={<Button onClick={() => void refresh()}>Refresh tasks</Button>} />}
    {assigneeLoading && workspaceStatus === 'ready' && <p role="status">Loading task assignees…</p>}
    <div className="page-toolbar task-board-filters" aria-label="Task filters">
      <Input id="task-search" leadingIcon={<Icon name="search" />} placeholder="Search tasks" aria-label="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select id="task-filter-project" label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} options={[{ value: 'all', label: 'All projects' }, ...workspace.projects.map((project) => ({ value: String(project.id), label: project.name }))]} />
      <Select id="task-filter-priority" label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} options={[{ value: 'all', label: 'All priorities' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
      <Select id="task-filter-deadline" label="Deadline" value={deadline} onChange={(event) => setDeadline(event.target.value)} options={[{ value: 'all', label: 'Any deadline' }, { value: 'overdue', label: 'Overdue' }, { value: 'soon', label: 'Due in 3 days' }, { value: 'none', label: 'No due date' }]} />
    </div>
    {workspaceStatus === 'ready' && <div className="kanban-board" aria-label="Task board columns">
      {boardColumns.map((column) => {
        const tasks = visibleTasks.filter((task) => taskBoardColumn(task) === column.id)
        return <section className={`kanban-column kanban-column--${column.tone}`} key={column.id} aria-labelledby={`column-${column.id}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = Number(event.dataTransfer.getData('text/plain')); if (id) void changeTaskColumn(id, column.id) }}>
          <header className="kanban-column__header"><h2 id={`column-${column.id}`}><span className="kanban-column__dot" />{column.title}</h2><span className="kanban-column__count" aria-label={`${tasks.length} tasks`}>{tasks.length}</span><Button variant="ghost" size="sm" aria-label={`Add task to ${column.title}`} onClick={() => { setCreateColumn(column.id); setCreateOpen(true) }} disabled={!workspace.projects.length}><Icon name="plus" /></Button></header>
          <div className="kanban-column__cards">{tasks.map((task) => {
            const project = workspace.projects.find((item) => item.id === task.projectId)
            const overdue = !!task.endDate && task.endDate < today && task.status !== 'done'
            const dueSoon = !!task.endDate && task.endDate >= today && task.endDate <= soon && task.status !== 'done'
            return <article className="task-card" key={task.id} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(task.id)); event.dataTransfer.effectAllowed = 'move' }}>
              <div className="task-card__top"><StatusBadge tone={priorityTone(task.priority)}>{task.priority[0].toUpperCase() + task.priority.slice(1)}</StatusBadge><Button variant="ghost" size="sm" aria-label={`Edit ${task.title}`} onClick={() => setEditTask(task)}>Edit</Button></div>
              <button className="task-card__title" type="button" onClick={() => navigate(taskDetailPath(task.id, '/tasks'))}>{task.title}</button>
              <span className="task-card__project">{project?.name ?? 'Project unavailable'}{task.groupId ? ` · ${groupNames[task.groupId] ?? 'Group unavailable'}` : ''}</span>
              <div className="task-card__meta"><span>{assigneeNames[task.id] || 'Unassigned'}</span><span>{task.endDate ? formatDate(task.endDate) : 'No due date'}</span></div>
              {(overdue || dueSoon) && <span className={`task-risk${overdue ? ' task-risk--overdue' : ''}`}>{overdue ? 'Overdue' : 'Due soon'}</span>}
              <label className="task-card__move">Move to<Select aria-label={`Move ${task.title} to column`} id={`move-task-${task.id}`} value={taskBoardColumn(task)} onChange={(event) => void changeTaskColumn(task.id, event.target.value as TaskBoardColumn)} options={boardColumns.map(({ id: value, title }) => ({ value, label: title }))} /></label>
            </article>
          })}</div>
          {!tasks.length && <p className="kanban-column__empty">No matching tasks</p>}
          <Button className="kanban-column__add" variant="ghost" onClick={() => { setCreateColumn(column.id); setCreateOpen(true) }} disabled={!workspace.projects.length}><Icon name="plus" />Add task</Button>
        </section>
      })}
    </div>}
    <p className="board-canceled-note">Canceled tasks are hidden from the four active board columns. Due-soon and overdue labels are calculated from task dates only.</p>
    <TaskFormDialog open={createOpen || !!editTask} projectId={Number(projectId) || workspace.projects[0]?.id || 0} initialBoardColumn={createColumn} task={editTask} onClose={() => { setCreateOpen(false); setEditTask(undefined) }} onSave={saveTask} />
  </div>
}

export function TaskDetailPage({ id }: { id: number }) {
  const { workspace, workspaceStatus, refresh, updateTask, deleteTask } = useDemoWorkspace()
  const task = workspace.tasks.find((item) => item.id === id)
  const returnPath = taskDetailReturnPath(`${window.location.pathname}${window.location.search}`)
  const returnLabel = /^\/projects\/\d+$/.test(returnPath) ? 'Project detail' : /^\/tasks\/\d+/.test(returnPath) ? 'Previous task' : returnPath === '/timeline' ? 'Timeline' : returnPath === '/dashboard' ? 'Dashboard' : 'Task board'
  const [editing, setEditing] = useState(false)
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [dependencies, setDependencies] = useState<TaskDependency[]>([])
  const [dependents, setDependents] = useState<TaskDependency[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [selectedDependency, setSelectedDependency] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!task) return
    let active = true
    setDetailLoading(true)
    setDetailError('')
    Promise.all([
      tasksApi.getAssignees(id),
      tasksApi.getDependencies(id),
      tasksApi.getDependents(id),
      projectMembersApi.getByProject(task.projectId),
    ]).then(([loadedAssignees, loadedDependencies, loadedDependents, loadedMembers]) => {
      if (!active) return
      setAssignees(loadedAssignees)
      setDependencies(loadedDependencies)
      setDependents(loadedDependents)
      setProjectMembers(loadedMembers)
    }).catch((error: unknown) => {
      if (active) setDetailError(error instanceof Error ? error.message : 'Could not load task assignments and dependencies.')
    }).finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [id, task?.projectId])

  async function mutateTaskDetail(operation: () => Promise<unknown>, success: () => void | Promise<void>) {
    setBusy(true)
    setDetailError('')
    try {
      await operation()
      await success()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setDetailError('Your session has expired. Sign in again to continue.')
      else if (error instanceof ApiError && error.status === 403) setDetailError('Your account does not have permission to change this task.')
      else setDetailError(error instanceof Error ? error.message : 'The task change could not be saved.')
    } finally { setBusy(false) }
  }

  async function reloadAssignments() {
    const result = await tasksApi.getAssignees(id)
    setAssignees(result)
  }

  async function reloadDependencies() {
    const [nextDependencies, nextDependents] = await Promise.all([tasksApi.getDependencies(id), tasksApi.getDependents(id)])
    setDependencies(nextDependencies)
    setDependents(nextDependents)
  }

  async function saveTaskChanges(values: import('./TaskFormDialog').TaskValues) {
    const { projectId: _projectId, ...changes } = values
    await updateTask(id, changes)
    setEditing(false)
  }

  async function removeTask() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteTask(id)
      navigate(returnPath)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The task could not be deleted.')
    } finally {
      setDeleting(false)
    }
  }

  if (!task && workspaceStatus === 'loading') return <div className="page-stack"><PageHeader title="Task details" description="Loading the selected server task." /><LoadingState label="Loading task…" /></div>
  if (!task && workspaceStatus === 'error') return <div className="page-stack"><PageHeader title="Task details unavailable" description="The server task list could not be loaded." /><ErrorState title="Could not load task" detail="Retry the task service, then reopen this task." action={<Button onClick={() => void refresh()}>Try again</Button>} /></div>
  if (!task) return <div className="page-stack"><PageHeader title="Task not found" description="This task is not in your loaded server workspace." /><Button onClick={() => navigate(returnPath)}>Back to {returnLabel.toLowerCase()}</Button></div>
  const project = workspace.projects.find((item) => item.id === task.projectId)
  const availableAssignees = projectMembers.filter((member) => !assignees.some((assignee) => assignee.userId === member.userId))
  const availableDependencies = workspace.tasks.filter((candidate) => candidate.projectId === task.projectId && candidate.id !== task.id && !dependencies.some((dependency) => dependency.dependsOnTaskId === candidate.id))
  const priorityLabel = task.priority[0].toUpperCase() + task.priority.slice(1)
  return <div className="page-stack task-detail-page">
    <div className="back-link-row"><Button variant="ghost" size="sm" icon={<Icon name="arrow" className="icon-rotate" />} onClick={() => navigate(returnPath)}>Back to {returnLabel}</Button></div>
    <header className="task-detail-hero"><div className="task-detail-hero__copy"><p className="page-header__eyebrow">TASK DETAIL{project ? ` · ${project.name}` : ''}</p><h1 title={task.title}>{task.title}</h1></div><div className="task-detail-hero__actions"><Button variant="secondary" onClick={() => setEditing(true)}>Edit task</Button><Button variant="danger" onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete task</Button></div></header>
    {deleteError && <p className="team-members-feedback team-members-feedback--error" role="alert">{deleteError}</p>}
    <section className="task-overview content-panel" aria-labelledby="task-overview-heading">
      <div className="task-overview__heading"><div><p className="page-header__eyebrow">AT A GLANCE</p><h2 id="task-overview-heading">Task information</h2></div><span className="task-overview__hint">Status, priority, and schedule</span></div>
      <div className="task-detail-summary">
        <div className="task-detail-fact"><span>Status</span><StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge></div>
        <div className="task-detail-fact"><span>Priority</span><StatusBadge tone={priorityTone(task.priority)}>{priorityLabel}</StatusBadge></div>
        <div className="task-detail-fact"><span>Schedule</span><strong>{formatDateRange(task.startDate, task.endDate)}</strong></div>
      </div>
    </section>
    <section className="task-description-panel content-panel" aria-labelledby="task-description-heading"><div className="task-description-panel__heading"><span className="task-description-panel__icon"><Icon name="list" /></span><div><p className="page-header__eyebrow">TASK BRIEF</p><h2 id="task-description-heading">Description</h2></div></div><div className="task-description-panel__body">{task.description?.trim() || 'No description has been added for this task yet.'}</div></section>
    <section className="task-relations content-panel" aria-labelledby="task-relations-heading">
      <div className="task-relations__heading"><div><p className="page-header__eyebrow">COLLABORATION</p><h2 id="task-relations-heading">People & dependencies</h2></div><span className="task-overview__hint">Manage ownership and task order</span></div>
      <div className="task-relations__grid">
        <section className="task-relation-card" aria-labelledby="task-assignees-heading">
          <div className="task-relation-card__heading"><span className="task-relation-card__icon"><Icon name="users" /></span><div><h3 id="task-assignees-heading">Assignees</h3><span>{assignees.length} assigned</span></div></div>
          {detailLoading ? <p className="task-relation-empty" role="status">Loading task assignments…</p> : assignees.length ? <ul className="task-relation-list">{assignees.map((assignee) => <li className="task-person-row" key={assignee.id}><span className="task-person-row__avatar">{assignee.userName.trim().charAt(0).toUpperCase() || '?'}</span><span className="task-person-row__copy"><strong>{assignee.userName}</strong><small>{assignee.userEmail}</small></span><Button size="sm" variant="ghost" disabled={busy} onClick={() => void mutateTaskDetail(() => tasksApi.unassign(id, assignee.userId), reloadAssignments)}>Remove</Button></li>)}</ul> : <p className="task-relation-empty">No one is assigned yet. Choose a project member below.</p>}
          <div className="task-relation-controls"><Select id="task-assignee" aria-label="Choose a project member to assign" value={selectedAssignee} onChange={(event) => setSelectedAssignee(event.target.value)} disabled={detailLoading || busy} options={[{ value: '', label: availableAssignees.length ? 'Choose a project member' : 'No available project members' }, ...availableAssignees.map((member) => ({ value: String(member.userId), label: `${member.userName} · ${member.roleName}` }))]} /><Button size="sm" variant="secondary" disabled={busy || detailLoading || !selectedAssignee} onClick={() => void mutateTaskDetail(() => tasksApi.assign(id, Number(selectedAssignee)), async () => { setSelectedAssignee(''); await reloadAssignments() })}>Assign</Button></div>
        </section>
        <div className="task-relation-stack">
          <section className="task-relation-card" aria-labelledby="task-dependencies-heading">
            <div className="task-relation-card__heading"><span className="task-relation-card__icon"><Icon name="arrow" /></span><div><h3 id="task-dependencies-heading">Depends on</h3><span>{dependencies.length} prerequisite{dependencies.length === 1 ? '' : 's'}</span></div></div>
            {dependencies.length ? <ul className="task-relation-list">{dependencies.map((dependency) => <li className="task-linked-row" key={dependency.id}><button type="button" className="table-link" onClick={() => navigate(taskDetailPath(dependency.dependsOnTaskId, `${window.location.pathname}${window.location.search}`))}>{dependency.dependsOnTaskTitle}</button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void mutateTaskDetail(() => tasksApi.removeDependency(id, dependency.dependsOnTaskId), reloadDependencies)}>Remove</Button></li>)}</ul> : <p className="task-relation-empty">No prerequisite tasks have been added.</p>}
            <div className="task-relation-controls"><Select id="task-dependency" aria-label="Choose a prerequisite task" value={selectedDependency} onChange={(event) => setSelectedDependency(event.target.value)} disabled={detailLoading || busy} options={[{ value: '', label: availableDependencies.length ? 'Choose a prerequisite task' : 'No available tasks' }, ...availableDependencies.map((candidate) => ({ value: String(candidate.id), label: candidate.title }))]} /><Button size="sm" variant="secondary" disabled={busy || detailLoading || !selectedDependency} onClick={() => void mutateTaskDetail(() => tasksApi.addDependency(id, Number(selectedDependency)), async () => { setSelectedDependency(''); await reloadDependencies() })}>Add dependency</Button></div>
          </section>
          <section className="task-relation-card" aria-labelledby="task-dependents-heading">
            <div className="task-relation-card__heading"><span className="task-relation-card__icon task-relation-card__icon--muted"><Icon name="board" /></span><div><h3 id="task-dependents-heading">Blocks</h3><span>{dependents.length} dependent task{dependents.length === 1 ? '' : 's'}</span></div></div>
            {dependents.length ? <ul className="task-relation-list">{dependents.map((dependency) => <li className="task-linked-row" key={dependency.id}><button type="button" className="table-link" onClick={() => navigate(taskDetailPath(dependency.taskId, `${window.location.pathname}${window.location.search}`))}>{dependency.taskTitle}</button></li>)}</ul> : <p className="task-relation-empty">No tasks depend on this one yet.</p>}
          </section>
        </div>
      </div>
      {detailError && <p className="team-members-feedback team-members-feedback--error" role="alert">{detailError}</p>}
    </section>
    <TaskFormDialog open={editing} projectId={task.projectId} task={task} onClose={() => setEditing(false)} onSave={saveTaskChanges} />
    <Dialog open={confirmDelete} title="Delete task?" description={`Delete “${task.title}” from the server? This action cannot be undone.`} onClose={() => { if (!deleting) setConfirmDelete(false) }} actions={<><Button variant="secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" disabled={deleting} onClick={() => void removeTask()}>{deleting ? 'Deleting…' : 'Delete task'}</Button></>}><p>Any dependent records will follow the backend deletion rules for this task.</p></Dialog>
  </div>
}
