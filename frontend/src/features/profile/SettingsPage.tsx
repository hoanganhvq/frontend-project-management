import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/States'

export function SettingsPage() {
  return <div className="page-stack"><PageHeader eyebrow="ACCOUNT PREFERENCES" title="Settings" description="Workspace preferences are not yet supported by the project API." />
    <section className="content-panel settings-panel"><EmptyState title="No server preferences yet" detail="Email notifications, weekly summaries, and workspace storage settings do not have backend endpoints." /></section>
  </div>
}
