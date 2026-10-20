import { useMemo, useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, priorityTone, taskTone, toLocalDateInput } from '../../lib/format'
import { taskStatusLabel } from '../../types/domain'
import { taskBoardColumn } from '../../types/domain'
import type { Task, TaskBoardColumn } from '../../types/domain'
import { TaskFormDialog } from './TaskFormDialog'

const boardColumns: Array<{ id: TaskBoardColumn; title: string; tone: string }> = [
  { id: 'todo', title: 'To do', tone: 'gray' },
  { id: 'in_progress', title: 'In progress', tone: 'blue' },
  { id: 'review', title: 'Review', tone: 'purple' },
  { id: 'done', title: 'Done', tone: 'green' },
]

export function TasksPage() {
  const { workspace, createTask, updateTask } = useDemoWorkspace()
  const [query, setQuery] = useState('')
  const [projectId, setProjectId] = useState('all')
  const [priority, setPriority] = useState('all')
  const [assignee, setAssignee] = useState('all')
  const [deadline, setDeadline] = useState('all')
  const [moduleName, setModuleName] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createColumn, setCreateColumn] = useState<TaskBoardColumn>('todo')
  const [editTask, setEditTask] = useState<Task | undefined>()
  const today = toLocalDateInput(new Date())
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 3)
  const soon = toLocalDateInput(soonDate)
  const visibleTasks = useMemo(() => workspace.tasks.filter((task) => task.status !== 'canceled'
    && (projectId === 'all' || task.projectId === Number(projectId))
    && (priority === 'all' || task.priority === priority)
    && (assignee === 'all' || (task.assigneeName ?? 'Unassigned') === assignee)
    && (moduleName === 'all' || (task.module ?? 'Unassigned') === moduleName)
    && (deadline === 'all' || (deadline === 'overdue' ? !!task.endDate && task.endDate < today && task.status !== 'done' : deadline === 'soon' ? !!task.endDate && task.endDate >= today && task.endDate <= soon : !task.endDate))
    && `${task.title} ${task.description}`.toLowerCase().includes(query.trim().toLowerCase())),
  [workspace.tasks, projectId, priority, assignee, moduleName, deadline, today, soon, query])
  const assignees = [...new Set(workspace.tasks.map((task) => task.assigneeName || 'Unassigned'))].sort()
  const modules = [...new Set(workspace.tasks.map((task) => task.module || 'Unassigned'))].sort()

  return <div className="page-stack">
    <PageHeader eyebrow="DAILY TRACKING" title="Task board" description="Track tasks from your server workspace." actions={<Button variant="primary" icon={<Icon name="plus" />} onClick={() => { setCreateColumn('todo'); setCreateOpen(true) }} disabled={!workspace.projects.length}>Add task</Button>} />
    <aside className="preview-notice"><span className="preview-notice__icon"><Icon name="board" /></span><p><strong>Server task data.</strong> Task changes are saved to the backend. The Review board column maps to the backend's in-progress status.</p><span className="demo-label"><span />API</span></aside>
    <div className="page-toolbar task-board-filters" aria-label="Task filters">
      <Input id="task-search" leadingIcon={<Icon name="search" />} placeholder="Search tasks" aria-label="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select id="task-filter-project" label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} options={[{ value: 'all', label: 'All projects' }, ...workspace.projects.map((project) => ({ value: String(project.id), label: project.name }))]} />
      <Select id="task-filter-priority" label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} options={[{ value: 'all', label: 'All priorities' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
      <Select id="task-filter-assignee" label="Assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} options={[{ value: 'all', label: 'All assignees' }, ...assignees.map((name) => ({ value: name, label: name }))]} />
      <Select id="task-filter-deadline" label="Deadline" value={deadline} onChange={(event) => setDeadline(event.target.value)} options={[{ value: 'all', label: 'Any deadline' }, { value: 'overdue', label: 'Overdue' }, { value: 'soon', label: 'Due in 3 days' }, { value: 'none', label: 'No due date' }]} />
      <Select id="task-filter-module" label="Module" value={moduleName} onChange={(event) => setModuleName(event.target.value)} options={[{ value: 'all', label: 'All modules' }, ...modules.map((name) => ({ value: name, label: name }))]} />
    </div>
    <div className="kanban-board" aria-label="Task board columns">
      {boardColumns.map((column) => {
        const tasks = visibleTasks.filter((task) => taskBoardColumn(task) === column.id)
        return <section className={`kanban-column kanban-column--${column.tone}`} key={column.id} aria-labelledby={`column-${column.id}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = Number(event.dataTransfer.getData('text/plain')); if (id) updateTask(id, { boardColumn: column.id }) }}>
          <header className="kanban-column__header"><h2 id={`column-${column.id}`}><span className="kanban-column__dot" />{column.title}</h2><span className="kanban-column__count" aria-label={`${tasks.length} tasks`}>{tasks.length}</span><Button variant="ghost" size="sm" aria-label={`Add task to ${column.title}`} onClick={() => { setCreateColumn(column.id); setCreateOpen(true) }} disabled={!workspace.projects.length}><Icon name="plus" /></Button></header>
          <div className="kanban-column__cards">{tasks.map((task) => {
            const project = workspace.projects.find((item) => item.id === task.projectId)
            const overdue = !!task.endDate && task.endDate < today && task.status !== 'done'
            const dueSoon = !!task.endDate && task.endDate >= today && task.endDate <= soon && task.status !== 'done'
            return <article className="task-card" key={task.id} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(task.id)); event.dataTransfer.effectAllowed = 'move' }}>
              <div className="task-card__top"><StatusBadge tone={priorityTone(task.priority)}>{task.priority}</StatusBadge><Button variant="ghost" size="sm" aria-label={`Edit ${task.title}`} onClick={() => setEditTask(task)}>Edit</Button></div>
              <button className="task-card__title" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button>
              <span className="task-card__project">{project?.name ?? 'Project unavailable'} · {task.module || 'Unassigned module'}</span>
              <div className="task-card__meta"><span>{task.assigneeName || 'Unassigned'}</span><span>{task.endDate ? formatDate(task.endDate) : 'No due date'}</span></div>
              {(overdue || dueSoon) && <span className={`task-risk${overdue ? ' task-risk--overdue' : ''}`}>{overdue ? 'Overdue' : 'Due soon'}</span>}
              <label className="task-card__move">Move to<Select aria-label={`Move ${task.title} to column`} id={`move-task-${task.id}`} value={taskBoardColumn(task)} onChange={(event) => updateTask(task.id, { boardColumn: event.target.value as TaskBoardColumn })} options={boardColumns.map(({ id: value, title }) => ({ value, label: title }))} /></label>
            </article>
          })}</div>
          {!tasks.length && <p className="kanban-column__empty">No matching tasks</p>}
          <Button className="kanban-column__add" variant="ghost" onClick={() => { setCreateColumn(column.id); setCreateOpen(true) }} disabled={!workspace.projects.length}><Icon name="plus" />Add task</Button>
        </section>
      })}
    </div>
    <p className="board-canceled-note">Canceled tasks are hidden from the four active board columns. Due-soon and overdue labels are calculated from task dates only.</p>
    <TaskFormDialog open={createOpen || !!editTask} projectId={Number(projectId) || workspace.projects[0]?.id || 0} initialBoardColumn={createColumn} task={editTask} onClose={() => { setCreateOpen(false); setEditTask(undefined) }} onSave={(values) => { if (editTask) { const { projectId: _id, ...changes } = values; void updateTask(editTask.id, changes); setCreateOpen(false); setEditTask(undefined) } else { void createTask(values).then(() => { setCreateOpen(false); setEditTask(undefined) }).catch(() => {}) } }} />
  </div>
}

export function TaskDetailPage({ id }: { id: number }) {
  const { workspace, updateTask, deleteTask } = useDemoWorkspace()
  const task = workspace.tasks.find((item) => item.id === id)
  const [editing, setEditing] = useState(false)
  if (!task) return <div className="page-stack"><PageHeader title="Task not found" description="This task is not in your loaded server workspace." /><Button onClick={() => navigate('/tasks')}>Back to tasks</Button></div>
  const project = workspace.projects.find((item) => item.id === task.projectId)
  return <div className="page-stack"><div className="back-link-row"><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>← All tasks</Button></div>
    <PageHeader eyebrow="TASK DETAILS" title={task.title} description={task.description || 'No description has been added.'} actions={<div className="page-actions"><Button variant="secondary" onClick={() => setEditing(true)}>Edit task</Button><Button variant="danger" onClick={() => { void deleteTask(id); navigate('/tasks') }}>Delete task</Button></div>} />
    <section className="content-panel detail-card"><div className="detail-summary"><div><span>Project</span><strong>{project?.name ?? 'Project unavailable'}</strong></div><div><span>Status</span><StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge></div><div><span>Priority</span><StatusBadge tone={priorityTone(task.priority)}>{task.priority}</StatusBadge></div><div><span>Due date</span><strong>{formatDate(task.endDate)}</strong></div><div><span>Assignee · demo</span><strong>{task.assigneeName || 'Unassigned'}</strong></div><div><span>Module · demo</span><strong>{task.module || 'Unassigned'}</strong></div><div><span>Estimate · demo</span><strong>{task.estimateHours == null ? 'Not estimated' : `${task.estimateHours} hours`}</strong></div><div><span>Progress</span><strong>{task.progress}% · demo value</strong></div><div><span>Created by</span><strong>{task.createdByName}</strong></div></div>
      <div className="task-dependencies"><h2>Dependencies</h2><p>Task dependencies are supported by the backend but are not currently displayed in this view.</p></div>
    </section>
    <TaskFormDialog open={editing} projectId={task.projectId} task={task} onClose={() => setEditing(false)} onSave={(values) => { const { projectId: _projectId, ...changes } = values; void updateTask(id, changes); setEditing(false) }} />
  </div>
}
