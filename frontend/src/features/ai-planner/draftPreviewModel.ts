import type { AiScheduleMember, AiScheduleResponse, AiScheduleTaskPreview, ScheduleValidationReport } from '../../api/models'
import { TASK_PHASES, taskPhaseLabel } from '../../types/domain'

export type DraftData = AiScheduleResponse['scheduleData']
export type PreviewRow = { task: AiScheduleTaskPreview; index: number; summary: boolean }
export type PreviewSection = { key: string; label: string; color: string; rows: PreviewRow[]; start: number | null; end: number | null }
export const DAY = 86400000
const colors = ['#5b5bd6', '#197a8c', '#2563b9', '#976209', '#35754d']
export function dayValue(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = Date.parse(value + 'T00:00:00Z')
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === value ? date : null
}
export function validRange(task: AiScheduleTaskPreview) {
  const start = dayValue(task.startDate), end = dayValue(task.endDate)
  return start !== null && end !== null && end >= start ? { start, end } : null
}
export function dateLabel(value: number | null) {
  return value === null ? 'Dates missing' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(value)
}
export function spanLabel(start: number | null, end: number | null) {
  return start === null || end === null ? 'Dates to review' : `${dateLabel(start)} → ${dateLabel(end)}`
}
export function taskDuration(task: AiScheduleTaskPreview) {
  const range = validRange(task)
  return task.estimatedDurationDays ?? (range ? (range.end - range.start) / DAY + 1 : null)
}
export function memberNames(ids: number[] | undefined, members: AiScheduleMember[]) {
  return ids?.length ? ids.map(id => members.find(m => m.id === id)?.name || `Member #${id}`).join(', ') : 'Unassigned'
}
export function previewSections(data: DraftData): PreviewSection[] {
  const tasks = data.tasks ?? [], parents = new Set(tasks.map(t => t.parentTitle).filter(Boolean))
  const rows = tasks.map((task, index) => ({ task, index, summary: parents.has(task.title) }))
  const section = (key: string, label: string, color: string, items: PreviewRow[]): PreviewSection => {
    const ranges = items.map(r => validRange(r.task)).filter(r => r !== null)
    return { key, label, color, rows: items, start: ranges.length ? Math.min(...ranges.map(r => r.start)) : null, end: ranges.length ? Math.max(...ranges.map(r => r.end)) : null }
  }
  const sections = TASK_PHASES.map((phase, i) => section(phase, taskPhaseLabel(phase), colors[i], rows.filter(r => !r.summary && r.task.phase === phase)))
  const missing = rows.filter(r => !r.summary && !TASK_PHASES.includes(r.task.phase as typeof TASK_PHASES[number]))
  if (missing.length) sections.push(section('UNPHASED', 'Needs phase assignment', '#9b3c30', missing))
  const summaries = rows.filter(r => r.summary)
  if (summaries.length) sections.push(section('SUMMARY', 'Summary groups', '#687386', summaries))
  return sections
}
export function issuesForTask(report: ScheduleValidationReport | null | undefined, index: number) {
  return report?.issues.filter(issue => issue.path === `/tasks/${index}` || issue.path.startsWith(`/tasks/${index}/`)) ?? []
}
export function timelineBounds(sections: PreviewSection[]) {
  const ranges = sections.flatMap(s => s.rows.map(r => validRange(r.task))).filter(r => r !== null)
  const start = ranges.length ? Math.min(...ranges.map(r => r.start)) : null
  const end = ranges.length ? Math.max(...ranges.map(r => r.end)) : null
  return { start, end, days: start !== null && end !== null ? (end - start) / DAY + 1 : 0 }
}
export function escapeMarkup(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
