import { useEffect, useState, type FormEvent } from 'react'
import { groupMembersApi, groupsApi } from '../../api/services'
import type { GroupMember, ProjectGroup, ProjectMember } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'

export type ProjectGroupData = { groups: ProjectGroup[]; membersByGroup: Record<number, GroupMember[]> }

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

export function ProjectGroupsPanel({ projectId, projectName, projectMembers, canManage, onGroupData }: {
  projectId: number
  projectName: string
  projectMembers: ProjectMember[]
  canManage: boolean
  onGroupData: (data: ProjectGroupData) => void
}) {
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [membersByGroup, setMembersByGroup] = useState<Record<number, GroupMember[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [formGroup, setFormGroup] = useState<ProjectGroup | null | undefined>(undefined)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteGroup, setDeleteGroup] = useState<ProjectGroup | null>(null)
  const [memberChoices, setMemberChoices] = useState<Record<number, string>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.resolve().then(async () => {
      const loadedGroups = await groupsApi.getByProject(projectId)
      const entries = await Promise.all(loadedGroups.map(async (group) => [group.id, await groupMembersApi.getByGroup(group.id)] as const))
      if (!active) return
      const loadedMembers = Object.fromEntries(entries)
      setGroups(loadedGroups)
      setMembersByGroup(loadedMembers)
      onGroupData({ groups: loadedGroups, membersByGroup: loadedMembers })
      setMemberChoices(Object.fromEntries(loadedGroups.map((group) => {
        const current = loadedMembers[group.id] ?? []
        const firstAvailable = projectMembers.find((member) => !current.some((item) => item.memberId === member.userId))
        return [group.id, firstAvailable ? String(firstAvailable.userId) : '']
      })))
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load project groups.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, reload, onGroupData, projectMembers])

  function announce(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  function openCreate() {
    setFormGroup(null)
    setGroupName('')
    setGroupDescription('')
    setFormError('')
  }

  function openEdit(group: ProjectGroup) {
    setFormGroup(group)
    setGroupName(group.name)
    setGroupDescription(group.description ?? '')
    setFormError('')
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = groupName.trim()
    if (!name) { setFormError('Enter a group name.'); return }
    setBusy(true)
    setFormError('')
    try {
      if (formGroup) {
        await groupsApi.update(formGroup.id, { projectId, name, description: groupDescription.trim() })
        announce(`${name} was updated.`)
      } else {
        await groupsApi.create({ projectId, name, description: groupDescription.trim() })
        announce(`${name} was created.`)
      }
      setFormGroup(undefined)
      setReload((current) => current + 1)
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'The group could not be saved.')
    } finally { setBusy(false) }
  }

  async function confirmDeleteGroup() {
    if (!deleteGroup) return
    setBusy(true)
    try {
      await groupsApi.remove(deleteGroup.id)
      announce(`${deleteGroup.name} was removed.`)
      setDeleteGroup(null)
      setReload((current) => current + 1)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The group could not be removed.')
      setDeleteGroup(null)
    } finally { setBusy(false) }
  }

  async function addMember(group: ProjectGroup) {
    const userId = Number(memberChoices[group.id])
    if (!Number.isSafeInteger(userId) || userId <= 0) return
    setBusy(true)
    try {
      await groupMembersApi.add(group.id, userId)
      announce('Member added to group.')
      setReload((current) => current + 1)
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'The member could not be added to the group.')
    } finally { setBusy(false) }
  }

  async function removeMember(group: ProjectGroup, member: GroupMember) {
    setBusy(true)
    try {
      await groupMembersApi.remove(group.id, member.memberId)
      announce(`${member.memberName} was removed from ${group.name}.`)
      setReload((current) => current + 1)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'The member could not be removed from the group.')
    } finally { setBusy(false) }
  }

  return <section className="content-panel project-groups-panel" aria-labelledby="project-groups-title">
    <div className="panel-heading"><div><h2 id="project-groups-title">Teams and modules</h2><p>Groups belong to this project. A person can be in more than one group.</p></div>{canManage && <Button variant="secondary" size="sm" icon={<Icon name="plus" />} onClick={openCreate}>New group</Button>}</div>
    {notice && <div className="team-members-feedback team-members-feedback--success" role="status"><Icon name="check" />{notice}</div>}
    {error ? <ErrorState title="Could not load project groups" detail={error} action={<Button onClick={() => setReload((value) => value + 1)}>Try again</Button>} />
      : loading ? <LoadingState label="Loading project groups…" />
        : groups.length === 0 ? <EmptyState title="No groups in this project" detail={canManage ? 'Create groups such as Frontend, Backend, UI/UX, QA, or DevOps, then assign project members.' : 'This project does not have any groups yet.'} action={canManage ? <Button variant="primary" onClick={openCreate}>Create first group</Button> : undefined} />
          : <div className="project-group-list">{groups.map((group) => {
            const groupedMembers = membersByGroup[group.id] ?? []
            const availableMembers = projectMembers.filter((member) => !groupedMembers.some((item) => item.memberId === member.userId))
            return <article className="project-group-card" key={group.id}>
              <div className="project-group-card__header"><div><h3>{group.name}</h3><p>{group.description || 'No description'}</p></div><span className="project-group-card__count">{groupedMembers.length} {groupedMembers.length === 1 ? 'member' : 'members'}</span>{canManage && <div className="project-group-card__actions"><Button size="sm" variant="ghost" aria-label={`Rename ${group.name}`} onClick={() => openEdit(group)}>Edit</Button><Button size="sm" variant="danger" aria-label={`Delete ${group.name}`} onClick={() => setDeleteGroup(group)}>Delete</Button></div>}</div>
              {groupedMembers.length ? <ul className="project-group-members">{groupedMembers.map((member) => <li key={member.id}><span className="project-group-avatar" aria-hidden="true">{initials(member.memberName)}</span><span className="project-group-member-copy"><strong>{member.memberName}</strong><small>{member.memberEmail}</small></span>{canManage && <Button size="sm" variant="ghost" aria-label={`Remove ${member.memberName} from ${group.name}`} disabled={busy} onClick={() => void removeMember(group, member)}>Remove</Button>}</li>)}</ul> : <p className="project-group-empty">No assigned members yet.</p>}
              {canManage && availableMembers.length > 0 && <div className="project-group-add"><Select aria-label={`Choose a project member for ${group.name}`} value={memberChoices[group.id] ?? String(availableMembers[0].userId)} onChange={(event) => setMemberChoices((current) => ({ ...current, [group.id]: event.target.value }))} options={availableMembers.map((member) => ({ value: String(member.userId), label: `${member.userName} · ${member.roleName}` }))} /><Button size="sm" variant="secondary" disabled={busy || !memberChoices[group.id]} onClick={() => void addMember(group)}>Add to group</Button></div>}
            </article>
          })}</div>}
    <Dialog open={formGroup !== undefined} title={formGroup ? 'Edit project group' : 'Create project group'} description={`Save a team or module under ${projectName}.`} onClose={() => { if (!busy) setFormGroup(undefined) }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setFormGroup(undefined)}>Cancel</Button><Button type="submit" form="project-group-form" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save group'}</Button></>}>
      <form id="project-group-form" className="team-member-form" onSubmit={(event) => void saveGroup(event)}><Input id="project-group-name" label="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={100} required /><Input id="project-group-description" label="Description" value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} maxLength={500} />{formError && <div className="team-members-feedback team-members-feedback--error" role="alert">{formError}</div>}</form>
    </Dialog>
    <Dialog open={deleteGroup !== null} title="Delete project group?" description={`Delete ${deleteGroup?.name ?? 'this group'} from ${projectName}. Members remain in the project; group assignment is removed.`} onClose={() => { if (!busy) setDeleteGroup(null) }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setDeleteGroup(null)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => void confirmDeleteGroup()}>{busy ? 'Deleting…' : 'Delete group'}</Button></>}><p>This does not delete project members or their user accounts.</p></Dialog>
  </section>
}
