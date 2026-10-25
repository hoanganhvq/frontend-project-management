import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { projectMembersApi } from '../../api/services'
import { isApiError } from '../../api/client'
import type { ProjectMember, ProjectMemberCandidate, ProjectMemberProject } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ProjectGroupsPanel, type ProjectGroupData } from './ProjectGroupsPanel'
import './TeamMembersPage.css'

type RoleFilter = 'all' | 'OWNER' | 'LEADER' | 'MEMBER'
type ProjectRole = 'LEADER' | 'MEMBER'
type GroupFilter = number | 'all'

function initials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function errorMessage(error: unknown): string {
  if (isApiError(error) && error.status === 401) return 'Your session has expired or you are not signed in. Sign in, then try again.'
  if (isApiError(error) && error.status === 403) return 'Your account does not have permission to access or change this project roster.'
  return error instanceof Error ? error.message : 'The request could not be completed. Please try again.'
}

function formatJoinedAt(value: string | null): string {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

export function TeamMembersPage() {
  const [requestedProjectName] = useState(() => new URLSearchParams(window.location.search).get('projectName')?.trim() ?? '')
  const [projects, setProjects] = useState<ProjectMemberProject[]>([])
  const [projectId, setProjectId] = useState<number | ''>(() => {
    const value = Number(new URLSearchParams(window.location.search).get('projectId'))
    return Number.isSafeInteger(value) && value > 0 ? value : ''
  })
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [groupData, setGroupData] = useState<ProjectGroupData>({ groups: [], membersByGroup: {} })
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberReload, setMemberReload] = useState(0)
  const [pageError, setPageError] = useState('')
  const [projectSelectionNotice, setProjectSelectionNotice] = useState('')
  const [operationError, setOperationError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [detailMember, setDetailMember] = useState<ProjectMember | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidates, setCandidates] = useState<ProjectMemberCandidate[]>([])
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [candidateReload, setCandidateReload] = useState(0)
  const [candidateId, setCandidateId] = useState<number | ''>('')
  const [newRole, setNewRole] = useState<ProjectRole>('MEMBER')
  const [roleDrafts, setRoleDrafts] = useState<Record<number, ProjectRole>>({})
  const [removeMember, setRemoveMember] = useState<ProjectMember | null>(null)

  const selectedProject = projects.find((project) => project.id === projectId) ?? null
  const acceptGroupData = useCallback((data: ProjectGroupData) => {
    setGroupData(data)
    setGroupFilter((current) => current === 'all' || data.groups.some((group) => group.id === current) ? current : 'all')
  }, [])

  async function loadProjects() {
    setLoadingProjects(true)
    setPageError('')
    try {
      const result = await projectMembersApi.getVisibleProjects()
      setProjects(result)
      const requestedId = Number(new URLSearchParams(window.location.search).get('projectId'))
      const requestedById = Number.isSafeInteger(requestedId) && requestedId > 0
      const requestedMatches = requestedProjectName ? result.filter((project) => project.name.toLocaleLowerCase() === requestedProjectName.toLocaleLowerCase()) : []
      const requestedSelection = requestedById
        ? result.find((project) => project.id === requestedId)?.id ?? ''
        : requestedProjectName && requestedMatches.length === 1 ? requestedMatches[0].id : ''
      setProjectSelectionNotice(requestedById && requestedSelection === ''
        ? 'That project is not in your accessible server project list.'
        : requestedProjectName && requestedMatches.length === 0
          ? `No server project named “${requestedProjectName}” is available. Choose the matching server project if it has a different name.`
          : requestedProjectName && requestedMatches.length > 1
            ? 'More than one server project has this name. Select the correct project below.'
            : '')
      setProjectId((current) => result.some((project) => project.id === current) ? current : requestedSelection || (requestedProjectName || requestedById ? '' : result[0]?.id ?? ''))
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => { void loadProjects() }, [])

  useEffect(() => {
    setMembers([])
    setPageError('')
    if (projectId === '') { setLoadingMembers(false); return }
    let active = true
    setLoadingMembers(true)
    projectMembersApi.getByProject(projectId).then((result) => {
      if (active) setMembers(result)
    }).catch((error: unknown) => {
      if (active) setPageError(errorMessage(error))
    }).finally(() => {
      if (active) setLoadingMembers(false)
    })
    return () => { active = false }
  }, [projectId, memberReload])

  useEffect(() => {
    if (!addOpen || projectId === '' || !selectedProject?.canManageMembers) return
    let active = true
    setCandidateLoading(true)
    setCandidateError('')
    projectMembersApi.searchCandidates(projectId, candidateQuery).then((result) => {
      if (active) {
        setCandidates(result)
        setCandidateId((current) => result.some((candidate) => candidate.id === current) ? current : (result[0]?.id ?? ''))
      }
    }).catch((error: unknown) => {
      if (active) setCandidateError(errorMessage(error))
    }).finally(() => {
      if (active) setCandidateLoading(false)
    })
    return () => { active = false }
  }, [addOpen, candidateQuery, candidateReload, projectId, selectedProject?.canManageMembers])

  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return members.filter((member) =>
      (roleFilter === 'all' || member.roleName === roleFilter)
      && (groupFilter === 'all' || (groupData.membersByGroup[groupFilter] ?? []).some((groupMember) => groupMember.memberId === member.userId))
      && (!needle || member.userName.toLocaleLowerCase().includes(needle) || member.email.toLocaleLowerCase().includes(needle)),
    )
  }, [members, query, roleFilter, groupFilter, groupData.membersByGroup])

  function showSuccess(message: string) {
    setNotice(message)
    setOperationError('')
    window.setTimeout(() => setNotice(''), 4000)
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (projectId === '' || candidateId === '') return
    setBusy(true)
    setOperationError('')
    try {
      const added = await projectMembersApi.add(projectId, { userId: candidateId, roleName: newRole })
      setMembers((current) => [...current, added].sort((a, b) => a.userName.localeCompare(b.userName)))
      setAddOpen(false)
      setCandidateQuery('')
      showSuccess(`${added.userName} was added to ${selectedProject?.name}.`)
    } catch (error) {
      setOperationError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleRoleChange(member: ProjectMember) {
    if (projectId === '' || member.id === null) return
    const roleName = roleDrafts[member.id] ?? 'MEMBER'
    if (roleName === member.roleName) return
    setBusy(true)
    setOperationError('')
    try {
      const updated = await projectMembersApi.updateRole(projectId, member.id, { roleName })
      setMembers((current) => current.map((item) => item.id === member.id ? updated : item))
      showSuccess(`${member.userName}'s project role was updated.`)
    } catch (error) {
      setOperationError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemoveMember() {
    if (projectId === '' || removeMember?.id === null || !removeMember) return
    setBusy(true)
    setOperationError('')
    try {
      await projectMembersApi.remove(projectId, removeMember.id)
      setMembers((current) => current.filter((member) => member.id !== removeMember.id))
      showSuccess(`${removeMember.userName} was removed from ${selectedProject?.name}.`)
      setRemoveMember(null)
    } catch (error) {
      setOperationError(errorMessage(error))
      setRemoveMember(null)
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-stack team-members-page">
    <PageHeader eyebrow="PROJECT DIRECTORY" title="Team Members" description="Manage people and project roles from the project membership records." actions={<Button variant="primary" disabled={!selectedProject?.canManageMembers || busy} title={!selectedProject?.canManageMembers ? 'Only the project owner or a project leader can add members.' : undefined} onClick={() => { setAddOpen(true); setOperationError('') }}><Icon name="plus" /> Add member</Button>} />

    {loadingProjects ? <LoadingState label="Loading your projects…" />
      : pageError && projects.length === 0 ? <ErrorState title="Could not load your projects" detail={pageError} action={<Button onClick={() => void loadProjects()}>Try again</Button>} />
        : projects.length === 0 ? <EmptyState title="No projects available" detail="You are not currently listed as the owner or a member of any project. Project access is required before a roster can be shown." />
          : <>
            <section className="team-members-panel content-panel" aria-label="Project member directory">
              <div className="team-members-toolbar">
                <div className="team-members-project-picker"><label htmlFor="team-project">Project</label><Select id="team-project" aria-label="Select project" value={String(projectId)} disabled={busy} onChange={(event) => { setProjectId(event.target.value ? Number(event.target.value) : ''); setProjectSelectionNotice(''); setNewRole('MEMBER') }} options={[{ value: '', label: 'Choose a project' }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))]} /></div>
                <div className="team-members-count"><span className="team-members-count__label">People in this project</span><strong>{selectedProject ? members.length : 0}<small>{members.length === 1 ? ' member' : ' members'}</small></strong></div>
              </div>

              <div className="team-members-filters">
                <Input id="team-member-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" aria-label="Search project members by name or email" leadingIcon={<Icon name="search" />} />
                <Select id="team-role-filter" aria-label="Filter by project role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} options={[{ value: 'all', label: 'All project roles' }, { value: 'OWNER', label: 'Owner' }, { value: 'LEADER', label: 'Leader' }, { value: 'MEMBER', label: 'Member' }]} />
                {groupData.groups.length > 0 && <Select id="team-group-filter" aria-label="Filter by team or module" value={String(groupFilter)} onChange={(event) => setGroupFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))} options={[{ value: 'all', label: 'All teams and modules' }, ...groupData.groups.map((group) => ({ value: String(group.id), label: group.name }))]} />}
              </div>

              {notice && <div className="team-members-feedback team-members-feedback--success" role="status"><Icon name="check" />{notice}</div>}
              {operationError && <div className="team-members-feedback team-members-feedback--error" role="alert">{operationError}</div>}
              {projectSelectionNotice && <div className="team-members-feedback" role="status">{projectSelectionNotice}</div>}
              {pageError ? <ErrorState title="Could not load project members" detail={pageError} action={<Button onClick={() => setMemberReload((value) => value + 1)}>Try again</Button>} />
                : loadingMembers ? <LoadingState label="Loading project members…" />
                  : projectId === '' ? <EmptyState title="Choose a server project" detail="Select a project to view its live member roster." />
                    : members.length === 0 ? <EmptyState title="No member records yet" detail="This project has no member records yet." action={selectedProject?.canManageMembers ? <Button variant="primary" onClick={() => setAddOpen(true)}><Icon name="plus" /> Add the first member</Button> : undefined} />
                    : filteredMembers.length === 0 ? <EmptyState title="No matching members" detail="Try a different name, email, or project role filter." />
                      : <div className="team-member-table-wrap"><table className="data-table team-member-table"><thead><tr><th scope="col">Member</th><th scope="col">Position</th><th scope="col">Project role</th><th scope="col">Joined</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{filteredMembers.map((member) => {
                        const editable = selectedProject?.canManageMembers && !member.projectOwner && member.id !== null
                        const chosenRole = member.id === null ? 'MEMBER' : roleDrafts[member.id] ?? (member.roleName === 'LEADER' ? 'LEADER' : 'MEMBER')
                        return <tr key={member.id ?? `owner-${member.userId}`}>
                          <td><div className="team-member-identity"><span className="team-member-avatar" aria-hidden="true">{member.photo ? <img src={member.photo} alt="" /> : initials(member.userName)}</span><span className="team-member-identity__copy"><strong>{member.userName}</strong><small>{member.email}</small></span></div></td>
                          <td><span className="team-member-position">{member.position || '—'}</span></td>
                          <td><StatusBadge tone={member.roleName === 'OWNER' ? 'purple' : member.roleName === 'LEADER' ? 'blue' : 'gray'}>{member.roleName === 'OWNER' ? 'Owner' : member.roleName === 'LEADER' ? 'Leader' : 'Member'}</StatusBadge></td>
                          <td><span className="team-member-joined">{formatJoinedAt(member.joinedAt)}</span></td>
                          <td><div className="team-member-actions">
                            {editable && <><Select aria-label={`Set project role for ${member.userName}`} value={chosenRole} disabled={busy} onChange={(event) => setRoleDrafts((current) => ({ ...current, [member.id as number]: event.target.value as ProjectRole }))} options={[{ value: 'MEMBER', label: 'Member' }, ...(selectedProject?.canAssignLeader || chosenRole === 'LEADER' ? [{ value: 'LEADER', label: 'Leader' }] : [])]} /><Button size="sm" variant="secondary" disabled={busy || chosenRole === member.roleName} onClick={() => void handleRoleChange(member)}>Save role</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => { setRemoveMember(member); setOperationError('') }}>Remove</Button></>}
                            <Button size="sm" variant="ghost" onClick={() => setDetailMember(member)}>View details</Button>
                          </div></td>
                        </tr>
                      })}</tbody></table></div>}
            </section>
            {selectedProject && <ProjectGroupsPanel projectId={selectedProject.id} projectName={selectedProject.name} projectMembers={members} canManage={selectedProject.canManageMembers} onGroupData={acceptGroupData} />}
            <p className="team-members-permission-note">{selectedProject?.canManageMembers ? 'You can manage this project roster. The server checks your owner or LEADER permission on every change.' : 'You can view this roster. Only the project owner or a LEADER can change membership.'}</p>
          </>}

    <Dialog open={addOpen} title="Add a project member" description={`Choose an existing user account to add to ${selectedProject?.name ?? 'this project'}.`} onClose={() => { if (!busy) { setAddOpen(false); setOperationError('') } }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit" form="add-project-member" disabled={busy || candidateId === '' || !selectedProject?.canManageMembers}>{busy ? 'Adding…' : 'Add member'}</Button></>}>
      <form id="add-project-member" className="team-member-form" onSubmit={(event) => void handleAddMember(event)}>
        <Input id="candidate-search" label="Find an existing account" type="search" value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="Search by name or email" leadingIcon={<Icon name="search" />} />
        {candidateLoading ? <LoadingState label="Searching user accounts…" /> : candidateError ? <ErrorState title="Could not search accounts" detail={candidateError} action={<Button onClick={() => setCandidateReload((value) => value + 1)}>Try again</Button>} /> : candidates.length === 0 ? <EmptyState title="No matching accounts" detail="Try another name or email. No user account will be created by this form." /> : <Select id="candidate-account" label="User account" value={String(candidateId)} onChange={(event) => setCandidateId(Number(event.target.value))} options={candidates.map((candidate) => ({ value: String(candidate.id), label: `${candidate.name} · ${candidate.email}` }))} />}
        <Select id="new-project-role" label="Project role" value={newRole} onChange={(event) => setNewRole(event.target.value as ProjectRole)} options={[{ value: 'MEMBER', label: 'Member' }, ...(selectedProject?.canAssignLeader ? [{ value: 'LEADER', label: 'Leader' }] : [])]} />
        <p className="team-member-form__note">The list contains existing user accounts only. A project role does not change the account’s system role.</p>
        {operationError && <div className="team-members-feedback team-members-feedback--error" role="alert">{operationError}</div>}
      </form>
    </Dialog>

    <Dialog open={detailMember !== null} title={detailMember?.userName ?? 'Member details'} description="Project membership and skills" onClose={() => setDetailMember(null)}>
      {detailMember && <div className="team-member-detail"><div className="team-member-detail__identity"><span className="team-member-avatar team-member-avatar--large" aria-hidden="true">{detailMember.photo ? <img src={detailMember.photo} alt="" /> : initials(detailMember.userName)}</span><div><strong>{detailMember.userName}</strong><span>{detailMember.email}</span><span>{detailMember.position || 'Position not provided'}</span></div><StatusBadge tone={detailMember.roleName === 'OWNER' ? 'purple' : detailMember.roleName === 'LEADER' ? 'blue' : 'gray'}>{detailMember.roleName === 'OWNER' ? 'Owner' : detailMember.roleName === 'LEADER' ? 'Leader' : 'Member'}</StatusBadge></div><dl className="team-member-details"><div><dt>Project</dt><dd>{detailMember.projectName}</dd></div><div><dt>Joined project</dt><dd>{formatJoinedAt(detailMember.joinedAt)}</dd></div></dl><section className="team-member-skills" aria-labelledby="member-skills-title"><div className="team-member-skills__heading"><div><span>PROFILE</span><h3 id="member-skills-title">Member skills</h3></div><span>{(detailMember.skills ?? []).length} {(detailMember.skills ?? []).length === 1 ? 'skill' : 'skills'}</span></div>{(detailMember.skills ?? []).length ? <ul>{detailMember.skills.map((skill) => { const level = skill.level || 'Unspecified'; return <li key={skill.skillId}><span className="team-member-skill__mark"><Icon name="check" /></span><span className="team-member-skill__copy"><strong>{skill.name}</strong><small>{skill.category || 'General skill'}</small></span><span className={`team-member-skill__level team-member-skill__level--${level.toLowerCase()}`}>{level}</span></li> })}</ul> : <p className="team-member-skills__empty">No skills have been added to this member’s profile yet.</p>}</section></div>}
    </Dialog>

    <Dialog open={removeMember !== null} title="Remove project member?" description={`This removes ${removeMember?.userName ?? 'this person'} from ${selectedProject?.name ?? 'the project'}. Their user account will not be deleted.`} onClose={() => { if (!busy) setRemoveMember(null) }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setRemoveMember(null)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => void confirmRemoveMember()}>{busy ? 'Removing…' : 'Remove member'}</Button></>}>
      <p>The server will verify your project permissions and protect the project owner and final LEADER from removal.</p>
    </Dialog>
  </div>
}
