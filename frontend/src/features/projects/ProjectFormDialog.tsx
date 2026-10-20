import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import type { Project, ProjectStatus } from '../../types/domain'

export type ProjectValues = Omit<Project, 'id'>

type Props = {
  open: boolean
  project?: Project
  onClose: () => void
  onSave: (project: ProjectValues) => void
}

function initialValues(project?: Project): ProjectValues {
  return project
    ? { name: project.name, description: project.description, startDate: project.startDate, endDate: project.endDate, status: project.status }
    : { name: '', description: '', startDate: '', endDate: '', status: 'in_progress' }
}

export function ProjectFormDialog({ open, project, onClose, onSave }: Props) {
  const [values, setValues] = useState<ProjectValues>(() => initialValues(project))
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    if (open) { setValues(initialValues(project)); setDateError('') }
  }, [open, project])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      setDateError('End date must be on or after the start date.')
      return
    }
    setDateError('')
    onSave({ ...values, name: values.name.trim(), description: values.description.trim() })
  }

  return <Dialog open={open} onClose={onClose} title={project ? 'Edit project' : 'Create project'} description="This change is saved to the project server.">
    <form id="project-form" className="form-grid" onSubmit={submit}>
      <FormField label="Project name" htmlFor="project-name" required><Input id="project-name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required maxLength={100} autoFocus /></FormField>
      <FormField label="Description" htmlFor="project-description" hint="A short description to help identify this project."><Input id="project-description" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} maxLength={500} /></FormField>
      <div className="form-grid__two">
        <FormField label="Start date" htmlFor="project-start"><Input id="project-start" type="date" value={values.startDate} onChange={(event) => setValues({ ...values, startDate: event.target.value })} /></FormField>
        <FormField label="End date" htmlFor="project-end" error={dateError}><Input id="project-end" type="date" value={values.endDate} onChange={(event) => setValues({ ...values, endDate: event.target.value })} /></FormField>
      </div>
      <Select label="Status" id="project-status" value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as ProjectStatus })} options={[{ value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
    </form>
    <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="project-form">{project ? 'Save changes' : 'Create project'}</Button></div>
  </Dialog>
}
