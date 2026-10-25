import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { ApiError } from '../../api/client'
import type { AiScheduleMember, AiScheduleResponse, AiScheduleSummary } from '../../api/models'
import { aiSchedulesApi } from '../../api/services'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import './AIPlannerPage.css'

const MAX_PDF_BYTES = 10 * 1024 * 1024

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function AIPlannerPage() {
  const { user, status: authStatus } = useAuth()
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [autoAssignTasks, setAutoAssignTasks] = useState(false)
  const [error, setError] = useState('')
  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [schedule, setSchedule] = useState<AiScheduleResponse | null>(null)
  const [draftData, setDraftData] = useState<AiScheduleResponse['scheduleData'] | null>(null)
  const [members, setMembers] = useState<AiScheduleMember[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberError, setMemberError] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [pendingDrafts, setPendingDrafts] = useState<AiScheduleSummary[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [draftListError, setDraftListError] = useState('')
  const [working, setWorking] = useState<'idle' | 'saving' | 'approving' | 'rejecting'>('idle')
  const [actionMessage, setActionMessage] = useState('')
  const [lastDecision, setLastDecision] = useState<'Approve' | 'Reject' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function refreshPendingDrafts() {
    setLoadingDrafts(true)
    setDraftListError('')
    try {
      setPendingDrafts(await aiSchedulesApi.getPending())
    } catch (requestError) {
      setDraftListError(requestError instanceof Error ? requestError.message : 'Could not load your saved drafts.')
    } finally {
      setLoadingDrafts(false)
    }
  }

  useEffect(() => { void refreshPendingDrafts() }, [])

  function selectFile(candidate?: File) {
    setError('')
    setActionMessage('')
    setScheduleId(null)
    setSchedule(null)
    setDraftData(null)
    setStep('upload')
    if (!candidate) {
      setFile(null)
      return
    }
    if (!isPdf(candidate)) {
      setError('Choose a PDF file containing the SRS.')
      return
    }
    if (candidate.size === 0 || candidate.size > MAX_PDF_BYTES) {
      setError(candidate.size === 0 ? 'The selected PDF is empty.' : 'The PDF must be 10 MB or smaller.')
      return
    }
    setFile(candidate)
  }

  async function loadLatestPendingSchedule() {
    setLoadingSchedule(true)
    setError('')
    try {
      const savedSchedule = await aiSchedulesApi.getLatestPending()
      setSchedule(savedSchedule)
      setScheduleId(savedSchedule.id)
      setDraftData(JSON.parse(JSON.stringify(savedSchedule.scheduleData)))
      await loadAssignableMembers()
      void refreshPendingDrafts()
    } catch {
      setSchedule(null)
      setError('The webhook confirmed the save, but the backend could not load the pending schedule. Retry loading the schedule or check that n8n saved it with your user ID.')
    } finally {
      setLoadingSchedule(false)
    }
  }

  async function openPendingDraft(draftId: number) {
    setLoadingSchedule(true)
    setError('')
    setActionMessage('')
    try {
      const savedSchedule = await aiSchedulesApi.getPendingById(draftId)
      setSchedule(savedSchedule)
      setScheduleId(savedSchedule.id)
      setDraftData(JSON.parse(JSON.stringify(savedSchedule.scheduleData)))
      setFile(null)
      setStep('review')
      await loadAssignableMembers()
    } catch (requestError) {
      setDraftListError(requestError instanceof Error ? requestError.message : 'Could not open this pending draft.')
    } finally {
      setLoadingSchedule(false)
    }
  }

  async function loadAssignableMembers() {
    setLoadingMembers(true)
    setMemberError('')
    try {
      setMembers(await aiSchedulesApi.getAssignableMembers())
    } catch {
      setMembers([])
      setMemberError('Could not load team members. Schedule fields are still editable; retry the member list from this panel.')
    } finally {
      setLoadingMembers(false)
    }
  }

  async function submit() {
    if (submittingRef.current) return
    if (!file) {
      setError('Select a PDF file before generating a schedule.')
      return
    }
    if (!user?.id) {
      setError('Your authenticated user could not be identified. Sign in again and retry.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setActionMessage('')
    setScheduleId(null)
    try {
      const result = await aiSchedulesApi.generateFromPdf(file, user.id, autoAssignTasks ? 'AUTO' : undefined)
      if (result?.success !== true || result.action !== 'pending') {
        throw new Error(result?.message || 'n8n did not confirm that the schedule was saved. You can retry this upload.')
      }
      setScheduleId(Number.isInteger(result.scheduleId) ? result.scheduleId! : null)
      setActionMessage(result.message || 'The generated schedule was saved for review.')
      setSchedule(null)
      setStep('review')
      await loadLatestPendingSchedule()
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'The schedule could not be generated. Please retry.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const authUnavailable = authStatus !== 'ready' || !user
  const scheduleData = draftData
  const groups = scheduleData?.newGroups ?? []
  const tasks = scheduleData?.tasks ?? []
  const hasUnsavedChanges = !!schedule && !!draftData && JSON.stringify(schedule.scheduleData) !== JSON.stringify(draftData)

  function returnToDraftList() {
    if (hasUnsavedChanges && !window.confirm('You have unsaved edits. Return to the draft list and discard these edits?')) return
    setError('')
    setActionMessage('')
    setStep('upload')
  }

  const visibleMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    const matches = query
      ? members.filter((member) => `${member.name} ${member.position ?? ''}`.toLowerCase().includes(query))
      : members
    return matches.slice(0, query ? 20 : 8)
  }, [members, memberSearch])
  const visibleMemberIds = useMemo(() => new Set(visibleMembers.map((member) => member.id)), [visibleMembers])

  function patchProject(patch: Partial<NonNullable<AiScheduleResponse['scheduleData']['project']>>) {
    setActionMessage('')
    setDraftData((current) => current ? { ...current, project: { ...current.project, ...patch } } : current)
  }

  function patchGroup(groupIndex: number, patch: Partial<NonNullable<AiScheduleResponse['scheduleData']['newGroups']>[number]>) {
    setActionMessage('')
    setDraftData((current) => current ? { ...current, newGroups: (current.newGroups ?? []).map((group, index) => index === groupIndex ? { ...group, ...patch } : group) } : current)
  }

  function patchTask(taskIndex: number, patch: Partial<NonNullable<AiScheduleResponse['scheduleData']['tasks']>[number]>) {
    setActionMessage('')
    setDraftData((current) => {
      if (!current) return current
      const currentTasks = current.tasks ?? []
      const oldTitle = currentTasks[taskIndex]?.title
      return {
        ...current,
        tasks: currentTasks.map((task, index) => {
          if (index === taskIndex) return { ...task, ...patch }
          if (patch.title !== undefined && oldTitle !== undefined) return {
            ...task,
            parentTitle: task.parentTitle === oldTitle ? patch.title : task.parentTitle,
            dependsOnTitles: task.dependsOnTitles?.map((title) => title === oldTitle ? patch.title as string : title),
          }
          return task
        }),
      }
    })
  }

  function toggleGroupMember(groupIndex: number, memberId: number) {
    setActionMessage('')
    const currentIds = groups[groupIndex]?.memberIds ?? []
    patchGroup(groupIndex, { memberIds: currentIds.includes(memberId) ? currentIds.filter((id) => id !== memberId) : [...currentIds, memberId] })
  }

  function toggleTaskAssignee(taskIndex: number, memberId: number) {
    const task = tasks[taskIndex]
    if (!task) return
    const assigneeIds = task.assigneeIds ?? []
    const nextIds = assigneeIds.includes(memberId) ? assigneeIds.filter((id) => id !== memberId) : [...assigneeIds, memberId]
    patchTask(taskIndex, { assigneeIds: nextIds })
    const groupIndex = groups.findIndex((group) => group.tempId === task.groupTempId)
    if (groupIndex >= 0 && nextIds.includes(memberId) && !(groups[groupIndex].memberIds ?? []).includes(memberId)) {
      patchGroup(groupIndex, { memberIds: [...(groups[groupIndex].memberIds ?? []), memberId] })
    }
  }

  async function saveDraft() {
    if (!schedule || !draftData) return
    setWorking('saving')
    setError('')
    setActionMessage('')
    try {
      await aiSchedulesApi.updatePending(schedule.id, { scheduleData: draftData })
      const locallySavedSchedule = { ...schedule, scheduleData: draftData }
      setSchedule(locallySavedSchedule)

      let confirmationMessage = 'Draft saved to your account.'
      try {
        const persistedSchedule = await aiSchedulesApi.getPendingById(schedule.id)
        setSchedule(persistedSchedule)
        setDraftData(JSON.parse(JSON.stringify(persistedSchedule.scheduleData)))
      } catch {
        confirmationMessage = 'Draft was saved, but the server could not reload it for confirmation. Reopen the draft to verify.'
      }
      void refreshPendingDrafts()
      setActionMessage(confirmationMessage)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not save this draft. Please retry.')
    } finally {
      setWorking('idle')
    }
  }

  async function sendDecision(decision: 'Approve' | 'Reject') {
    if (!schedule || !draftData || !user?.id) return
    if (!draftData.project?.name?.trim()) {
      setError('Add a project name before sending this decision.')
      return
    }
    if (decision === 'Approve' && (!groups.length || !tasks.length || groups.some((group) => !group.name.trim()) || tasks.some((task) => !task.title.trim()))) {
      setError('Add at least one named group and one named task before approving the schedule.')
      return
    }
    setWorking(decision === 'Approve' ? 'approving' : 'rejecting')
    setError('')
    setActionMessage('')
    try {
      await aiSchedulesApi.updatePending(schedule.id, { scheduleData: draftData })
      setSchedule({ ...schedule, scheduleData: draftData })
      const result = decision === 'Approve'
        ? await aiSchedulesApi.approve({ scheduleId: schedule.id, leaderId: user.id })
        : await aiSchedulesApi.reject({ scheduleId: schedule.id, reason: 'Rejected from AI Planner' })
      setLastDecision(decision)
      setActionMessage(result.message || (decision === 'Approve' ? 'Project created from the approved schedule.' : 'Schedule rejected.'))
      setPendingDrafts((current) => current.filter((draft) => draft.id !== schedule.id))
      setStep('complete')
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : `Could not send the ${decision.toLowerCase()} request. Please review the fields and retry.`)
    } finally {
      setWorking('idle')
    }
  }

  return <div className="page-stack ai-planner-page">
    <PageHeader eyebrow="PLANNING WORKFLOW" title="AI planner" description="Upload an SRS PDF to generate a schedule for review." />
    <nav className="planner-stepper" aria-label="AI planning progress">
      <ol>
        <li className={step === 'upload' ? 'planner-step--current' : 'planner-step--complete'}>
          <span aria-current={step === 'upload' ? 'step' : undefined}>
            <span className="planner-step__number">{step === 'upload' ? '1' : <Icon name="check" />}</span>
            <span><strong>Upload SRS</strong><small>Generate schedule</small></span>
          </span>
        </li>
        <li className={step === 'review' ? 'planner-step--current' : step === 'complete' ? 'planner-step--complete' : ''}>
          <span aria-current={step === 'review' ? 'step' : undefined}>
            <span className="planner-step__number">{step === 'complete' ? <Icon name="check" /> : '2'}</span>
            <span><strong>Review & assign</strong><small>Edit draft</small></span>
          </span>
        </li>
        <li className={step === 'complete' ? 'planner-step--current' : ''}>
          <span aria-current={step === 'complete' ? 'step' : undefined}>
            <span className="planner-step__number">3</span>
            <span><strong>Decision complete</strong><small>Project schedule</small></span>
          </span>
        </li>
      </ol>
    </nav>

    {step === 'upload' && <section className="content-panel planner-pending-drafts" aria-labelledby="pending-drafts-heading">
      <div className="panel-heading">
        <div><h2 id="pending-drafts-heading">Saved drafts</h2><p>Continue reviewing a schedule that is still pending.</p></div>
        <Button variant="ghost" size="sm" disabled={loadingDrafts} onClick={() => void refreshPendingDrafts()}>
          {loadingDrafts ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
      {draftListError && <div className="planner-pending-drafts__error"><ErrorState title="Could not load drafts" detail={draftListError} action={<Button variant="secondary" disabled={loadingDrafts} onClick={() => void refreshPendingDrafts()}>Try again</Button>} /></div>}
      {loadingDrafts && <p className="planner-pending-loading" role="status">Loading your pending drafts…</p>}
      {!loadingDrafts && !draftListError && pendingDrafts.length === 0 && <p className="planner-pending-drafts__empty">No saved drafts are waiting for review.</p>}
      {!draftListError && pendingDrafts.length > 0 && <div className="planner-pending-drafts__list">
        {pendingDrafts.map((draft) => <article className="planner-pending-draft" key={draft.id}>
          <span className="planner-pending-draft__icon"><Icon name="sparkles" /></span>
          <div className="planner-pending-draft__details">
            <strong>{draft.projectName || 'Untitled project'}</strong>
            <span>Draft #{draft.id} · {new Date(draft.createdAt).toLocaleString()}</span>
          </div>
          <span className="planner-pending-draft__counts">{draft.totalTasks} tasks · {draft.totalGroups} groups</span>
          <Button variant="secondary" size="sm" disabled={loadingSchedule} onClick={() => void openPendingDraft(draft.id)}>
            {loadingSchedule ? 'Opening…' : 'Open draft'}
          </Button>
        </article>)}
      </div>}
    </section>}

    {step === 'upload' ? <section className={`content-panel planner-step-card${submitting ? ' planner-step-card--working' : ''}`} aria-labelledby="planner-input-heading">
      <div className="panel-heading">
        <div><h2 id="planner-input-heading">Generate a schedule</h2><p>Upload a PDF SRS to build a draft you can review and assign.</p></div>
      </div>
      <div className="planner-step-card__body">
        <label className={`document-dropzone${file ? ' document-dropzone--selected' : ''}`} htmlFor="srs-file">
          <span className="document-dropzone__icon"><Icon name="inbox" /></span>
          <span className="document-dropzone__copy"><strong>{file ? file.name : 'Choose an SRS PDF'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · PDF document` : 'Select a PDF file to start building your project schedule.'}</small></span>
          <span className="document-dropzone__format">PDF</span>
          <span className="document-dropzone__action">{file ? 'Change file' : 'Browse files'}</span>
          <input id="srs-file" type="file" accept="application/pdf,.pdf" required disabled={submitting} onChange={(event) => selectFile(event.target.files?.[0])} />
        </label>

        <label className="planner-auto-assignment" htmlFor="auto-assign-tasks">
          <input id="auto-assign-tasks" type="checkbox" checked={autoAssignTasks} disabled={submitting} onChange={(event) => setAutoAssignTasks(event.target.checked)} />
          <span><strong>Automatically assign tasks</strong><small>Let AI suggest assignees from the available project members. Leave unchecked to keep tasks unassigned.</small></span>
        </label>
        {submitting && <div className="planner-generation-progress" role="status" aria-live="polite"><span className="planner-spinner" aria-hidden="true" /><div className="planner-generation-progress__copy"><strong>Generating your schedule</strong><span>Uploading the PDF and preparing your draft. This may take a moment.</span></div><span className="planner-generation-progress__bar" aria-hidden="true"><span /></span></div>}

        <div className="planner-step-card__actions">
          {file && <Button variant="secondary" disabled={submitting} onClick={() => selectFile(undefined)}>Remove file</Button>}
          <span className="planner-step-card__spacer" />
          <Button variant="primary" disabled={authUnavailable || !file || submitting} onClick={() => void submit()}>
            {submitting && <span className="planner-spinner planner-spinner--button" aria-hidden="true" />}{submitting ? 'Generating and saving…' : 'Generate schedule'}
          </Button>
        </div>

        {authUnavailable && <p className="team-members-feedback team-members-feedback--error" role="status">{authStatus === 'loading' ? 'Loading your authenticated session…' : 'Sign in to generate a schedule.'}</p>}
        {error && <ErrorState title="Schedule generation failed" detail={error} />}
      </div>
    </section> : step === 'complete' ? <section className="content-panel planner-step-card" aria-labelledby="planner-complete-heading">
      <div className="panel-heading"><div><h2 id="planner-complete-heading">{lastDecision === 'Reject' ? 'Schedule rejected' : 'Project created'}</h2><p>The edited schedule was saved and the decision was processed by the project service.</p></div><StatusBadge tone="green">Completed</StatusBadge></div>
      <div className="planner-step-card__body">
        <p className="team-members-feedback team-members-feedback--success" role="status"><strong>{actionMessage}</strong></p>
        <div className="planner-step-card__actions">
          <span className="planner-step-card__spacer" />
          <Button variant="secondary" onClick={() => { setFile(null); setAutoAssignTasks(false); setSchedule(null); setDraftData(null); setScheduleId(null); setLastDecision(null); setActionMessage(''); setError(''); setStep('upload') }}>Generate another schedule</Button>
        </div>
      </div>
    </section> : <section className="content-panel planner-step-card" aria-labelledby="planner-review-heading">
      <div className="panel-heading">
        <div><h2 id="planner-review-heading">Review your AI schedule</h2><p>Edit the project plan, add team members, then save changes or send an approval decision.</p></div>
        <div className="panel-heading__actions">
          <Button variant="secondary" size="sm" onClick={returnToDraftList}>Back to drafts</Button>
          <StatusBadge tone="amber">Pending review</StatusBadge>
        </div>
      </div>
      <div className="planner-step-card__body">
        <div className="planner-review-intro">
          <div><span className="schedule-preview__eyebrow">SRS import complete</span><h3>{scheduleData?.project?.name || 'Untitled project'}</h3><p>{file?.name || 'Generated from uploaded SRS'}{scheduleId !== null ? ` · Schedule #${scheduleId}` : ''}</p></div>
          <span className="planner-review-intro__counts">{tasks.length} tasks <span aria-hidden="true">·</span> {groups.length} groups</span>
        </div>
        {loadingSchedule && <p className="planner-pending-loading" role="status">Loading saved schedule and team members…</p>}
        {error && <div className="planner-schedule-load-error" role="alert"><p>{error}</p>{!schedule && <Button variant="secondary" disabled={loadingSchedule} onClick={() => void loadLatestPendingSchedule()}>Retry loading</Button>}</div>}
        {actionMessage && <p className="team-members-feedback team-members-feedback--success" role="status"><strong>{actionMessage}</strong></p>}

        {schedule && scheduleData && <>
          <section className="planner-edit-section" aria-labelledby="project-fields-heading">
            <div className="planner-edit-section__heading"><div><h3 id="project-fields-heading">Project details</h3><p>These fields become the new project when you approve.</p></div><span className="planner-edit-section__step">01</span></div>
            <div className="planner-edit-grid">
              <Input id="ai-project-name" label="Project name" value={scheduleData.project?.name ?? ''} onChange={(event) => patchProject({ name: event.target.value })} maxLength={150} disabled={working !== 'idle'} />
              <Input id="ai-project-start" label="Start date" type="date" value={scheduleData.project?.startDate ?? ''} onChange={(event) => patchProject({ startDate: event.target.value })} disabled={working !== 'idle'} />
              <Input id="ai-project-end" label="End date" type="date" value={scheduleData.project?.endDate ?? ''} onChange={(event) => patchProject({ endDate: event.target.value })} disabled={working !== 'idle'} />
              <label className="planner-edit-field planner-edit-field--wide" htmlFor="ai-project-description"><span>Description</span><textarea id="ai-project-description" rows={3} value={scheduleData.project?.description ?? ''} onChange={(event) => patchProject({ description: event.target.value })} maxLength={2000} disabled={working !== 'idle'} /></label>
            </div>
          </section>

          <section className="planner-edit-section" aria-labelledby="team-assignment-heading">
            <div className="planner-edit-section__heading"><div><h3 id="team-assignment-heading">Team members</h3><p>Search once, then add members to groups and tasks below.</p></div><span className="planner-edit-section__step">02</span></div>
            <Input id="planner-member-search" label="Find a team member" type="search" placeholder="Search name or position" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} hint={loadingMembers ? 'Loading members…' : `${members.length} people available`} disabled={working !== 'idle'} />
            {memberError && <div className="planner-schedule-load-error" role="alert"><p>{memberError}</p><Button variant="secondary" disabled={loadingMembers} onClick={() => void loadAssignableMembers()}>Retry member list</Button></div>}
            {!loadingMembers && members.length === 0 && !memberError && <p className="planner-assignment-empty">No additional team members are available. The project leader will still be assigned automatically.</p>}
          </section>

          <section className="planner-edit-section" aria-labelledby="groups-heading">
            <div className="planner-edit-section__heading"><div><h3 id="groups-heading">Groups & members</h3><p>Choose who belongs to each project group.</p></div><span className="planner-edit-section__step">03</span></div>
            <div className="planner-edit-stack">
              {groups.map((group, groupIndex) => {
                const listedMembers = members.filter((member) => group.memberIds?.includes(member.id) || visibleMemberIds.has(member.id))
                const groupTaskCount = tasks.filter((task) => task.groupTempId === group.tempId).length
                return <article className="planner-group-editor" key={group.tempId}>
                  <div className="planner-group-editor__top"><Input id={`ai-group-${groupIndex}`} label="Group name" value={group.name} onChange={(event) => patchGroup(groupIndex, { name: event.target.value })} maxLength={100} disabled={working !== 'idle'} /><span className="planner-group-editor__count">{groupTaskCount} tasks</span></div>
                  <fieldset className="planner-member-picker" disabled={working !== 'idle'}><legend>Group members <span>{group.memberIds?.length ?? 0} selected</span></legend>
                    {listedMembers.length ? <div className="planner-member-picker__list">{listedMembers.map((member) => <label className="planner-member-option" key={member.id}><input type="checkbox" checked={!!group.memberIds?.includes(member.id)} onChange={() => toggleGroupMember(groupIndex, member.id)} /><span><strong>{member.name}</strong><small>{member.position || `Member #${member.id}`}</small></span></label>)}</div> : <p className="planner-assignment-empty">Type in the member search above to find people.</p>}
                  </fieldset>
                </article>
              })}
            </div>
          </section>

          <section className="planner-edit-section" aria-labelledby="tasks-heading">
            <div className="planner-edit-section__heading"><div><h3 id="tasks-heading">Tasks & assignments</h3><p>Adjust dates, priority, group and owners for each task.</p></div><span className="planner-edit-section__step">04</span></div>
            <div className="planner-task-edit-list">
              {tasks.map((task, taskIndex) => {
                const listedMembers = members.filter((member) => task.assigneeIds?.includes(member.id) || visibleMemberIds.has(member.id))
                return <details className="planner-task-editor" key={`${task.title}-${taskIndex}`}>
                  <summary><span className="planner-task-editor__title"><strong>{task.title || `Task ${taskIndex + 1}`}</strong><small>{task.startDate || 'No start'} → {task.endDate || 'No end'}</small></span><span className={`schedule-preview__priority schedule-preview__priority--${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'medium'}</span></summary>
                  <div className="planner-task-editor__body">
                    <div className="planner-edit-grid planner-edit-grid--task">
                      <Input id={`ai-task-title-${taskIndex}`} label="Task title" value={task.title} onChange={(event) => patchTask(taskIndex, { title: event.target.value })} maxLength={160} disabled={working !== 'idle'} />
                      <Input id={`ai-task-start-${taskIndex}`} label="Start date" type="date" value={task.startDate ?? ''} onChange={(event) => patchTask(taskIndex, { startDate: event.target.value })} disabled={working !== 'idle'} />
                      <Input id={`ai-task-end-${taskIndex}`} label="End date" type="date" value={task.endDate ?? ''} onChange={(event) => patchTask(taskIndex, { endDate: event.target.value })} disabled={working !== 'idle'} />
                      <Select id={`ai-task-priority-${taskIndex}`} label="Priority" value={(task.priority || 'medium').toLowerCase()} onChange={(event) => patchTask(taskIndex, { priority: event.target.value })} options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} disabled={working !== 'idle'} />
                      <Select id={`ai-task-group-${taskIndex}`} label="Group" value={task.groupTempId ?? ''} onChange={(event) => patchTask(taskIndex, { groupTempId: event.target.value || undefined })} options={[{ value: '', label: 'No group' }, ...groups.map((group) => ({ value: group.tempId, label: group.name }))]} disabled={working !== 'idle'} />
                      <label className="planner-edit-field planner-edit-field--wide" htmlFor={`ai-task-description-${taskIndex}`}><span>Description</span><textarea id={`ai-task-description-${taskIndex}`} rows={2} value={task.description ?? ''} onChange={(event) => patchTask(taskIndex, { description: event.target.value })} maxLength={2000} disabled={working !== 'idle'} /></label>
                    </div>
                    <fieldset className="planner-member-picker" disabled={working !== 'idle'}><legend>Assignees <span>{task.assigneeIds?.length ?? 0} selected</span></legend>
                      {listedMembers.length ? <div className="planner-member-picker__list planner-member-picker__list--compact">{listedMembers.map((member) => <label className="planner-member-option" key={member.id}><input type="checkbox" checked={!!task.assigneeIds?.includes(member.id)} onChange={() => toggleTaskAssignee(taskIndex, member.id)} /><span><strong>{member.name}</strong><small>{member.position || `Member #${member.id}`}</small></span></label>)}</div> : <p className="planner-assignment-empty">Search for available team members above.</p>}
                    </fieldset>
                    {!!task.dependsOnTitles?.length && <p className="schedule-preview__dependencies"><strong>Depends on:</strong> {task.dependsOnTitles.join(', ')}</p>}
                  </div>
                </details>
              })}
            </div>
          </section>
        </>}

        {!schedule && !loadingSchedule && <Button variant="secondary" onClick={() => void loadLatestPendingSchedule()}>Retry loading schedule</Button>}
        {schedule && <div className="planner-review-footer">
          <div className="planner-review-footer__message" aria-live="polite">{actionMessage || (hasUnsavedChanges ? 'You have unsaved edits.' : 'All changes are saved as a draft.')}</div>
          <div className="planner-review-footer__actions">
            <Button variant="danger" disabled={working !== 'idle' || !draftData} onClick={() => void sendDecision('Reject')}>{working === 'rejecting' ? 'Sending rejection…' : 'Reject'}</Button>
            <Button variant="secondary" disabled={working !== 'idle'} onClick={() => void saveDraft()}>{working === 'saving' ? 'Saving draft…' : 'Save draft'}</Button>
            <Button variant="primary" disabled={working !== 'idle' || !draftData} onClick={() => void sendDecision('Approve')}>{working === 'approving' ? 'Approving…' : 'Approve schedule'}</Button>
          </div>
        </div>}
      </div>
    </section>}
  </div>
}
