import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function LoadingState({ label = 'Loading workspace…' }: { label?: string }) {
  return <div className="state-panel" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /><strong>{label}</strong></div>
}

export function ErrorState({ title = 'Something went wrong', detail = 'Please try again in a moment.', action }: { title?: string; detail?: string; action?: ReactNode }) {
  return <div className="state-panel state-panel--error" role="alert"><span className="state-icon state-icon--error" aria-hidden="true">!</span><strong>{title}</strong><span>{detail}</span>{action && <div className="state-panel__action">{action}</div>}</div>
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="state-panel"><span className="state-icon" aria-hidden="true"><Icon name="inbox" /></span><strong>{title}</strong><span>{detail}</span>{action && <div className="state-panel__action">{action}</div>}</div>
}
