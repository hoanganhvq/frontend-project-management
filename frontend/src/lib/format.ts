import type { ProjectStatus, TaskPriority, TaskStatus } from '../types/domain'

export function formatDate(value: string): string {
  if (!value) return 'No date set'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function toLocalDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDateRange(start: string, end: string): string {
  if (!start && !end) return 'Dates not set'
  if (!start) return `Due ${formatDate(end)}`
  if (!end) return `Started ${formatDate(start)}`
  return `${formatDate(start)} – ${formatDate(end)}`
}

export function projectTone(status: ProjectStatus): 'blue' | 'green' | 'gray' {
  if (status === 'completed') return 'green'
  if (status === 'cancelled') return 'gray'
  return 'blue'
}

export function taskTone(status: TaskStatus): 'blue' | 'green' | 'gray' | 'amber' {
  if (status === 'done') return 'green'
  if (status === 'canceled') return 'gray'
  if (status === 'in_progress') return 'blue'
  return 'amber'
}

export function priorityTone(priority: TaskPriority): 'red' | 'amber' | 'gray' {
  if (priority === 'high') return 'red'
  if (priority === 'medium') return 'amber'
  return 'gray'
}
