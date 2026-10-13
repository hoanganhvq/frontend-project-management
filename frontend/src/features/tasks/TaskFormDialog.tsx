import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import type { Task, TaskBoardColumn, TaskPriority, TaskStatus } from '../../types/domain'

export type TaskValues = Omit<Task, 'id' | 'createdAt' | 'createdByName'>

type Props = {
  open: boolean
  projectId: number
  task?: Task
  initialBoardColumn?: TaskBoardColumn
  onClose: () => void
  onSave: (task: TaskValues) => void
}

function initialValues(projectId: number, task?: Task, initialBoardColumn: TaskBoardColumn = 'todo'): TaskValues {
  return task
    ? { projectId: task.projectId, groupId: task.groupId, parentTaskId: task.parentTaskId, title: task.title, description: task.description, startDate: task.startDate, endDate: task.endDate, progress: task.progress, priority: task.priority, status: task.status, boardColumn: task.boardColumn, assigneeName: task.assigneeName ?? '', module: task.module ?? '', estimateHours: task.estimateHours, dependencyIds: task.dependencyIds ?? [] }
    : { projectId, groupId: null, parentTaskId: null, title: '', description: '', startDate: '', endDate: '', progress: 0, priority: 'medium', status: initialBoardColumn === 'done' ? 'done' : initialBoardColumn === 'todo' ? 'todo' : 'in_progress', boardColumn: initialBoardColumn, assigneeName: '', module: '', estimateHours: undefined, dependencyIds: [] }
}

export function TaskFormDialog({ open, projectId, task, initialBoardColumn, onClose, onSave }: Props) {
  const { workspace } = useDemoWorkspace()
  const [values, setValues] = useState<TaskValues>(() => initialValues(projectId, task, initialBoardColumn))
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    if (open) { setValues(initialValues(projectId, task, initialBoardColumn)); setDateError('') }
  }, [open, projectId, task, initialBoardColumn])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      setDateError('Due date must be on or after the start date.')
      return
    }
    setDateError('')
    onSave({ ...values, title: values.title.trim(), description: values.description.trim() })
  }

  return <Dialog open={open} onClose={onClose} title={task ? 'Edit task' : 'Create a demo task'} description="This change is stored in this browser only.">
    <form id="task-form" className="form-grid" onSubmit={submit}>
      <FormField label="Task title" htmlFor="task-title" required><Input id="task-title" value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} required maxLength={120} autoFocus /></FormField>
      <FormField label="Description" htmlFor="task-description"><Input id="task-description" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} maxLength={1000} /></FormField>
      <div className="form-grid__two">
        <FormField label="Start date" htmlFor="task-start"><Input id="task-start" type="date" value={values.startDate} onChange={(event) => setValues({ ...values, startDate: event.target.value })} /></FormField>
        <FormField label="Due date" htmlFor="task-end" error={dateError}><Input id="task-end" type="date" value={values.endDate} onChange={(event) => setValues({ ...values, endDate: event.target.value })} /></FormField>
      </div>
      <div className="form-grid__two">
        <FormField label="Assignee" htmlFor="task-assignee" hint="Demo field; the current task API does not expose assignment."><Input id="task-assignee" value={values.assigneeName ?? ''} onChange={(event) => setValues({ ...values, assigneeName: event.target.value })} maxLength={100} /></FormField>
        <FormField label="Module" htmlFor="task-module" hint="Demo planning label."><Input id="task-module" value={values.module ?? ''} onChange={(event) => setValues({ ...values, module: event.target.value })} maxLength={100} /></FormField>
      </div>
      <div className="form-grid__two">
        <FormField label="Estimate (hours)" htmlFor="task-estimate" hint="Illustrative estimate only."><Input id="task-estimate" type="number" min={0} max={10000} step="0.5" value={values.estimateHours ?? ''} onChange={(event) => setValues({ ...values, estimateHours: event.target.value ? Number(event.target.value) : undefined })} /></FormField>
        <Select id="task-dependencies" label="Dependencies" multiple value={(values.dependencyIds ?? []).map(String)} onChange={(event) => setValues({ ...values, dependencyIds: Array.from(event.target.selectedOptions, (option) => Number(option.value)) })} options={workspace.tasks.filter((candidate) => candidate.projectId === projectId && candidate.id !== task?.id).map((candidate) => ({ value: String(candidate.id), label: candidate.title }))} aria-describedby="task-dependencies-help" />
      </div>
      <span id="task-dependencies-help" className="form-field__message">Optional demo dependencies. Hold Ctrl (Windows) or Command (Mac) to select more than one.</span>
      <div className="form-grid__two">
        <Select label="Status" id="task-status" value={values.status} onChange={(event) => { const status = event.target.value as TaskStatus; setValues({ ...values, status, boardColumn: status === 'todo' ? 'todo' : status === 'done' ? 'done' : status === 'in_progress' ? 'in_progress' : undefined }) }} options={[{ value: 'todo', label: 'To do' }, { value: 'in_progress', label: 'In progress' }, { value: 'done', label: 'Done' }, { value: 'canceled', label: 'Canceled' }]} />
        <Select label="Priority" id="task-priority" value={values.priority} onChange={(event) => setValues({ ...values, priority: event.target.value as TaskPriority })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
      </div>
      <FormField label="Progress" htmlFor="task-progress" hint="Demo progress percentage (0–100)."><Input id="task-progress" type="number" min={0} max={100} value={values.progress} onChange={(event) => setValues({ ...values, progress: Number(event.target.value) })} /></FormField>
    </form>
    <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="task-form">{task ? 'Save demo changes' : 'Create demo task'}</Button></div>
  </Dialog>
}
