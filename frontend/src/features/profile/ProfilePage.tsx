import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { PageHeader } from '../../components/ui/PageHeader'

export function ProfilePage() {
  const { workspace } = useDemoWorkspace()
  const profile = workspace.profile
  return <div className="page-stack"><PageHeader eyebrow="PERSONAL DETAILS" title="Profile" description="Account details returned by the project API." />
    <section className="content-panel settings-panel"><div className="panel-heading"><div><h2>Profile information</h2><p>Profile updates are not currently exposed by the backend.</p></div></div>
      <dl className="detail-summary"><div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Position</dt><dd>{profile.position || 'Not set'}</dd></div></dl>
    </section>
  </div>
}
