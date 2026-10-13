import { useState } from 'react'
import { useDemoWorkspace } from '../../app/DemoWorkspaceProvider'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'

export function SettingsPage() {
  const { workspace, updatePreferences, resetDemoWorkspace } = useDemoWorkspace()
  const [resetNotice, setResetNotice] = useState(false)
  return <div className="page-stack"><PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description="These preferences affect this browser’s demo workspace only." />
    <section className="content-panel settings-panel"><div className="panel-heading"><div><h2>Demo preferences</h2><p>Notification settings are local examples and do not change email delivery.</p></div></div>
      <div className="preference-list"><label className="preference-row"><span><strong>Email notifications</strong><small>Demo preference only; no emails are sent.</small></span><input type="checkbox" checked={workspace.preferences.emailNotifications} onChange={(event) => updatePreferences({ ...workspace.preferences, emailNotifications: event.target.checked })} /></label><label className="preference-row"><span><strong>Weekly summary</strong><small>Demo preference only; no summary is generated.</small></span><input type="checkbox" checked={workspace.preferences.weeklySummary} onChange={(event) => updatePreferences({ ...workspace.preferences, weeklySummary: event.target.checked })} /></label></div>
    </section>
    <section className="content-panel settings-panel"><div className="panel-heading"><div><h2>Reset sample data</h2><p>Replace browser demo changes with the original sample workspace.</p></div><Button variant="danger" onClick={() => setResetNotice(true)}>Reset demo workspace</Button></div>
      {resetNotice && <div className="reset-confirm" role="alertdialog" aria-label="Confirm reset"><p>This clears your browser’s demo workspace changes. This cannot be undone.</p><div className="page-actions"><Button variant="secondary" onClick={() => setResetNotice(false)}>Cancel</Button><Button variant="danger" onClick={() => { resetDemoWorkspace(); setResetNotice(false) }}>Confirm reset</Button></div></div>}
    </section>
  </div>
}
