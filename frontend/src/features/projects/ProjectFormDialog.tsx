import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import type { Project } from '../../types/domain'
import { ErrorState } from '../../components/ui/States'

export type ProjectValues = Omit<Project, 'id'>

type Props = {
  open: boolean
  project?: Project
  onClose: () => void
  onSave: (project: ProjectValues) => Promise<void>
}

function initialValues(project?: Project): ProjectValues {
  return project
    ? { name: project.name, description: project.description, startDate: project.startDate, endDate: project.endDate, status: project.status }
    : { name: '', description: '', startDate: '', endDate: '', status: 'in_progress' }
}

export function ProjectFormDialog({ open, project, onClose, onSave }: Props) {
  const [values, setValues] = useState<ProjectValues>(() => initialValues(project))
  const [dateError, setDateError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setValues(initialValues(project)); setDateError(''); setSaveError('') }
  }, [open, project])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      setDateError('End date must be on or after the start date.')
      return
    }
    setDateError('')
    setSaving(true)
    setSaveError('')
    void onSave({ ...values, name: values.name.trim(), description: values.description.trim() })
      .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : 'Could not save this project.'))
      .finally(() => setSaving(false))
  }

  return <Dialog open={open} onClose={() => { if (!saving) onClose() }} title={project ? 'Edit project' : 'Create project'} description="Project changes are saved to the project management server.">
    <form id="project-form" className="form-grid" onSubmit={submit}>
      <FormField label="Project name" htmlFor="project-name" required><Input id="project-name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required maxLength={100} autoFocus /></FormField>
      <FormField label="Description" htmlFor="project-description" hint="A short description to help identify this project."><Input id="project-description" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} maxLength={500} /></FormField>
      <div className="form-grid__two">
        <FormField label="Start date" htmlFor="project-start"><Input id="project-start" type="date" value={values.startDate} onChange={(event) => setValues({ ...values, startDate: event.target.value })} /></FormField>
        <FormField label="End date" htmlFor="project-end" error={dateError}><Input id="project-end" type="date" value={values.endDate} onChange={(event) => setValues({ ...values, endDate: event.target.value })} /></FormField>
      </div>
      {project && <p className="form-field__message">Project status is shown on the details page. The current server update handler does not persist status changes.</p>}
      {saveError && <ErrorState title="Could not save project" detail={saveError} />}
    </form>
    <div className="dialog__actions"><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} type="submit" form="project-form">{saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}</Button></div>
  </Dialog>
}
