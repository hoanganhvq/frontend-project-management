import { useAuth } from '../../app/AuthProvider'
import { PageHeader } from '../../components/ui/PageHeader'

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return <div className="page-stack">
    <PageHeader eyebrow="ACCOUNT" title="Profile" description="Account details loaded from your signed-in session." />
    <section className="content-panel settings-panel">
      <div className="panel-heading"><div><h2>Profile information</h2><p>This information comes from your account on the server.</p></div></div>
      <dl className="account-profile-list">
        <div><dt>Name</dt><dd>{user.name}</dd></div>
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Position</dt><dd>{user.position || 'Not provided'}</dd></div>
        <div><dt>System role</dt><dd>{user.role}</dd></div>
      </dl>
    </section>
  </div>
}
