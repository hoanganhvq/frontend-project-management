import { useState } from 'react'
import type { TaskAssigneeSummary } from '../../types/domain'

function AssigneeAvatar({ assignee }: { assignee: TaskAssigneeSummary }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const name = assignee.userName?.trim() || 'Unknown user'
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <span className="task-assignee-avatar" tabIndex={0} aria-label={name}>
    {assignee.avatarUrl && failedUrl !== assignee.avatarUrl
      ? <img src={assignee.avatarUrl} alt="" loading="lazy" onError={() => setFailedUrl(assignee.avatarUrl)} />
      : initials}
    <span className="task-assignee-tooltip" aria-hidden="true">{name}</span>
  </span>
}

export function TaskAssignees({ assignees }: { assignees: TaskAssigneeSummary[] }) {
  if (!assignees.length) return <span>Unassigned</span>
  const remaining = assignees.slice(2).map((person) => person.userName || 'Unknown user').join(', ')
  return <span className="task-assignees" role="group" aria-label="Task assignees">
    {assignees.slice(0, 2).map((assignee) => <AssigneeAvatar key={assignee.userId} assignee={assignee} />)}
    {assignees.length > 2 && <span className="task-assignee-avatar" tabIndex={0} aria-label={`More assignees: ${remaining}`}>
      +{assignees.length - 2}<span className="task-assignee-tooltip" aria-hidden="true">{remaining}</span>
    </span>}
  </span>
}
