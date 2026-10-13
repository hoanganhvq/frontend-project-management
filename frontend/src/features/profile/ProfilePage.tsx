import { useState, type FormEvent } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'

export function ProfilePage() {
  const { workspace, updateProfile } = useDemoWorkspace()
  const [name, setName] = useState(workspace.profile.name)
  const [email, setEmail] = useState(workspace.profile.email)
  const [position, setPosition] = useState(workspace.profile.position)
  const [saved, setSaved] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateProfile({ name: name.trim(), email: email.trim(), position: position.trim() })
    setSaved(true)
  }
  return <div className="page-stack"><PageHeader eyebrow="PERSONAL DETAILS" title="Profile" description="Edit the local demo profile shown in the workspace." />
    <section className="content-panel settings-panel"><div className="panel-heading"><div><h2>Profile information</h2><p>This does not update an account on the server.</p></div></div><form className="form-grid settings-form" onSubmit={submit}>
      <FormField label="Full name" htmlFor="profile-name" required><Input id="profile-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} required maxLength={100} /></FormField>
      <FormField label="Email address" htmlFor="profile-email" required><Input id="profile-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false) }} required maxLength={254} /></FormField>
      <FormField label="Position" htmlFor="profile-position"><Input id="profile-position" value={position} onChange={(event) => { setPosition(event.target.value); setSaved(false) }} maxLength={100} /></FormField>
      <div className="settings-form__actions"><Button type="submit" variant="primary">Save demo profile</Button>{saved && <span role="status">Saved in this browser.</span>}</div>
    </form></section>
  </div>
}
