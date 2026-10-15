import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { groupsApi, projectMembersApi, rolesApi, tasksApi, usersApi } from '../../api/services'
import type { GroupRequest, GroupResponse, ProjectMember, RoleResponse, TaskAssignee, TaskResponse } from '../../api/models'
import { useAuth } from '../../app/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { TASK_PRIORITIES, TASK_STATUSES, taskPriorityLabel, taskStatusLabel, type TaskPriority, type TaskStatus } from '../../types/domain'
import './ProjectWorkspace.css'

type Tab = 'tasks' | 'groups' | 'members'
type TaskForm = { title: string; description: string; groupId: string; startDate: string; endDate: string; priority: TaskPriority; status: TaskStatus }
const blankTask: TaskForm = { title: '', description: '', groupId: '', startDate: '', endDate: '', priority: 'medium', status: 'todo' }

function errorText(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.' }

export function ProjectWorkspace({ projectId }: { projectId: number }) {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [groups, setGroups] = useState<GroupResponse[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [roles, setRoles] = useState<RoleResponse[]>([])
  const [assignees, setAssignees] = useState<Record<number, TaskAssignee[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [taskDialog, setTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null)
  const [taskForm, setTaskForm] = useState<TaskForm>(blankTask)
  const [taskError, setTaskError] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupError, setGroupError] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [userResults, setUserResults] = useState<Array<{id:number;name:string;email:string}>>([])
  const [memberError, setMemberError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [taskRows, groupRows, memberRows, roleRows] = await Promise.all([
        tasksApi.getByProject(projectId), groupsApi.getByProject(projectId), projectMembersApi.getByProject(projectId), rolesApi.getAll(),
      ])
      setTasks(taskRows); setGroups(groupRows); setMembers(memberRows); setRoles(roleRows)
      // Show the project workspace as soon as its primary data is ready.
      // Assignee details are separate requests per task, so load them in the background.
      setLoading(false)
      void Promise.all(taskRows.map(async (task) => [task.id, await tasksApi.getAssignees(task.id)] as const))
        .then((pairs) => setAssignees(Object.fromEntries(pairs)))
        .catch((assigneeError) => console.warn('Could not load task assignees', assigneeError))
    } catch (loadError) { setError(errorText(loadError)) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    let active = true
    if (tab !== 'members' || !memberQuery.trim()) { setUserResults([]); return }
    const timer = window.setTimeout(() => {
      usersApi.search(memberQuery.trim()).then((rows) => {
        if (active) setUserResults(rows.map(({ id, name, email }) => ({ id, name, email })))
      }).catch((searchError: unknown) => { if (active) setMemberError(errorText(searchError)) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [memberQuery, tab])

  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members])
  const candidates = userResults.filter((candidate) => !memberIds.has(candidate.id))

  function openTask(task?: TaskResponse) {
    setEditingTask(task ?? null)
    setTaskForm(task ? { title: task.title, description: task.description ?? '', groupId: task.groupId ? String(task.groupId) : '', startDate: task.startDate ?? '', endDate: task.endDate ?? '', priority: task.priority, status: task.status } : blankTask)
    setTaskError(''); setTaskDialog(true)
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault(); if (!taskForm.title.trim() || !user) return
    setBusy(true); setTaskError('')
    const payload = { groupId: taskForm.groupId ? Number(taskForm.groupId) : null, parentTaskId: null, title: taskForm.title.trim(), description: taskForm.description.trim(), startDate: taskForm.startDate || null, endDate: taskForm.endDate || null, progress: taskForm.status === 'done' ? 100 : 0, priority: taskForm.priority, status: taskForm.status }
    try {
      if (editingTask) await tasksApi.update(editingTask.id, payload)
      else await tasksApi.create({ projectId, ...payload, createdById: user.id })
      setTaskDialog(false); await load()
    } catch (saveError) { setTaskError(errorText(saveError)) } finally { setBusy(false) }
  }

  async function addGroup(event: FormEvent) {
    event.preventDefault(); if (!groupName.trim()) return
    setBusy(true); setGroupError('')
    try { const body: GroupRequest = { projectId, name: groupName.trim(), description: groupDescription.trim() }; await groupsApi.create(body); setGroupName(''); setGroupDescription(''); await load() }
    catch (saveError) { setGroupError(errorText(saveError)) } finally { setBusy(false) }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault(); if (!selectedUser || !selectedRole) return
    setBusy(true); setMemberError('')
    try { await projectMembersApi.add({ projectId, userId: Number(selectedUser), roleId: Number(selectedRole) }); setSelectedUser(''); setMemberQuery(''); await load() }
    catch (saveError) { setMemberError(errorText(saveError)) } finally { setBusy(false) }
  }

  async function assign(taskId: number, userId: number) {
    setBusy(true); setError('')
    try { const assigned = await tasksApi.assign(taskId, userId); setAssignees((current) => ({ ...current, [taskId]: [...(current[taskId] ?? []), assigned] })) }
    catch (failure) { setError(errorText(failure)) } finally { setBusy(false) }
  }
  async function unassign(taskId: number, userId: number) {
    setBusy(true); setError('')
    try { await tasksApi.unassign(taskId, userId); setAssignees((current) => ({ ...current, [taskId]: (current[taskId] ?? []).filter((a) => a.userId !== userId) })) }
    catch (failure) { setError(errorText(failure)) } finally { setBusy(false) }
  }

  return <section className="project-workspace content-panel">
    <nav className="project-workspace__tabs" aria-label="Project workspace sections">
      {([['tasks', `Tasks (${tasks.length})`], ['groups', `Groups (${groups.length})`], ['members', `Members (${members.length})`]] as const).map(([key, label]) => <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}
    </nav>
    {error && <ErrorState title="Could not load project data" detail={error} action={<Button onClick={() => void load()}>Try again</Button>} />}
    {loading ? <LoadingState label="Loading tasks, groups, and members…" /> : <div className="project-workspace__body">
      {tab === 'tasks' && <>
        <div className="project-workspace__heading"><div><h2>Project tasks</h2><p>Tasks are saved to this project. Assignments must use current project members.</p></div><Button variant="primary" onClick={() => openTask()}>Add task</Button></div>
        {tasks.length === 0 ? <EmptyState title="No tasks yet" detail="Add the first task to start tracking this project." /> : <div className="workspace-list">{tasks.map((task) => <article className="workspace-card" key={task.id}>
          <div className="workspace-card__main"><div><h3>{task.title}</h3><p>{task.description || 'No description'}{task.groupId ? ` · ${groups.find((group) => group.id === task.groupId)?.name ?? 'Group'}` : ''}</p></div><span className={`workspace-status workspace-status--${task.status}`}>{taskStatusLabel(task.status)}</span></div>
          <div className="workspace-card__meta"><span>{taskPriorityLabel(task.priority)} priority</span><span>{task.startDate || 'No start date'} → {task.endDate || 'No end date'}</span></div>
          <div className="workspace-card__assignees">{(assignees[task.id] ?? []).map((person) => <span className="workspace-person" key={person.userId}>{person.userName}<button type="button" aria-label={`Unassign ${person.userName}`} disabled={busy} onClick={() => void unassign(task.id, person.userId)}>×</button></span>)}<Select aria-label={`Assign member to ${task.title}`} value="" disabled={busy || members.length === 0} onChange={(event) => { if (event.target.value) void assign(task.id, Number(event.target.value)) }} options={[{ value: '', label: members.length ? 'Assign member…' : 'Add project members first' }, ...members.filter((member) => !(assignees[task.id] ?? []).some((person) => person.userId === member.userId)).map((member) => ({ value: String(member.userId), label: member.userName }))]} /></div>
          <div className="workspace-card__actions"><Button size="sm" variant="secondary" onClick={() => openTask(task)}>Edit</Button><Button size="sm" variant="danger" disabled={busy} onClick={async () => { if (window.confirm(`Delete task “${task.title}”?`)) { setBusy(true); try { await tasksApi.delete(task.id); await load() } catch (failure) { setError(errorText(failure)) } finally { setBusy(false) } } }}>Delete</Button></div>
        </article>)}</div>}
      </>}
      {tab === 'groups' && <>
        <div className="project-workspace__heading"><div><h2>Groups</h2><p>Organize project tasks into functional groups.</p></div></div>
        <form className="workspace-inline-form" onSubmit={(event) => void addGroup(event)}><Input id="new-group-name" label="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} required maxLength={100} /><Input id="new-group-description" label="Description" value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} /><Button type="submit" variant="primary" disabled={busy}>Create group</Button></form>
        {groupError && <p className="workspace-error" role="alert">{groupError}</p>}
        {groups.length === 0 ? <EmptyState title="No groups yet" detail="Create a group to organize this project's work." /> : <div className="workspace-list">{groups.map((group) => <article className="workspace-card workspace-card--compact" key={group.id}><div><h3>{group.name}</h3><p>{group.description || 'No description'} · {tasks.filter((task) => task.groupId === group.id).length} tasks</p></div><Button size="sm" variant="danger" disabled={busy} onClick={async () => { if (window.confirm(`Delete group “${group.name}”? Tasks in the group will remain ungrouped.`)) { setBusy(true); try { await groupsApi.delete(group.id); await load() } catch (failure) { setGroupError(errorText(failure)) } finally { setBusy(false) } } }}>Delete</Button></article>)}</div>}
      </>}
      {tab === 'members' && <>
        <div className="project-workspace__heading"><div><h2>Project members</h2><p>Add existing user accounts and set their project role.</p></div></div>
        <form className="workspace-inline-form workspace-inline-form--member" onSubmit={(event) => void addMember(event)}><Input id="member-search" label="Search user accounts" value={memberQuery} onChange={(event) => { setMemberQuery(event.target.value); setSelectedUser('') }} placeholder="Name or email" /><Select id="member-user" label="User" value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} options={[{ value: '', label: candidates.length ? 'Choose user' : 'Search for an account' }, ...candidates.map((person) => ({ value: String(person.id), label: `${person.name} · ${person.email}` }))]} /><Select id="member-role" label="Project role" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} options={[{ value: '', label: 'Choose role' }, ...roles.map((role) => ({ value: String(role.id), label: role.name }))]} /><Button type="submit" variant="primary" disabled={busy || !selectedUser || !selectedRole}>Add member</Button></form>
        {memberError && <p className="workspace-error" role="alert">{memberError}</p>}
        {members.length === 0 ? <EmptyState title="No member records" detail="Add a member to enable task assignment." /> : <div className="workspace-list">{members.map((member) => <article className="workspace-card workspace-card--compact" key={member.id}><div className="workspace-member"><span className="workspace-avatar">{member.userName.trim().split(/\s+/).map((part) => part[0]).slice(0,2).join('').toUpperCase()}</span><div><h3>{member.userName}</h3><p>{member.roleName}</p></div></div><Button size="sm" variant="danger" disabled={busy} onClick={async () => { if (window.confirm(`Remove ${member.userName} from this project?`)) { setBusy(true); try { await projectMembersApi.remove(member.id); await load() } catch (failure) { setMemberError(errorText(failure)) } finally { setBusy(false) } } }}>Remove</Button></article>)}</div>}
      </>}
    </div>}
    <Dialog open={taskDialog} onClose={() => { if (!busy) setTaskDialog(false) }} title={editingTask ? 'Edit task' : 'Create task'} description="Task dates, status, and priority are stored by the project service.">
      <form id="workspace-task-form" className="workspace-task-form" onSubmit={(event) => void saveTask(event)}><Input id="workspace-task-title" label="Task title" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required maxLength={200} /><Input id="workspace-task-description" label="Description" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /><Select id="workspace-task-group" label="Group" value={taskForm.groupId} onChange={(event) => setTaskForm({ ...taskForm, groupId: event.target.value })} options={[{ value: '', label: 'No group' }, ...groups.map((group) => ({ value: String(group.id), label: group.name }))]} /><div className="form-grid__two"><Input id="workspace-task-start" label="Start date" type="date" value={taskForm.startDate} onChange={(event) => setTaskForm({ ...taskForm, startDate: event.target.value })} /><Input id="workspace-task-end" label="End date" type="date" value={taskForm.endDate} onChange={(event) => setTaskForm({ ...taskForm, endDate: event.target.value })} /></div><div className="form-grid__two"><Select id="workspace-task-status" label="Status" value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value as TaskStatus })} options={TASK_STATUSES.map((status) => ({ value: status, label: taskStatusLabel(status) }))} /><Select id="workspace-task-priority" label="Priority" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })} options={TASK_PRIORITIES.map((priority) => ({ value: priority, label: taskPriorityLabel(priority) }))} /></div>{taskError && <p className="workspace-error" role="alert">{taskError}</p>}</form>
      <div className="dialog__actions"><Button variant="secondary" disabled={busy} onClick={() => setTaskDialog(false)}>Cancel</Button><Button variant="primary" disabled={busy} type="submit" form="workspace-task-form">{busy ? 'Saving…' : editingTask ? 'Save task' : 'Create task'}</Button></div>
    </Dialog>
  </section>
}
