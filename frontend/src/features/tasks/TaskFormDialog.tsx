import { useEffect, useState, type FormEvent } from 'react'
import { groupsApi } from '../../api/services'
import type { ProjectGroup } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import type { Task, TaskBoardColumn, TaskPriority, TaskStatus } from '../../types/domain'

export type TaskValues = Omit<Task, 'id' | 'createdAt' | 'createdByName'>

type Props = {
  open: boolean
  projectId: number
  task?: Task
  initialBoardColumn?: TaskBoardColumn
  onClose: () => void
  onSave: (task: TaskValues) => void | Promise<void>
}

function initialValues(projectId: number, task?: Task, initialBoardColumn: TaskBoardColumn = 'todo'): TaskValues {
  return task
    ? { projectId: task.projectId, groupId: task.groupId, parentTaskId: task.parentTaskId, title: task.title, description: task.description, startDate: task.startDate, endDate: task.endDate, progress: task.progress, priority: task.priority, status: task.status, boardColumn: task.boardColumn, assigneeName: task.assigneeName ?? '', module: task.module ?? '', estimateHours: task.estimateHours, dependencyIds: task.dependencyIds ?? [] }
    : { projectId, groupId: null, parentTaskId: null, title: '', description: '', startDate: '', endDate: '', progress: 0, priority: 'medium', status: initialBoardColumn === 'done' ? 'done' : initialBoardColumn === 'todo' ? 'todo' : 'in_progress', boardColumn: initialBoardColumn, assigneeName: '', module: '', estimateHours: undefined, dependencyIds: [] }
}

export function TaskFormDialog({ open, projectId, task, initialBoardColumn, onClose, onSave }: Props) {
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [values, setValues] = useState<TaskValues>(() => initialValues(projectId, task, initialBoardColumn))
  const [dateError, setDateError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setValues(initialValues(projectId, task, initialBoardColumn)); setDateError(''); setSaveError('') }
  }, [open, projectId, task, initialBoardColumn])

  useEffect(() => {
    if (!open || !projectId) { setGroups([]); return }
    let active = true
    groupsApi.getByProject(projectId).then((result) => { if (active) setGroups(result) }).catch(() => { if (active) setGroups([]) })
    return () => { active = false }
  }, [open, projectId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      setDateError('Due date must be on or after the start date.')
      return
    }
    setDateError('')
    setSaveError('')
    setSaving(true)
    try {
      await onSave({ ...values, title: values.title.trim(), description: values.description.trim() })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The task could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onClose={onClose} title={task ? 'Edit task' : 'Create task'} description="This change is saved to the project server.">
    <form id="task-form" className="form-grid" onSubmit={submit}>
      <FormField label="Task title" htmlFor="task-title" required><Input id="task-title" value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} required maxLength={120} autoFocus /></FormField>
      <FormField label="Description" htmlFor="task-description"><Input id="task-description" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} maxLength={1000} /></FormField>
      <div className="form-grid__two">
        <FormField label="Start date" htmlFor="task-start"><Input id="task-start" type="date" value={values.startDate} onChange={(event) => setValues({ ...values, startDate: event.target.value })} /></FormField>
        <FormField label="Due date" htmlFor="task-end" error={dateError}><Input id="task-end" type="date" value={values.endDate} onChange={(event) => setValues({ ...values, endDate: event.target.value })} /></FormField>
      </div>
      <div className="form-grid__two">
        <Select id="task-group" label="Project group" value={values.groupId == null ? '' : String(values.groupId)} onChange={(event) => setValues({ ...values, groupId: event.target.value ? Number(event.target.value) : null })} options={[{ value: '', label: 'No group' }, ...groups.map((group) => ({ value: String(group.id), label: group.name }))]} />
        <span className="form-field__message">Choose a group in this project, or leave the task ungrouped.</span>
      </div>
      <div className="form-grid__two">
        <Select label="Status" id="task-status" value={values.status} onChange={(event) => { const status = event.target.value as TaskStatus; setValues({ ...values, status, boardColumn: status === 'todo' ? 'todo' : status === 'done' ? 'done' : status === 'in_progress' ? 'in_progress' : undefined }) }} options={[{ value: 'todo', label: 'To do' }, { value: 'in_progress', label: 'In progress' }, { value: 'done', label: 'Done' }, { value: 'canceled', label: 'Canceled' }]} />
        <Select label="Priority" id="task-priority" value={values.priority} onChange={(event) => setValues({ ...values, priority: event.target.value as TaskPriority })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
      </div>
      <FormField label="Progress" htmlFor="task-progress" hint="Percentage complete (0–100)."><Input id="task-progress" type="number" min={0} max={100} value={values.progress} onChange={(event) => setValues({ ...values, progress: Number(event.target.value) })} /></FormField>
      {saveError && <p className="team-members-feedback team-members-feedback--error" role="alert">{saveError}</p>}
    </form>
    <div className="dialog__actions"><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} type="submit" form="task-form">{saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}</Button></div>
  </Dialog>
}
