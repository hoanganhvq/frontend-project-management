type StatusBadgeProps = { tone: 'blue' | 'green' | 'amber' | 'purple' | 'gray' | 'red'; children: string }

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}><span className="status-badge__dot" />{children}</span>
}
