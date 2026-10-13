import { useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/States'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { documentAnalysisService, type DocumentPlanProposal, type GeneratedTaskProposal } from './analysisService'

function localDate(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
    risks: ['The sample does not include team capacity or a delivery calendar.'],
    assumptions: ['Dates are illustrative and should be reviewed against project availability.', 'The sample requirements are unrelated to any uploaded document.'],
  }
}

export function AIPlannerPage() {
  const { workspace, createTask, updateTask, addMilestones } = useDemoWorkspace()
  const [projectId, setProjectId] = useState(String(workspace.projects[0]?.id ?? ''))
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<DocumentPlanProposal | null>(null)
  const [approved, setApproved] = useState(false)
  const project = workspace.projects.find((item) => String(item.id) === projectId)

  function selectFile(candidate?: File) {
    setError('')
    setDraft(null)
    setApproved(false)
    if (!candidate) { setFile(null); return }
    const extension = candidate.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx', 'txt', 'md'].includes(extension ?? '')) {
      setFile(null)
      setError('Choose a PDF, DOC, DOCX, TXT, or Markdown file.')
      return
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setFile(null)
      setError('The selected file is over the 10 MB demo limit.')
      return
    }
    setFile(candidate)
  }

  async function analyzeDocument() {
    if (!file) { setError('Choose a document first.'); return }
    if (!documentAnalysisService) {
      setError('Document analysis is unavailable: no AI provider or analysis API is configured. The selected file has not been uploaded or read.')
      return
    }
    setError('')
    try {
      const proposal = await documentAnalysisService.analyze(file, () => undefined)
      setDraft(proposal)
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Document analysis failed.')
    }
  }

  function editTask(sourceId: number, changes: Partial<GeneratedTaskProposal>) {
    setDraft((current) => current && ({ ...current, tasks: current.tasks.map((task) => task.sourceId === sourceId ? { ...task, ...changes } : task) }))
  }

  function addTask() {
    setDraft((current) => current && ({ ...current, tasks: [...current.tasks, { sourceId: Math.max(0, ...current.tasks.map((task) => task.sourceId)) + 1, title: '', module: '', startDate: '', endDate: '', priority: 'medium', estimateHours: 4, dependencySourceIds: [] }] }))
  }

  function approvePlan() {
    if (!draft || !project) return
    const idMap = new Map<number, number>()
    draft.tasks.forEach((proposal) => {
      const id = createTask({ projectId: project.id, groupId: null, parentTaskId: null, title: proposal.title.trim(), description: `Illustrative task from the sample planning draft (${proposal.module || 'Unassigned module'}).`, startDate: proposal.startDate, endDate: proposal.endDate, progress: 0, priority: proposal.priority, status: 'todo', boardColumn: 'todo', module: proposal.module, estimateHours: proposal.estimateHours, dependencyIds: [] })
      idMap.set(proposal.sourceId, id)
    })
    draft.tasks.forEach((proposal) => {
      const id = idMap.get(proposal.sourceId)
      if (id) updateTask(id, { dependencyIds: proposal.dependencySourceIds.map((sourceId) => idMap.get(sourceId)).filter((dependencyId): dependencyId is number => dependencyId !== undefined) })
    })
    addMilestones(draft.milestones.map((milestone) => ({ projectId: project.id, title: milestone.title, date: milestone.date, status: 'upcoming' })))
    setApproved(true)
  }

  return <div className="page-stack">
    <PageHeader eyebrow="DOCUMENT PLANNING" title="AI planner" description="Upload a specification, review the integration state, and prepare a draft for a project." />
    <aside className="preview-notice"><span className="preview-notice__icon"><Icon name="sparkles" /></span><p><strong>Demo mode.</strong> No document is uploaded, parsed, or sent to an AI provider. The sample draft below is not derived from your file.</p><span className="demo-label"><span />Demo data</span></aside>
    <section className="content-panel planner-upload"><div className="panel-heading"><div><h2>1. Choose a project and specification</h2><p>File metadata is held in this page only; this browser demo does not upload the file.</p></div></div>
      <div className="planner-upload__body"><Select id="planner-project" label="Target project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setApproved(false) }} options={workspace.projects.map((item) => ({ value: String(item.id), label: item.name }))} />
        <label className="document-dropzone" htmlFor="srs-file"><Icon name="inbox" /><strong>{file ? file.name : 'Select an SRS or project specification'}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || 'File type not reported'} · modified ${new Date(file.lastModified).toLocaleDateString()} · local metadata only` : 'PDF, DOC, DOCX, TXT, or MD · up to 10 MB'}</span><input id="srs-file" type="file" accept=".pdf,.doc,.docx,.txt,.md,application/pdf" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
        {file && <div className="planner-file-actions"><Button variant="secondary" onClick={() => selectFile(undefined)}>Remove file</Button><Button variant="secondary" onClick={analyzeDocument}>Analyze document</Button><Button variant="primary" onClick={() => { setDraft(makeSamplePlan()); setApproved(false); setError('') }}>Open built-in sample plan</Button></div>}
        {!file && <Button variant="primary" onClick={() => { setDraft(makeSamplePlan()); setApproved(false) }}>Open built-in sample plan</Button>}
        {error && <ErrorState title="Analysis unavailable" detail={error} />}
        <div className="analysis-progress" aria-label="Analysis status"><strong>Analysis status</strong><ol><li className={file ? 'analysis-progress__selected' : ''}>Document selected</li><li>AI analysis not configured</li><li>Review plan</li></ol><p>To analyze real documents, connect a document-processing service and AI provider. No progress is simulated here.</p></div>
      </div>
    </section>
    {draft && <section className="content-panel draft-review"><div className="panel-heading"><div><h2>2. Review the illustrative plan</h2><p>Editable sample content only · not extracted from the selected file</p></div><span className="demo-label"><span />Sample plan</span></div>
      <div className="draft-review__body"><div className="draft-callout"><strong>Built-in example</strong><span>This example is static product demo content. Editing and approving it will add demo tasks and milestones to {project?.name ?? 'the selected project'} in this browser.</span></div>
        <section className="draft-section"><div className="draft-section__heading"><h3>Requirements <span>illustrative</span></h3><Button size="sm" variant="secondary" onClick={() => setDraft((current) => current && ({ ...current, requirements: [...current.requirements, ''] }))}>Add requirement</Button></div><div className="draft-requirements">{draft.requirements.map((requirement, index) => <label key={index}>Requirement {index + 1}<Input value={requirement} onChange={(event) => setDraft((current) => current && ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} /></label>)}</div></section>
        <section className="draft-section"><div className="draft-section__heading"><h3>Proposed tasks <span>{draft.tasks.length}</span></h3><Button size="sm" variant="secondary" onClick={addTask}>Add task</Button></div>
          <div className="draft-task-list">{draft.tasks.map((task) => <article className="draft-task" key={task.sourceId}>
            <div className="draft-task__heading"><strong>Proposed task {task.sourceId}</strong><Button size="sm" variant="ghost" aria-label={`Remove proposed task ${task.sourceId}`} onClick={() => setDraft((current) => current && ({ ...current, tasks: current.tasks.filter((item) => item.sourceId !== task.sourceId).map((item) => ({ ...item, dependencySourceIds: item.dependencySourceIds.filter((dependencyId) => dependencyId !== task.sourceId) })) }))}>Remove</Button></div>
            <div className="draft-fields"><label>Task title<Input aria-label="Proposed task title" value={task.title} onChange={(event) => editTask(task.sourceId, { title: event.target.value })} maxLength={120} /></label><label>Module<Input aria-label="Proposed task module" value={task.module} onChange={(event) => editTask(task.sourceId, { module: event.target.value })} maxLength={100} /></label><label>Priority<Select aria-label="Proposed task priority" value={task.priority} onChange={(event) => editTask(task.sourceId, { priority: event.target.value as GeneratedTaskProposal['priority'] })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} /></label><label>Estimate hours<Input type="number" min={0} step="0.5" value={task.estimateHours} onChange={(event) => editTask(task.sourceId, { estimateHours: Number(event.target.value) })} /></label><label>Start date<Input type="date" value={task.startDate} onChange={(event) => editTask(task.sourceId, { startDate: event.target.value })} /></label><label>End date<Input type="date" value={task.endDate} onChange={(event) => editTask(task.sourceId, { endDate: event.target.value })} /></label><label>Dependencies<Select multiple value={task.dependencySourceIds.map(String)} onChange={(event) => editTask(task.sourceId, { dependencySourceIds: Array.from(event.target.selectedOptions, (option) => Number(option.value)) })} options={draft.tasks.filter((candidate) => candidate.sourceId !== task.sourceId).map((candidate) => ({ value: String(candidate.sourceId), label: candidate.title || `Proposed task ${candidate.sourceId}` }))} /></label></div>
          </article>)}</div>
        </section>
        <section className="draft-review__columns"><div className="draft-section"><div className="draft-section__heading"><h3>Milestones</h3><Button size="sm" variant="secondary" onClick={() => setDraft((current) => current && ({ ...current, milestones: [...current.milestones, { title: '', date: '' }] }))}>Add milestone</Button></div>{draft.milestones.map((milestone, index) => <label className="draft-milestone" key={`${milestone.title}-${index}`}>Milestone title<Input value={milestone.title} onChange={(event) => setDraft((current) => current && ({ ...current, milestones: current.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} />Date<Input type="date" value={milestone.date} onChange={(event) => setDraft((current) => current && ({ ...current, milestones: current.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) }))} /></label>)}</div><div className="draft-section"><h3>Risks & assumptions</h3><strong>Risks</strong><ul>{draft.risks.map((item) => <li key={item}>{item}</li>)}</ul><strong>Assumptions</strong><ul>{draft.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
        <div className="draft-approve"><span>Approval adds demo tasks and milestones to browser storage only.</span><Button variant="primary" onClick={approvePlan} disabled={approved || !project || !draft.tasks.length || draft.tasks.some((task) => !task.title.trim() || !task.startDate || !task.endDate || task.endDate < task.startDate) || draft.milestones.some((milestone) => !milestone.title.trim() || !milestone.date)}>Approve sample plan</Button></div>
      </div>
    </section>}
    {approved && <div className="plan-approved" role="status"><strong>Sample plan added to this browser workspace.</strong><Button variant="secondary" onClick={() => navigate('/tasks')}>Open task board</Button><Button variant="secondary" onClick={() => navigate('/timeline')}>Open timeline</Button></div>}
  </div>
}
