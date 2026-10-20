import { useEffect, useMemo, useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { toLocalDateInput } from '../../lib/format'
import { documentAnalysisService, type DocumentPlanProposal, type GeneratedTaskProposal, type AnalysisProgress } from './analysisService'

type PlannerStep = 1 | 2 | 3 | 4 | 5

function localDate(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return toLocalDateInput(date)
}

function makeSamplePlan(): DocumentPlanProposal {
  return {
    requirements: [
      'Users can create an account and sign in securely.',
      'Project members can view and update task progress.',
      'Project owners can review planned delivery milestones.',
    ],
    tasks: [
      { sourceId: 1, title: 'Map functional requirements', module: 'Discovery', startDate: localDate(1), endDate: localDate(5), priority: 'high', estimateHours: 16, dependencySourceIds: [] },
      { sourceId: 2, title: 'Define acceptance criteria', module: 'Planning', startDate: localDate(4), endDate: localDate(8), priority: 'medium', estimateHours: 12, dependencySourceIds: [1] },
      { sourceId: 3, title: 'Review access and security needs', module: 'Security', startDate: localDate(2), endDate: localDate(7), priority: 'high', estimateHours: 10, dependencySourceIds: [] },
      { sourceId: 4, title: 'Prepare interface handoff', module: 'Design', startDate: localDate(9), endDate: localDate(15), priority: 'medium', estimateHours: 18, dependencySourceIds: [2] },
    ],
    milestones: [
      { title: 'Requirements review', date: localDate(8) },
      { title: 'Plan review', date: localDate(16) },
    ],
    risks: ['The sample has no team capacity or delivery calendar.'],
    assumptions: ['Dates are illustrative and must be reviewed against project availability.'],
  }
}

function hasDependencyCycle(tasks: GeneratedTaskProposal[]) {
  const byId = new Map(tasks.map((task) => [task.sourceId, task]))
  const visiting = new Set<number>()
  const visited = new Set<number>()
  function visit(id: number): boolean {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const dependency of byId.get(id)?.dependencySourceIds ?? []) if (byId.has(dependency) && visit(dependency)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return tasks.some((task) => visit(task.sourceId))
}

export function AIPlannerPage() {
  const { workspace } = useDemoWorkspace()
  const [projectId, setProjectId] = useState(String(workspace.projects[0]?.id ?? ''))
  useEffect(() => { if (!projectId && workspace.projects[0]) setProjectId(String(workspace.projects[0].id)) }, [projectId, workspace.projects])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<DocumentPlanProposal | null>(null)
  const [approved, setApproved] = useState(false)
  const [step, setStep] = useState<PlannerStep>(1)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const project = workspace.projects.find((item) => String(item.id) === projectId)

  function selectFile(candidate?: File) {
    setError('')
    setDraft(null)
    setApproved(false)
    setAnalysisProgress(null)
    if (!candidate) { setFile(null); return }
    const extension = candidate.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx', 'txt', 'md'].includes(extension ?? '')) {
      setFile(null)
      setError('Choose a PDF, DOC, DOCX, TXT, or Markdown file for this local preview.')
      return
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setFile(null)
      setError('The selected file is over the 10 MB preview limit.')
      return
    }
    setFile(candidate)
  }

  async function analyzeDocument() {
    if (!file) { setError('Choose a document first.'); return }
    if (!documentAnalysisService) {
      setError('Analysis is unavailable: this project has no document-analysis endpoint or AI provider. The file remains local and was not read or uploaded.')
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      const proposal = await documentAnalysisService.analyze(file, setAnalysisProgress)
      setDraft(proposal)
      setStep(3)
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Document analysis failed.')
    } finally { setAnalyzing(false) }
  }

  function openSamplePlan() {
    setDraft(makeSamplePlan())
    setApproved(false)
    setError('')
    setStep(3)
  }

  function editTask(sourceId: number, changes: Partial<GeneratedTaskProposal>) {
    setDraft((current) => current && ({ ...current, tasks: current.tasks.map((task) => task.sourceId === sourceId ? { ...task, ...changes } : task) }))
    setApproved(false)
  }

  function addTask() {
    setDraft((current) => current && ({ ...current, tasks: [...current.tasks, { sourceId: Math.max(0, ...current.tasks.map((task) => task.sourceId)) + 1, title: '', module: '', startDate: '', endDate: '', priority: 'medium', estimateHours: 4, dependencySourceIds: [] }] }))
  }

  const structureIsValid = Boolean(draft?.tasks.length && draft.tasks.every((task) => task.title.trim()))
  const scheduleIsValid = useMemo(() => Boolean(draft && draft.tasks.length
    && draft.tasks.every((task) => task.startDate && task.endDate && task.endDate >= task.startDate
      && task.dependencySourceIds.every((dependencyId) => draft.tasks.some((candidate) => candidate.sourceId === dependencyId) && dependencyId !== task.sourceId))
    && draft.milestones.every((milestone) => milestone.title.trim() && milestone.date)
    && !hasDependencyCycle(draft.tasks)), [draft])
  const validationMessages = useMemo(() => {
    if (!draft) return []
    const messages: string[] = []
    if (draft.tasks.some((task) => !task.title.trim())) messages.push('Every task needs a title.')
    if (draft.tasks.some((task) => !task.startDate || !task.endDate)) messages.push('Add a start and end date to every task.')
    if (draft.tasks.some((task) => task.startDate && task.endDate && task.endDate < task.startDate)) messages.push('A task ends before it starts.')
    if (draft.tasks.some((task) => task.dependencySourceIds.some((dependencyId) => dependencyId === task.sourceId || !draft.tasks.some((candidate) => candidate.sourceId === dependencyId)))) messages.push('A task has a missing or self-referencing dependency.')
    if (hasDependencyCycle(draft.tasks)) messages.push('The dependency list contains a cycle.')
    if (draft.milestones.some((milestone) => !milestone.title.trim() || !milestone.date)) messages.push('Every milestone needs a title and date.')
    return messages
  }, [draft])

  function approvePlan() {
    if (!draft || !project || !scheduleIsValid || approved) return
    setApproved(true)
  }

  const steps: Array<{ id: PlannerStep; title: string; description: string }> = [
    { id: 1, title: 'Input', description: 'Choose a project and file' },
    { id: 2, title: 'Analyze', description: 'Connect to analysis' },
    { id: 3, title: 'Structure', description: 'Review requirements and tasks' },
    { id: 4, title: 'Schedule', description: 'Review dates and dependencies' },
    { id: 5, title: 'Approve', description: 'Create the plan' },
  ]

  function changeStep(nextStep: PlannerStep) {
    if (nextStep <= 2 || draft) setStep(nextStep)
  }

  return <div className="page-stack ai-planner-page">
    <PageHeader eyebrow="PLANNING WORKFLOW" title="AI planner" description="Prepare and review a project plan." />
    <aside className="preview-notice"><span className="preview-notice__icon"><Icon name="sparkles" /></span><p><strong>Analysis is not connected.</strong> Files stay in this browser. The sample plan is not generated from your document.</p><StatusBadge tone="amber">Preview</StatusBadge></aside>
    <nav className="planner-stepper" aria-label="Planning steps"><ol>{steps.map((item) => <li key={item.id} className={`${step === item.id ? 'planner-step--current' : step > item.id ? 'planner-step--complete' : ''}`}><button type="button" disabled={item.id > step && !draft} aria-current={step === item.id ? 'step' : undefined} onClick={() => changeStep(item.id)}><span className="planner-step__number">{step > item.id ? <Icon name="check" /> : item.id}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button></li>)}</ol></nav>

    {step === 1 && <section className="content-panel planner-step-card" aria-labelledby="planner-input-heading"><div className="panel-heading"><div><h2 id="planner-input-heading">1. Input requirements</h2><p>Choose a target project and select a local file.</p></div></div><div className="planner-step-card__body">
      <Select id="planner-project" label="Target project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setApproved(false) }} options={workspace.projects.map((item) => ({ value: String(item.id), label: item.name }))} />
      <label className="document-dropzone" htmlFor="srs-file"><Icon name="inbox" /><strong>{file ? file.name : 'Select an SRS or project specification'}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || 'File type not reported'} · selected locally` : 'PDF, DOC, DOCX, TXT, or MD · up to 10 MB · local preview only'}</span><input id="srs-file" type="file" accept=".pdf,.doc,.docx,.txt,.md,application/pdf" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
      {file && <div className="planner-file-actions"><Button variant="secondary" onClick={() => selectFile(undefined)}>Remove file</Button><Button variant="secondary" onClick={() => changeStep(2)}>Continue to analysis</Button></div>}
      {!file && <div className="planner-step-callout"><strong>No document selected</strong><span>There is no configured service to read or analyze files. You can open a clearly labeled sample plan for review.</span><Button variant="secondary" onClick={openSamplePlan}>Open sample plan</Button></div>}
      {error && <ErrorState title="Could not continue" detail={error} />}
    </div></section>}

    {step === 2 && <section className="content-panel planner-step-card" aria-labelledby="planner-analyze-heading"><div className="panel-heading"><div><h2 id="planner-analyze-heading">2. Analyze requirements</h2><p>{file?.name ?? 'No file selected'}</p></div><StatusBadge tone="amber">Not connected</StatusBadge></div><div className="planner-step-card__body">
      <div className="planner-analysis-status" role="status"><Icon name="sparkles" /><div><strong>{analyzing ? analysisProgress?.message ?? 'Analyzing…' : 'Document analysis is unavailable'}</strong><p>{analysisProgress ? `${analysisProgress.percent}%` : 'The backend has no document-analysis endpoint or configured AI provider. The selected file has not been uploaded or read.'}</p></div></div>
      {error && <ErrorState title="Analysis unavailable" detail={error} />}
      <div className="planner-step-card__actions"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><span className="planner-step-card__spacer" /><Button variant="secondary" disabled={!file || analyzing || !documentAnalysisService} onClick={() => void analyzeDocument()}>{analyzing ? 'Analyzing…' : 'Analyze document'}</Button><Button variant="primary" onClick={openSamplePlan}>Review sample plan</Button></div>
    </div></section>}

    {draft && step === 3 && <section className="content-panel planner-step-card" aria-labelledby="planner-structure-heading"><div className="panel-heading"><div><h2 id="planner-structure-heading">3. Review project structure</h2><p>Illustrative sample data · {draft.tasks.length} tasks · {draft.requirements.length} requirements</p></div><StatusBadge tone="amber">Not from file</StatusBadge></div><div className="planner-step-card__body">
      <section className="draft-section"><div className="draft-section__heading"><h3>Requirements</h3><Button size="sm" variant="secondary" onClick={() => setDraft((current) => current && ({ ...current, requirements: [...current.requirements, ''] }))}>Add requirement</Button></div><div className="draft-requirements">{draft.requirements.map((requirement, index) => <label key={`requirement-${index}`}>Requirement {index + 1}<Input value={requirement} onChange={(event) => setDraft((current) => current && ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} maxLength={240} /></label>)}</div></section>
      <section className="draft-section"><div className="draft-section__heading"><h3>Tasks <span>{draft.tasks.length}</span></h3><Button size="sm" variant="secondary" onClick={addTask}>Add task</Button></div><div className="draft-task-list">{draft.tasks.map((task) => <article className="draft-task" key={task.sourceId}><div className="draft-task__heading"><strong>Task {task.sourceId}</strong><Button size="sm" variant="ghost" aria-label={`Remove task ${task.sourceId}`} onClick={() => setDraft((current) => current && ({ ...current, tasks: current.tasks.filter((item) => item.sourceId !== task.sourceId).map((item) => ({ ...item, dependencySourceIds: item.dependencySourceIds.filter((dependencyId) => dependencyId !== task.sourceId) })) }))}>Remove</Button></div><div className="draft-fields draft-fields--structure"><label>Task title<Input value={task.title} onChange={(event) => editTask(task.sourceId, { title: event.target.value })} maxLength={120} /></label><label>Team/module<Input value={task.module} onChange={(event) => editTask(task.sourceId, { module: event.target.value })} maxLength={100} /></label><label>Priority<Select value={task.priority} onChange={(event) => editTask(task.sourceId, { priority: event.target.value as GeneratedTaskProposal['priority'] })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} /></label></div></article>)}</div></section>
      {!structureIsValid && <div className="team-members-feedback team-members-feedback--error" role="alert">Add a title to every task before reviewing the schedule.</div>}
      <div className="planner-step-card__actions"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><span className="planner-step-card__spacer" /><Button variant="primary" disabled={!structureIsValid} onClick={() => setStep(4)}>Continue to schedule</Button></div>
    </div></section>}

    {draft && step === 4 && <section className="content-panel planner-step-card" aria-labelledby="planner-schedule-heading"><div className="panel-heading"><div><h2 id="planner-schedule-heading">4. Review schedule</h2><p>Review dates, dependencies, and milestones before approval.</p></div><StatusBadge tone="amber">Sample schedule</StatusBadge></div><div className="planner-step-card__body">
      <div className="planner-task-table" role="table" aria-label="Proposed task schedule"><div className="planner-task-table__header" role="row"><span role="columnheader">Task</span><span role="columnheader">Start</span><span role="columnheader">End</span><span role="columnheader">Dependencies</span></div>{draft.tasks.map((task) => <div className="planner-task-table__row" role="row" key={task.sourceId}><strong role="cell">{task.title || `Task ${task.sourceId}`}</strong><span role="cell"><Input aria-label={`Start date for ${task.title || `task ${task.sourceId}`}`} type="date" value={task.startDate} onChange={(event) => editTask(task.sourceId, { startDate: event.target.value })} /></span><span role="cell"><Input aria-label={`End date for ${task.title || `task ${task.sourceId}`}`} type="date" value={task.endDate} onChange={(event) => editTask(task.sourceId, { endDate: event.target.value })} /></span><span role="cell"><Select aria-label={`Dependencies for ${task.title || `task ${task.sourceId}`}`} multiple value={task.dependencySourceIds.map(String)} onChange={(event) => editTask(task.sourceId, { dependencySourceIds: Array.from(event.target.selectedOptions, (option) => Number(option.value)) })} options={draft.tasks.filter((candidate) => candidate.sourceId !== task.sourceId).map((candidate) => ({ value: String(candidate.sourceId), label: candidate.title || `Task ${candidate.sourceId}` }))} /></span></div>)}</div>
      <div className="draft-review__columns"><section className="draft-section"><div className="draft-section__heading"><h3>Milestones</h3><Button size="sm" variant="secondary" onClick={() => setDraft((current) => current && ({ ...current, milestones: [...current.milestones, { title: '', date: '' }] }))}>Add milestone</Button></div>{draft.milestones.map((milestone, index) => <div className="draft-milestone" key={`milestone-${index}`}><label>Title<Input value={milestone.title} onChange={(event) => setDraft((current) => current && ({ ...current, milestones: current.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} maxLength={120} /></label><label>Date<Input type="date" value={milestone.date} onChange={(event) => setDraft((current) => current && ({ ...current, milestones: current.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) }))} /></label><Button size="sm" variant="ghost" aria-label={`Remove milestone ${index + 1}`} onClick={() => setDraft((current) => current && ({ ...current, milestones: current.milestones.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</Button></div>)}</section><section className="draft-section"><h3>Assignment and capacity</h3><div className="planner-step-callout"><strong>No assignee or capacity data</strong><span>This sample includes no server-backed team capacity. No people will be assigned automatically.</span></div><strong>Risks & assumptions</strong><ul>{draft.risks.concat(draft.assumptions).map((item, index) => <li key={`note-${index}`}>{item}</li>)}</ul></section></div>
      {validationMessages.length > 0 && <div className="planner-validation" role="alert"><strong>Review these items before continuing</strong><ul>{validationMessages.map((message) => <li key={message}>{message}</li>)}</ul></div>}
      <div className="planner-step-card__actions"><Button variant="secondary" onClick={() => setStep(3)}>Back</Button><span className="planner-step-card__spacer" /><Button variant="primary" disabled={!scheduleIsValid} onClick={() => setStep(5)}>Review approval</Button></div>
    </div></section>}

    {draft && step === 5 && <section className="content-panel planner-step-card" aria-labelledby="planner-approve-heading"><div className="panel-heading"><div><h2 id="planner-approve-heading">5. Review preview</h2><p>Check the destination and proposed changes.</p></div><StatusBadge tone="amber">Preview only</StatusBadge></div><div className="planner-step-card__body">
      {!project ? <EmptyState title="Choose a target project" detail="Select a project in step 1 before approving this plan." /> : <div className="planner-approval-summary"><div><span>Target project</span><strong>{project.name}</strong></div><div><span>Tasks to add</span><strong>{draft.tasks.length}</strong></div><div><span>Milestones to add</span><strong>{draft.milestones.length}</strong></div><div><span>Assignment source</span><strong>None · unassigned</strong></div></div>}
      <div className="planner-step-callout"><strong>Preview only</strong><span>The backend currently supports saving and approving an AI schedule, but this frontend does not have an AI generation endpoint or the schedule payload needed to submit this sample plan.</span></div>
      {approved && <div className="plan-approved" role="status"><strong>Preview marked as reviewed for this session.</strong><Button variant="secondary" onClick={() => navigate('/tasks')}>Open task board</Button><Button variant="secondary" onClick={() => navigate('/timeline')}>Open timeline</Button></div>}
      <div className="planner-step-card__actions"><Button variant="secondary" onClick={() => setStep(4)}>Back</Button><span className="planner-step-card__spacer" /><Button variant="primary" onClick={approvePlan} disabled={approved || !project || !scheduleIsValid}>{approved ? 'Preview marked reviewed' : 'Mark preview reviewed'}</Button></div>
    </div></section>}
  </div>
}
