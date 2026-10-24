import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { usersApi } from '../../api/services'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import './AccountPages.css'

export function ProfilePage() {
  const { user, updateCurrentUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email)
    setPosition(user.position ?? '')
  }, [user])

  if (!user) return null
  const userId = user.id
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await usersApi.update(userId, { name: name.trim(), email: email.trim(), position: position.trim() })
      updateCurrentUser(updated)
      if (avatar) {
        try {
          updateCurrentUser(await usersApi.uploadAvatar(userId, avatar))
        } catch (avatarError) {
          setError(`Profile details were saved, but the photo could not be uploaded: ${avatarError instanceof Error ? avatarError.message : 'upload failed.'}`)
          return
        }
      }
      setAvatar(null)
      setEditing(false)
      setNotice('Profile changes saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The profile could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-stack account-page profile-page">
    <PageHeader eyebrow="ACCOUNT" title="Profile" description="Account details loaded from your authenticated session." actions={<><Button variant="secondary" onClick={() => navigate('/settings')}>Account settings</Button><Button variant="primary" onClick={() => { setError(''); setNotice(''); setEditing((current) => !current) }}>{editing ? 'Cancel edit' : 'Edit profile'}</Button></>} />
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
      {notice && <p className="team-members-feedback team-members-feedback--success" role="status">{notice}</p>}
      {editing && <form className="form-grid" onSubmit={(event) => void saveProfile(event)}>
        <FormField label="Full name" htmlFor="profile-name" required><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></FormField>
        <FormField label="Email address" htmlFor="profile-email" required><Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={150} /></FormField>
        <FormField label="Position" htmlFor="profile-position"><Input id="profile-position" value={position} onChange={(event) => setPosition(event.target.value)} maxLength={100} /></FormField>
        <FormField label="Profile photo" htmlFor="profile-avatar" hint="Choose an image file for your account photo."><Input id="profile-avatar" type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></FormField>
        {error && <p className="team-members-feedback team-members-feedback--error" role="alert">{error}</p>}
        <div className="dialog__actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button></div>
      </form>}
      {!editing && <p className="profile-card__note">Your name, email, position, and profile photo can be updated on the server. System role and password are not editable here.</p>}
    </section>
  </div>
}
