import type { ProjectStatus, TaskPriority, TaskStatus } from '../types/domain'
import { getSettingsPreferences } from '../app/settingsPreferences'

export function formatDate(value: string): string {
  if (!value) return 'No date set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  const preferences = getSettingsPreferences()
  if (preferences.dateFormat === 'yyyy-mm-dd') return value
  const locale = preferences.language === 'vi' ? 'vi-VN' : preferences.language === 'ja' ? 'ja-JP' : 'en-US'
  return new Intl.DateTimeFormat(locale, preferences.dateFormat === 'dd-mm-yyyy'
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { month: '2-digit', day: '2-digit', year: 'numeric' }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(getSettingsPreferences().numberLocale).format(value)
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
