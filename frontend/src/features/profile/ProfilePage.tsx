import { useAuth } from '../../app/AuthProvider'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import './AccountPages.css'

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return <div className="page-stack account-page profile-page">
    <PageHeader eyebrow="ACCOUNT" title="Profile" description="Account details loaded from your authenticated session." actions={<Button variant="secondary" onClick={() => navigate('/settings')}>Account settings</Button>} />
    <section className="content-panel profile-card" aria-labelledby="profile-heading">
      <div className="profile-card__header">
        {user.photo ? <img className="profile-card__avatar" src={user.photo} alt={`${user.name} profile`} /> : <span className="profile-card__avatar profile-card__avatar--initials" aria-hidden="true">{initials}</span>}
        <div className="profile-card__identity"><span className="account-overview__eyebrow">ORBITAI ACCOUNT</span><h2 id="profile-heading">{user.name}</h2><p>{user.email}</p></div>
        <StatusBadge tone="green">Authenticated</StatusBadge>
      </div>
      <dl className="profile-details">
        <div><dt>Full name</dt><dd>{user.name}</dd></div>
        <div><dt>Email address</dt><dd>{user.email}</dd></div>
        <div><dt>Position</dt><dd>{user.position || 'Not provided'}</dd></div>
        <div><dt>System role</dt><dd>{user.role}</dd></div>
      </dl>
      <p className="profile-card__note">Profile editing and avatar uploads are not supported by the current account API. These details are read-only.</p>
    </section>
  </div>
}
