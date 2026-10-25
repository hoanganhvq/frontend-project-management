import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi, usersApi } from '../../api/services'
import { useAuth } from '../../app/AuthProvider'
import i18n from '../../app/i18n'
import { defaultSettings, getSettingsPreferences, saveSettingsPreferences, type SettingsAccent, type SettingsPreferences, type SettingsStartPage, type SettingsTheme } from '../../app/settingsPreferences'
import { navigate } from '../../app/router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import './AccountPages.css'

type SettingsTab = 'general' | 'appearance' | 'security' | 'languages' | 'notifications' | 'workspace' | 'about'
const APP_VERSION = '0.1.0'
const tabKeys: SettingsTab[] = ['general', 'appearance', 'security', 'languages', 'notifications', 'workspace', 'about']
const tabIcons: Record<SettingsTab, 'settings' | 'palette' | 'shield' | 'globe' | 'bell' | 'building' | 'inbox'> = {
  general: 'settings', appearance: 'palette', security: 'shield', languages: 'globe', notifications: 'bell', workspace: 'building', about: 'inbox',
}
const commonTimeZones = ['Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'UTC', 'America/New_York', 'Europe/London']

function OptionRow({ title, description, children, controlId }: { title: string; description: string; children: ReactNode; controlId?: string }) {
  return <div className="settings-option-row"><div className="settings-option-copy">{controlId ? <label htmlFor={controlId}>{title}</label> : <strong>{title}</strong>}<small>{description}</small></div><div className="settings-option-control">{children}</div></div>
}

function PreferenceSwitch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" className={`settings-switch${checked ? ' settings-switch--on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>
}

function StatusCard({ title, detail, icon = 'shield', status }: { title: string; detail: string; icon?: 'shield' | 'laptop' | 'key'; status: string }) {
  return <div className="settings-status-card"><span className="settings-status-card__icon"><Icon name={icon} /></span><div><strong>{title}</strong><p>{detail}</p></div><span className="settings-status-card__badge">{status}</span></div>
}

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { user, updateCurrentUser, logout } = useAuth()
  const [preferences, setPreferences] = useState(getSettingsPreferences)
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [landingPage, setLandingPage] = useState<SettingsStartPage>(preferences.startPage)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [profileError, setProfileError] = useState('')
  const [securityBusy, setSecurityBusy] = useState(false)
  const [securityNotice, setSecurityNotice] = useState('')
  const [supportNotice, setSupportNotice] = useState('')
  const [workspaceName, setWorkspaceName] = useState(preferences.workspaceName)
  const [workspaceDescription, setWorkspaceDescription] = useState(preferences.workspaceDescription)
  const [workspaceLogo, setWorkspaceLogo] = useState(preferences.workspaceLogoDataUrl)
  const [workspaceNotice, setWorkspaceNotice] = useState('')
  const [workspaceError, setWorkspaceError] = useState('')
  const [hasSaved, setHasSaved] = useState(false)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const workspaceLogoInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { setDisplayName(user?.name ?? '') }, [user?.id, user?.name])
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])
  if (!user) return null

  const accountEmail = user.email
  const avatarInitials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const dirtyProfile = displayName.trim() !== user.name || avatarFile !== null || landingPage !== preferences.startPage

  function update<K extends keyof SettingsPreferences>(key: K, value: SettingsPreferences[K]) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    saveSettingsPreferences(next)
    setHasSaved(true)
    if (key === 'language') void i18n.changeLanguage(value as string)
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabKeys.indexOf(activeTab)
    const nextIndex = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (currentIndex + 1) % tabKeys.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (currentIndex - 1 + tabKeys.length) % tabKeys.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabKeys.length - 1 : -1
    if (nextIndex < 0) return
    event.preventDefault()
    setActiveTab(tabKeys[nextIndex])
    tabRefs.current[nextIndex]?.focus()
  }

  function chooseAvatar(file: File | undefined) {
    setProfileError('')
    if (!file) return
    if (!file.type.startsWith('image/')) { setProfileError('Choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setProfileError('Choose an image smaller than 5 MB.'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !displayName.trim()) { setProfileError('Display name is required.'); return }
    setProfileBusy(true)
    setProfileError('')
    setProfileNotice('')
    try {
      let updatedUser = user
      if (displayName.trim() !== user.name) {
        updatedUser = await usersApi.update(user.id, { name: displayName.trim() })
        updateCurrentUser(updatedUser)
      }
      if (avatarFile) {
        try {
          updatedUser = await usersApi.uploadAvatar(user.id, avatarFile)
          updateCurrentUser(updatedUser)
        } catch {
          setProfileError(t('profileSavePartial'))
          return
        }
      }
      if (landingPage !== preferences.startPage) update('startPage', landingPage)
      setAvatarFile(null)
      setAvatarPreview('')
      setProfileNotice(t('profileSaved'))
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : t('profileSaveFailed'))
    } finally {
      setProfileBusy(false)
    }
  }

  async function sendPasswordReset() {
    setSecurityBusy(true)
    setSecurityNotice('')
    try {
      await authApi.requestPasswordReset(accountEmail)
      setSecurityNotice(t('resetSent'))
    } catch {
      setSecurityNotice(t('resetFailed'))
    } finally {
      setSecurityBusy(false)
    }
  }

  async function copySupportDetails() {
    const details = [`OrbitAI ${APP_VERSION}`, `Page: ${window.location.pathname}`, `Language: ${preferences.language}`, `Theme: ${preferences.theme}`].join('\n')
    try {
      await navigator.clipboard.writeText(details)
      setSupportNotice(t('supportCopied'))
    } catch {
      setSupportNotice(t('supportCopyFailed'))
    }
  }

  function chooseWorkspaceLogo(file: File | undefined) {
    setWorkspaceError('')
    setWorkspaceNotice('')
    if (!file) return
    if (!file.type.startsWith('image/')) { setWorkspaceError('Choose an image file.'); return }
    if (file.size > 500 * 1024) { setWorkspaceError(t('workspaceLogoHelp')); return }
    const reader = new FileReader()
    reader.onload = () => setWorkspaceLogo(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setWorkspaceError('The selected image could not be read.')
    reader.readAsDataURL(file)
  }

  function saveWorkspaceProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceName.trim()) { setWorkspaceError(t('workspaceNameRequired')); return }
    const next = { ...preferences, workspaceName: workspaceName.trim(), workspaceDescription: workspaceDescription.trim(), workspaceLogoDataUrl: workspaceLogo }
    setPreferences(next)
    saveSettingsPreferences(next)
    setWorkspaceNotice(t('workspaceSaved'))
    setWorkspaceError('')
    setHasSaved(true)
  }

  function resetWorkspaceSettings() {
    const next = { ...preferences, workspaceName: defaultSettings.workspaceName, workspaceDescription: defaultSettings.workspaceDescription, workspaceLogoDataUrl: defaultSettings.workspaceLogoDataUrl, defaultProjectView: defaultSettings.defaultProjectView, defaultTaskStatus: defaultSettings.defaultTaskStatus }
    setWorkspaceName(next.workspaceName)
    setWorkspaceDescription(next.workspaceDescription)
    setWorkspaceLogo(next.workspaceLogoDataUrl)
    setPreferences(next)
    saveSettingsPreferences(next)
    if (workspaceLogoInputRef.current) workspaceLogoInputRef.current.value = ''
    setWorkspaceError('')
    setWorkspaceNotice(t('workspaceDefaultsRestored'))
    setHasSaved(true)
  }

  const startPageOptions = [
    { value: 'dashboard', label: t('dashboard') }, { value: 'my-tasks', label: t('myTasks') }, { value: 'projects', label: t('projects') },
  ]
  const locale = preferences.language === 'vi' ? 'vi-VN' : preferences.language === 'ja' ? 'ja-JP' : 'en-US'
  const supportedTimeZones = (Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf?.('timeZone') ?? commonTimeZones
  const timeZoneOptions = [...new Set(['UTC', ...supportedTimeZones, preferences.timeZone])]
  const numberLocale = preferences.numberLocale
  const numberExample = new Intl.NumberFormat(numberLocale).format(1234567.89)
  const timeExample = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: preferences.timeFormat === '12-hour', timeZone: preferences.timeZone }).format(new Date())
  const notificationRows: Array<{ key: keyof SettingsPreferences; title: string; description: string }> = [
    { key: 'notificationInApp', title: t('inApp'), description: t('inAppHelp') },
    { key: 'notificationAssignments', title: t('assignments'), description: t('assignmentsHelp') },
    { key: 'notificationTaskUpdates', title: t('taskUpdates'), description: t('taskUpdatesHelp') },
    { key: 'notificationCommentsMentions', title: t('commentsMentions'), description: t('commentsMentionsHelp') },
    { key: 'notificationProjectUpdates', title: t('projectUpdates'), description: t('projectUpdatesHelp') },
    { key: 'notificationAiPlanner', title: t('aiPlannerStatus'), description: t('aiPlannerStatusHelp') },
    { key: 'notificationEmail', title: t('emailNotifications'), description: t('emailNotificationsHelp') },
    { key: 'notificationDoNotDisturb', title: t('doNotDisturb'), description: t('doNotDisturbHelp') },
  ]

  return <div className="page-stack account-page settings-page">
    <PageHeader eyebrow={t('title').toUpperCase()} title={t('title')} description={t('description')} />
    {hasSaved && <p className="settings-saved-status" role="status">{t('savedLocally')}</p>}
    <div className="settings-layout">
      <div className="settings-mobile-tabs"><Select id="settings-mobile-category" label={t('title')} value={activeTab} onChange={(event) => setActiveTab(event.target.value as SettingsTab)} options={tabKeys.map((key) => ({ value: key, label: t(`tabs.${key}`) }))} /></div>
      <div className="settings-tabs" role="tablist" aria-label={t('title')} onKeyDown={onTabKeyDown}>
        {tabKeys.map((key, index) => <button ref={(element) => { tabRefs.current[index] = element }} type="button" role="tab" id={`settings-tab-${key}`} aria-controls="settings-tab-panel" aria-selected={activeTab === key} tabIndex={activeTab === key ? 0 : -1} className={`settings-tab${activeTab === key ? ' settings-tab--active' : ''}`} key={key} onClick={() => setActiveTab(key)}><Icon name={tabIcons[key]} /><span>{t(`tabs.${key}`)}</span></button>)}
      </div>

      <section id="settings-tab-panel" className="content-panel settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`} tabIndex={0}>
        {activeTab === 'general' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="users" /></span><div><h2>{t('profileTitle')}</h2><p>{t('profileHelp')}</p></div></div>
          <form className="settings-general-form" onSubmit={(event) => void saveGeneral(event)}>
            <div className="settings-profile-editor">
              <span className="settings-profile-avatar">{avatarPreview || user.photo ? <img src={avatarPreview || user.photo || ''} alt="" /> : avatarInitials}</span>
              <div><strong>{t('profilePicture')}</strong><small>{user.email}</small><Button variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()}>{t('updatePicture')}</Button><input ref={avatarInputRef} id="settings-avatar" type="file" accept="image/*" aria-label={t('updatePicture')} onChange={(event) => chooseAvatar(event.target.files?.[0])} /></div>
            </div>
            <div className="settings-options">
              <OptionRow title={t('displayName')} description={t('displayNameHelp')} controlId="settings-display-name"><Input id="settings-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} required /></OptionRow>
              <OptionRow title={t('email')} description={user.email} controlId="settings-email"><Input id="settings-email" value={user.email} readOnly /></OptionRow>
            </div>
            <div className="settings-panel-heading settings-panel-heading--sub"><span className="settings-panel-heading__icon"><Icon name="grid" /></span><div><h2>{t('personalPreferences')}</h2><p>{t('personalPreferencesHelp')}</p></div></div>
            <div className="settings-options"><OptionRow title={t('defaultLanding')} description={t('defaultLandingHelp')} controlId="settings-start-page"><Select id="settings-start-page" aria-label={t('defaultLanding')} value={landingPage} onChange={(event) => setLandingPage(event.target.value as SettingsStartPage)} options={startPageOptions} /></OptionRow></div>
            {profileError && <p className="team-members-feedback team-members-feedback--error" role="alert">{profileError}</p>}
            {profileNotice && <p className="team-members-feedback team-members-feedback--success" role="status">{profileNotice}</p>}
            <div className="settings-form-actions"><Button variant="primary" type="submit" disabled={profileBusy || !dirtyProfile}>{profileBusy ? t('savingChanges') : t('saveChanges')}</Button></div>
          </form>
        </>}

        {activeTab === 'appearance' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="palette" /></span><div><h2>{t('appearanceTitle')}</h2><p>{t('appearanceHelp')}</p></div></div>
          <div className="settings-appearance-section"><h3>{t('theme')}</h3><div className="settings-theme-options" aria-label={t('theme')}>{(['light', 'dark', 'system'] as SettingsTheme[]).map((theme) => <button type="button" aria-pressed={preferences.theme === theme} className={`settings-theme-option settings-theme-option--${theme}${preferences.theme === theme ? ' settings-theme-option--selected' : ''}`} key={theme} onClick={() => update('theme', theme)}><span className="settings-theme-preview"><i /><i /><i /></span><strong>{t(theme)}</strong></button>)}</div></div>
          <div className="settings-appearance-section"><h3>{t('accent')}</h3><div className="settings-accent-options" aria-label={t('accent')}>{(['violet', 'blue', 'teal'] as SettingsAccent[]).map((accent) => <button key={accent} type="button" aria-pressed={preferences.accent === accent} className={`settings-accent-option settings-accent-option--${accent}${preferences.accent === accent ? ' settings-accent-option--selected' : ''}`} onClick={() => update('accent', accent)}><span />{t(accent)}</button>)}</div></div>
          <div className="settings-options">
            <OptionRow title={t('sidebar')} description={t('savedLocally')}><Select id="settings-sidebar" value={preferences.sidebarCollapsed ? 'collapsed' : 'expanded'} aria-label={t('sidebar')} onChange={(event) => update('sidebarCollapsed', event.target.value === 'collapsed')} options={[{ value: 'expanded', label: t('expanded') }, { value: 'collapsed', label: t('collapsed') }]} /></OptionRow>
            <OptionRow title={t('density')} description={t('savedLocally')}><Select id="settings-density" value={preferences.compact ? 'compact' : 'comfortable'} aria-label={t('density')} onChange={(event) => update('compact', event.target.value === 'compact')} options={[{ value: 'comfortable', label: t('comfortable') }, { value: 'compact', label: t('compact') }]} /></OptionRow>
          </div>
        </>}

        {activeTab === 'security' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="shield" /></span><div><h2>{t('securityTitle')}</h2><p>{t('securityHelp')}</p></div></div>
          <div className="settings-security-action"><div><h3>{t('changePassword')}</h3><p>{t('changePasswordHelp')}</p></div><Button variant="secondary" disabled={securityBusy} onClick={() => void sendPasswordReset()}>{securityBusy ? t('sending') : t('sendReset')}</Button></div>
          {securityNotice && <p className="settings-inline-notice" role="status">{securityNotice}</p>}
          <div className="settings-current-session"><span className="settings-current-session__icon"><Icon name="laptop" /></span><div><strong>{t('activeSessions')} · {t('currentSession')}</strong><p>{t('sessionHelp')}</p></div><Button variant="danger" onClick={() => { void logout().finally(() => navigate('/login')) }}><Icon name="logout" />{t('signOutDevice')}</Button></div>
          <div className="settings-security-unavailable">
            <StatusCard title={t('twoFactor')} detail={t('securityNotSupported')} status={t('unavailable')} />
            <StatusCard title={t('loginHistory')} detail={t('securityNotSupported')} icon="key" status={t('unavailable')} />
            <StatusCard title={t('googleAccount')} detail={t('securityNotSupported')} icon="key" status={t('unavailable')} />
            <StatusCard title={t('deleteAccount')} detail={t('accountDeleteNote')} icon="shield" status={t('unavailable')} />
          </div>
        </>}

        {activeTab === 'languages' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="globe" /></span><div><h2>{t('languageTitle')}</h2><p>{t('languageHelp')}</p></div></div>
          <div className="settings-options">
            <OptionRow title={t('language')} description={t('languageScope')}><Select id="settings-language" aria-label={t('language')} value={preferences.language} onChange={(event) => update('language', event.target.value as SettingsPreferences['language'])} options={[{ value: 'vi', label: t('vietnamese') }, { value: 'en', label: t('english') }, { value: 'ja', label: t('japanese') }]} /></OptionRow>
            <OptionRow title={t('dateFormat')} description={t('regionalPreview')}><Select id="settings-date-format" aria-label={t('dateFormat')} value={preferences.dateFormat} onChange={(event) => update('dateFormat', event.target.value as SettingsPreferences['dateFormat'])} options={[{ value: 'dd-mm-yyyy', label: t('dayMonthYear') }, { value: 'mm-dd-yyyy', label: t('monthDayYear') }, { value: 'yyyy-mm-dd', label: t('isoDate') }]} /></OptionRow>
            <OptionRow title={t('timeFormat')} description={`${t('regionalPreview')}: ${timeExample}`}><Select id="settings-time-format" aria-label={t('timeFormat')} value={preferences.timeFormat} onChange={(event) => update('timeFormat', event.target.value as SettingsPreferences['timeFormat'])} options={[{ value: '12-hour', label: t('hour12') }, { value: '24-hour', label: t('hour24') }]} /></OptionRow>
            <OptionRow title={t('timeZone')} description={`${t('regionalPreview')}: ${preferences.timeZone}`}><Select id="settings-time-zone" aria-label={t('timeZone')} value={preferences.timeZone} onChange={(event) => update('timeZone', event.target.value)} options={timeZoneOptions.map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }))} /></OptionRow>
            <OptionRow title={t('firstDay')} description={t('regionalPreview')}><Select id="settings-week-start" aria-label={t('firstDay')} value={preferences.weekStartsOn} onChange={(event) => update('weekStartsOn', event.target.value as SettingsPreferences['weekStartsOn'])} options={[{ value: 'monday', label: t('monday') }, { value: 'sunday', label: t('sunday') }]} /></OptionRow>
            <OptionRow title={t('numberFormat')} description={t('numberFormatHelp', { number: numberExample })}><Select id="settings-number-format" aria-label={t('numberFormat')} value={numberLocale} onChange={(event) => update('numberLocale', event.target.value as SettingsPreferences['numberLocale'])} options={[{ value: 'vi-VN', label: '1.234.567,89 · Việt Nam' }, { value: 'en-US', label: '1,234,567.89 · United States' }, { value: 'ja-JP', label: '1,234,567.89 · 日本' }]} /></OptionRow>
          </div>
        </>}

        {activeTab === 'notifications' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="bell" /></span><div><h2>{t('notificationsTitle')}</h2><p>{t('notificationsHelp')}</p></div></div>
          <div className="settings-notification-table-wrap"><table className="settings-notification-table"><thead><tr><th>{t('notificationType')}</th><th>{t('notificationDescription')}</th><th>{t('enabled')}</th></tr></thead><tbody>{notificationRows.map((row) => <tr key={row.key}><th scope="row">{row.title}</th><td>{row.description}</td><td><PreferenceSwitch checked={Boolean(preferences[row.key])} onChange={(value) => update(row.key, value)} label={`${row.title}: ${t('enabled')}`} /></td></tr>)}</tbody></table></div>
          <p className="settings-capability-note">{t('notificationApiNote')}</p>
        </>}

        {activeTab === 'workspace' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="building" /></span><div><h2>{t('workspaceTitle')}</h2><p>{t('workspaceHelp')}</p></div></div>
          <p className="settings-capability-note">{t('workspaceApiNote')}</p>
          <form className="settings-workspace-profile" onSubmit={(event) => saveWorkspaceProfile(event)}>
            <div className="settings-workspace-logo-field">
              <div className="settings-workspace-logo-preview">{workspaceLogo ? <img src={workspaceLogo} alt="" /> : <Icon name="building" />}</div>
              <div className="settings-workspace-logo-copy"><strong>{t('workspaceLogo')}</strong><small>{t('workspaceLogoHelp')}</small><div className="settings-workspace-logo-actions"><Button variant="secondary" size="sm" icon={<Icon name="plus" />} onClick={() => workspaceLogoInputRef.current?.click()}>{t('updatePicture')}</Button>{workspaceLogo && <Button variant="ghost" size="sm" onClick={() => { setWorkspaceLogo(''); if (workspaceLogoInputRef.current) workspaceLogoInputRef.current.value = '' }}>{t('removePicture')}</Button>}</div></div>
              <input ref={workspaceLogoInputRef} className="settings-avatar-input" type="file" accept="image/*" aria-label={t('workspaceLogo')} onChange={(event) => chooseWorkspaceLogo(event.target.files?.[0])} />
            </div>
            <div className="settings-workspace-profile__fields">
              <label htmlFor="settings-workspace-name">{t('workspaceName')}</label><Input id="settings-workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={80} required />
              <label htmlFor="settings-workspace-description">{t('workspaceDescription')}</label><textarea id="settings-workspace-description" value={workspaceDescription} onChange={(event) => setWorkspaceDescription(event.target.value)} maxLength={300} rows={3} />
            </div>
            <div className="settings-workspace-profile__actions">{workspaceError && <p className="team-members-feedback team-members-feedback--error" role="alert">{workspaceError}</p>}{workspaceNotice && <p className="team-members-feedback team-members-feedback--success" role="status">{workspaceNotice}</p>}<Button variant="ghost" onClick={resetWorkspaceSettings}>{t('resetWorkspace')}</Button><Button variant="primary" type="submit">{t('saveWorkspace')}</Button></div>
          </form>
          <div className="settings-options settings-workspace-controls">
            <OptionRow title={t('defaultProjectView')} description={t('savedLocally')}><Select id="settings-default-project-view" aria-label={t('defaultProjectView')} value={preferences.defaultProjectView} onChange={(event) => update('defaultProjectView', event.target.value as SettingsPreferences['defaultProjectView'])} options={[{ value: 'list', label: t('projectViewList') }, { value: 'cards', label: t('projectViewCards') }]} /></OptionRow>
            <OptionRow title={t('defaultTaskWorkflow')} description={t('defaultTaskStatusHelp')}><Select id="settings-default-task-status" aria-label={t('defaultTaskWorkflow')} value={preferences.defaultTaskStatus} onChange={(event) => update('defaultTaskStatus', event.target.value as SettingsPreferences['defaultTaskStatus'])} options={[{ value: 'todo', label: t('statusTodo') }, { value: 'in_progress', label: t('statusInProgress') }, { value: 'done', label: t('statusDone') }, { value: 'canceled', label: t('statusCanceled') }]} /></OptionRow>
          </div>
          <div className="settings-workspace-footer"><div><strong>{t('membersRoles')}</strong><p>{t('memberScope')}</p></div><Button variant="secondary" onClick={() => navigate('/team-members')}>{t('openMembers')}</Button></div>
          <div className="settings-workspace-grid settings-workspace-grid--secondary"><div><strong>{t('permissions')}</strong><span>{t('memberScope')}</span></div><div><strong>{t('rules')}</strong><span>{t('workflowValues')}</span></div></div>
        </>}

        {activeTab === 'about' && <>
          <div className="settings-panel-heading"><span className="settings-panel-heading__icon"><Icon name="inbox" /></span><div><h2>{t('aboutTitle')}</h2><p>{t('aboutHelp')}</p></div></div>
          <dl className="settings-about-details"><div><dt>{t('version')}</dt><dd>{APP_VERSION}</dd></div><div><dt>{t('language')}</dt><dd>{t(preferences.language === 'vi' ? 'vietnamese' : preferences.language === 'ja' ? 'japanese' : 'english')}</dd></div></dl>
          <div className="settings-support-card"><div><h3>{t('support')}</h3><p>{t('supportHelp')}</p></div><div><Button variant="secondary" onClick={() => navigate('/profile')}>{t('profileTitle')}</Button><Button variant="primary" onClick={() => void copySupportDetails()}>{t('copySupport')}</Button></div></div>
          {supportNotice && <p className="settings-inline-notice" role="status">{supportNotice}</p>}
          <div className="settings-reset-row"><span>{t('restoreDefaultsHelp')}</span><Button variant="ghost" onClick={() => { setPreferences(defaultSettings); setLandingPage(defaultSettings.startPage); setWorkspaceName(defaultSettings.workspaceName); setWorkspaceDescription(defaultSettings.workspaceDescription); setWorkspaceLogo(defaultSettings.workspaceLogoDataUrl); saveSettingsPreferences(defaultSettings); void i18n.changeLanguage(defaultSettings.language); setHasSaved(true); setSupportNotice(t('defaultsRestored')) }}>{t('restoreDefaults')}</Button></div>
        </>}
      </section>
    </div>
  </div>
}
