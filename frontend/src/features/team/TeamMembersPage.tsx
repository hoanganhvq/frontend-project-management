import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { groupsApi, projectMembersApi, projectsApi, rolesApi, usersApi } from '../../api/services'
import type { GroupResponse, ProjectMember, ProjectResponse, RoleResponse, UserResponse } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import './TeamMembersPage.css'

function initials(name: string) { return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed. Please try again.' }

export function TeamMembersPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [projectId, setProjectId] = useState<number | ''>('')
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [roles, setRoles] = useState<RoleResponse[]>([])
  const [groups, setGroups] = useState<GroupResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [operationError, setOperationError] = useState('')
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({})
  const [notice, setNotice] = useState('')
  const selectedProject = projects.find((project) => project.id === projectId)
  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members])
  const availableUsers = users.filter((user) => !memberIds.has(user.id))
  const filteredMembers = members.filter((member) => `${member.userName} ${member.roleName}`.toLowerCase().includes(query.trim().toLowerCase()))

  async function loadProjects() {
    setLoading(true); setError('')
    try {
      const [projectRows, roleRows, userRows] = await Promise.all([projectsApi.getAll(), rolesApi.getAll(), usersApi.search('')])
      setProjects(projectRows); setRoles(roleRows); setUsers(userRows)
      setProjectId((current) => projectRows.some((project) => project.id === current) ? current : (projectRows[0]?.id ?? ''))
    } catch (loadError) { setError(errorMessage(loadError)) } finally { setLoading(false) }
  }
  async function loadMembers(id: number) {
    const [memberRows, groupRows] = await Promise.all([projectMembersApi.getByProject(id), groupsApi.getByProject(id)])
    setMembers(memberRows); setGroups(groupRows)
  }
  useEffect(() => { void loadProjects() }, [])
  useEffect(() => {
    if (projectId === '') { setMembers([]); return }
    let active = true
    projectMembersApi.getByProject(projectId).then((rows) => { if (active) setMembers(rows) }).catch((failure: unknown) => { if (active) setError(errorMessage(failure)) })
    groupsApi.getByProject(projectId).then((rows) => { if (active) setGroups(rows) }).catch((failure: unknown) => { if (active) setError(errorMessage(failure)) })
    return () => { active = false }
  }, [projectId])

  async function addMember(event: FormEvent) {
    event.preventDefault(); if (projectId === '' || !newUserId || !newRoleId) return
    setBusy(true); setOperationError('')
    try {
      await projectMembersApi.add({ projectId, userId: Number(newUserId), roleId: Number(newRoleId), groupId: newGroupId ? Number(newGroupId) : null })
      await loadMembers(projectId); setAddOpen(false); setNewUserId(''); setNewRoleId(''); setNewGroupId(''); setNotice('Project member added.')
    } catch (failure) { setOperationError(errorMessage(failure)) } finally { setBusy(false) }
  }
  async function saveRole(member: ProjectMember) {
    const roleId = Number(roleDrafts[member.id] ?? member.roleId)
    if (roleId === member.roleId) return
    setBusy(true); setOperationError('')
    try { await projectMembersApi.updateRole(member.id, { roleId }); await loadMembers(projectId as number); setNotice(`${member.userName}'s project role was updated.`) }
    catch (failure) { setOperationError(errorMessage(failure)) } finally { setBusy(false) }
  }
  async function removeMember(member: ProjectMember) {
    if (!window.confirm(`Remove ${member.userName} from ${selectedProject?.name ?? 'this project'}?`)) return
    setBusy(true); setOperationError('')
    try { await projectMembersApi.remove(member.id); await loadMembers(projectId as number); setNotice(`${member.userName} was removed from the project.`) }
    catch (failure) { setOperationError(errorMessage(failure)) } finally { setBusy(false) }
  }

  return <div className="page-stack team-members-page">
    <PageHeader eyebrow="PROJECT DIRECTORY" title="Team Members" description="Manage project membership and roles using the backend records." actions={<Button variant="primary" disabled={projectId === '' || busy} onClick={() => { setOperationError(''); setAddOpen(true) }}><Icon name="plus" /> Add member</Button>} />
    <aside className="team-members-notice" role="note"><span className="team-members-notice__icon"><Icon name="users" /></span><div><strong>Live project membership</strong><p>Member accounts and project roles come from the server. A role update changes only the membership role.</p></div><StatusBadge tone="green">Server data</StatusBadge></aside>
    {loading ? <LoadingState label="Loading projects and roles…" /> : error && projects.length === 0 ? <ErrorState title="Could not load projects" detail={error} action={<Button onClick={() => void loadProjects()}>Try again</Button>} /> : projects.length === 0 ? <EmptyState title="No projects available" detail="Create a project before managing its members." /> : <section className="team-members-panel content-panel">
      <div className="team-members-toolbar"><div className="team-members-project-picker"><label htmlFor="team-project">Project</label><Select id="team-project" value={String(projectId)} disabled={busy} onChange={(event) => setProjectId(Number(event.target.value))} options={projects.map((project) => ({ value: String(project.id), label: project.name }))} /></div><div className="team-members-count"><strong>{members.length}</strong><span>{members.length === 1 ? 'member' : 'members'}</span></div></div>
      <div className="team-members-filters"><Input id="team-member-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or role" aria-label="Search project members" leadingIcon={<Icon name="search" />} /></div>
      {notice && <div className="team-members-feedback team-members-feedback--success" role="status">{notice}</div>}{(operationError || error) && <div className="team-members-feedback team-members-feedback--error" role="alert">{operationError || error}</div>}
      {members.length === 0 ? <EmptyState title="No project members" detail="Add existing users to this project. The project owner is stored separately from membership records." /> : filteredMembers.length === 0 ? <EmptyState title="No matching members" detail="Try another name or role." /> : <div className="team-member-list">{filteredMembers.map((member) => <article className="team-member-row" key={member.id}><span className="team-member-avatar" aria-hidden="true">{initials(member.userName)}</span><div className="team-member-identity"><h2>{member.userName}</h2><p>Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'date unavailable'}</p></div><div className="team-member-role"><StatusBadge tone={member.roleName.toLowerCase().includes('leader') ? 'blue' : 'gray'}>{member.roleName}</StatusBadge></div><div className="team-member-actions"><Select aria-label={`Role for ${member.userName}`} value={roleDrafts[member.id] ?? String(member.roleId)} disabled={busy} onChange={(event) => setRoleDrafts((current) => ({ ...current, [member.id]: event.target.value }))} options={roles.map((role) => ({ value: String(role.id), label: role.name }))} /><Button size="sm" variant="secondary" disabled={busy || Number(roleDrafts[member.id] ?? member.roleId) === member.roleId} onClick={() => void saveRole(member)}>Save role</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => void removeMember(member)}>Remove</Button></div></article>)}</div>}
      <p className="team-members-permission-note">Project owner is not included in this endpoint’s membership response. Backend authorization should be enforced on membership and role changes.</p>
    </section>}
    <Dialog open={addOpen} onClose={() => { if (!busy) setAddOpen(false) }} title="Add a project member" description={`Add an existing account to ${selectedProject?.name ?? 'this project'}.`}>
      <form id="add-project-member" className="team-member-form" onSubmit={(event) => void addMember(event)}><Input id="member-user-search" label="Search accounts" type="search" value={query} onChange={async (event) => { const value = event.target.value; setQuery(value); try { setUsers(await usersApi.search(value)) } catch (failure) { setOperationError(errorMessage(failure)) } }} placeholder="Name or email" /><Select id="member-user" label="User account" value={newUserId} onChange={(event) => setNewUserId(event.target.value)} options={[{ value: '', label: availableUsers.length ? 'Choose account' : 'No available accounts' }, ...availableUsers.map((account) => ({ value: String(account.id), label: `${account.name} · ${account.email}` }))]} /><Select id="member-role" label="Project role" value={newRoleId} onChange={(event) => setNewRoleId(event.target.value)} options={[{ value: '', label: 'Choose role' }, ...roles.map((role) => ({ value: String(role.id), label: role.name }))]} /><Select id="member-group" label="Initial group (optional)" value={newGroupId} onChange={(event) => setNewGroupId(event.target.value)} options={[{ value: '', label: 'No group' }, ...groups.map((group) => ({ value: String(group.id), label: group.name }))]} />{operationError && <p className="workspace-error" role="alert">{operationError}</p>}</form>
      <div className="dialog__actions"><Button variant="secondary" disabled={busy} onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit" form="add-project-member" disabled={busy || !newUserId || !newRoleId}>{busy ? 'Adding…' : 'Add member'}</Button></div>
    </Dialog>
  </div>
}
