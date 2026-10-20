import { useAuth } from '../../app/AuthProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import './AccountPages.css'

export function SettingsPage() {
  const { user } = useAuth()
  if (!user) return null

  return <div className="page-stack account-page settings-page">
    <PageHeader eyebrow="ACCOUNT PREFERENCES" title="Settings" description="Review account and workspace options currently available in OrbitAI." />

    <section className="account-overview content-panel" aria-label="Signed-in account">
      <div className="account-overview__identity">
        <span className="account-avatar" aria-hidden="true">{user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
        <div><span className="account-overview__eyebrow">CURRENT ACCOUNT</span><strong>{user.name}</strong><span>{user.email}</span></div>
      </div>
      <StatusBadge tone="green">Signed in</StatusBadge>
      <Button variant="secondary" onClick={() => navigate('/profile')}>View profile</Button>
    </section>

    <div className="account-settings-grid">
      <section className="content-panel account-settings-card" aria-labelledby="settings-preferences-heading">
        <div className="account-settings-card__heading"><span className="account-settings-card__icon" aria-hidden="true">01</span><div><h2 id="settings-preferences-heading">Preferences</h2><p>Appearance and notification choices</p></div><StatusBadge tone="amber">Unavailable</StatusBadge></div>
        <p className="account-settings-card__detail">Theme, density, email notifications, and weekly summaries do not have a persistence API yet. No preference controls are active or saved.</p>
      </section>

      <section className="content-panel account-settings-card" aria-labelledby="settings-security-heading">
        <div className="account-settings-card__heading"><span className="account-settings-card__icon" aria-hidden="true">02</span><div><h2 id="settings-security-heading">Security</h2><p>Password and active session</p></div><StatusBadge tone="green">Session active</StatusBadge></div>
        <p className="account-settings-card__detail">Sign-in uses the server-managed HttpOnly session cookie. Password changes and active-session management are not available from Settings.</p>
      </section>

      <section className="content-panel account-settings-card" aria-labelledby="settings-workspace-heading">
        <div className="account-settings-card__heading"><span className="account-settings-card__icon" aria-hidden="true">03</span><div><h2 id="settings-workspace-heading">Workspace</h2><p>Storage and organization defaults</p></div><StatusBadge tone="amber">Unavailable</StatusBadge></div>
        <p className="account-settings-card__detail">Workspace-wide defaults are not backed by the current API. Project and task data remains available through the project service.</p>
      </section>
    </div>
  </div>
}
