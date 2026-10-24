import { EmptyState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'

export function NotificationsPage() {
  return <div className="page-stack"><PageHeader eyebrow="ACTIVITY" title="Notifications" description="Activity feed from the project server." />
    <section className="content-panel notification-list"><EmptyState title="Notifications are not available" detail="The backend does not currently expose a notifications endpoint." /></section>
  </div>
}
