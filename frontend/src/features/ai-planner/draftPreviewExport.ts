import type { AiScheduleMember, ScheduleValidationReport } from '../../api/models'
import { DAY, dateLabel, escapeMarkup as esc, issuesForTask, memberNames, previewSections, spanLabel, taskDuration, timelineBounds, validRange, type DraftData } from './draftPreviewModel'

export function draftReportHtml(data: DraftData, members: AiScheduleMember[], validation: ScheduleValidationReport | null | undefined, unsaved: boolean, generatedAt = new Date()) {
  const sections = previewSections(data)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(data.project?.name || 'Project')} — Draft review</title><style>
  *{box-sizing:border-box}body{font:14px/1.6 Arial,sans-serif;color:#182332;margin:32px auto;max-width:1000px;padding:0 24px}h1{font-size:28px;line-height:1.25}h2{font-size:21px;margin-top:32px;border-bottom:2px solid #d9dce8;padding-bottom:8px}h3{font-size:16px;margin:0 0 8px}p{white-space:pre-wrap;overflow-wrap:anywhere}small,.muted{color:#4a586d}.draft{font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:bold;color:#6453a3}.task{border:1px solid #d9dce8;border-radius:8px;padding:16px;margin:12px 0;break-inside:avoid}.task dl{display:grid;grid-template-columns:135px minmax(0,1fr);gap:5px 16px}.task dt{color:#4a586d}.task dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.notice{padding:12px;background:#f1f3f9;border-left:3px solid #6664cf}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ddd;padding:8px;overflow-wrap:anywhere}button{background:#574ac7;color:white;border:0;padding:12px 18px;border-radius:6px;cursor:pointer}header{margin-bottom:24px}@page{size:A4;margin:16mm}@media print{body{margin:0;padding:0;font-size:10pt;max-width:none}.print-controls{display:none}h2,h3{break-after:avoid}thead{display:table-header-group}.task{border-radius:0}a{color:inherit}}
  </style></head><body><div class="print-controls"><button id="print-draft" type="button">Print / Save PDF</button><p>Choose Save as PDF in your browser's print dialog. All phases and tasks are included.</p></div>
  <header><p class="draft">Draft — not approved</p><h1>${esc(data.project?.name || 'Untitled project')}</h1><p>${esc(data.project?.description || '')}</p><p>${esc(data.project?.startDate || 'No start')} → ${esc(data.project?.endDate || 'No end')} · Exported ${esc(generatedAt.toLocaleString())}</p></header>
  <p class="notice">${unsaved ? 'Includes unsaved edits. Validation below describes the last saved draft; save and revalidate before approval.' : 'Saved draft snapshot. Approval still requires current server validation.'}</p>
  <h2>Validation</h2><p>${validation ? `${validation.issues.filter(i => i.blocksApproval).length} blocking issue(s) · ${validation.issues.filter(i => i.severity === 'WARNING' && !i.blocksApproval).length} warning(s)` : 'Validation unavailable.'}</p>
  ${validation?.issues.length ? `<ul>${validation.issues.map(i => `<li>${esc(i.blocksApproval ? 'Blocker' : i.severity)} — ${esc(i.taskTitle ? i.taskTitle + ': ' : '')}${esc(i.message)}</li>`).join('')}</ul>` : ''}
  <h2>Phase overview</h2><table><thead><tr><th>Phase / group</th><th>Tasks</th><th>Calendar range</th></tr></thead><tbody>${sections.map(s => `<tr><td>${esc(s.label)}</td><td>${s.rows.length}${s.key === 'SUMMARY' ? ' summaries' : ''}</td><td>${esc(spanLabel(s.start, s.end))}</td></tr>`).join('')}</tbody></table>
  ${sections.map(s => `<section><h2>${esc(s.label)}</h2>${s.key === 'SUMMARY' ? '<p>Summary spans include their children and waiting time; they are not additional execution effort.</p>' : ''}${s.rows.length ? s.rows.map(({ task: t, index, summary }) => `<article class="task"><h3>${esc(t.title || 'Untitled task')}</h3><dl>
  <dt>Dates</dt><dd>${esc(t.startDate || 'No start')} → ${esc(t.endDate || 'No end')}</dd><dt>${summary ? 'Summary span' : 'Duration'}</dt><dd>${summary ? (validRange(t) ? (validRange(t)!.end - validRange(t)!.start) / DAY + 1 : '—') : taskDuration(t) ?? '—'} calendar days${summary ? ' — not work effort' : ''}</dd>
  <dt>Assignees</dt><dd>${esc(memberNames(t.assigneeIds, members))}</dd><dt>Group</dt><dd>${esc(data.newGroups?.find(g => g.tempId === t.groupTempId)?.name || t.groupTempId || 'No group')}</dd><dt>Parent</dt><dd>${esc(t.parentTitle || 'None')}</dd><dt>Prerequisites</dt><dd>${esc(t.dependsOnTitles?.join(', ') || 'None')}</dd><dt>Description</dt><dd>${esc(t.description || 'Not provided')}</dd><dt>Deliverable</dt><dd>${esc(t.deliverable || 'Not provided')}</dd></dl>
  ${issuesForTask(validation, index).map(i => `<p><strong>${i.blocksApproval ? 'Blocker' : 'Warning'}:</strong> ${esc(i.message)}</p>`).join('')}</article>`).join('') : '<p>No tasks in this phase.</p>'}</section>`).join('')}
  ${data.aiNote ? `<h2>Planning assumptions</h2><p>${esc(data.aiNote)}</p>` : ''}<footer><p class="muted">Draft — not approved. This report does not create a project or approve the plan.</p></footer></body></html>`
}

export function openDraftReport(data: DraftData, members: AiScheduleMember[], validation: ScheduleValidationReport | null | undefined, unsaved: boolean) {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow pop-ups for this site to open the printable report.')
  popup.opener = null
  popup.document.open()
  popup.document.write(draftReportHtml(data, members, validation, unsaved))
  popup.document.close()
  popup.document.getElementById('print-draft')?.addEventListener('click', () => popup.print())
  popup.focus()
}

export function draftGanttSvg(data: DraftData, detail: 'overview' | 'all', unsaved: boolean) {
  const sections = previewSections(data), bounds = timelineBounds(sections)
  const rows = sections.flatMap(s => [{ label: s.label, start: s.start, end: s.end, color: s.color, heading: true, summary: s.key === 'SUMMARY' }, ...(detail === 'all' ? s.rows.map(r => { const range = validRange(r.task); return { label: r.task.title || 'Untitled task', start: range?.start ?? null, end: range?.end ?? null, color: s.color, heading: false, summary: r.summary } }) : [])])
  const width = 1600, left = 500, right = 40, top = 160, rowHeight = 42, height = top + rows.length * rowHeight + 70, track = width - left - right
  const position = (value: number) => left + (value - bounds.start!) / DAY / Math.max(1, bounds.days) * track
  const tickCount = Math.min(9, Math.max(1, bounds.days))
  const ticks = bounds.start === null ? '' : Array.from({ length: tickCount }, (_, i) => {
    const day = Math.round(i * (bounds.days - 1) / Math.max(1, tickCount - 1)), x = position(bounds.start! + day * DAY)
    return `<line x1="${x}" y1="140" x2="${x}" y2="${height - 40}" stroke="#e1e5ed"/><text x="${x}" y="133" font-size="12" text-anchor="${i === tickCount - 1 ? 'end' : 'start'}">${esc(dateLabel(bounds.start! + day * DAY))}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Draft Gantt chart"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,sans-serif" fill="#1d2939"><text x="24" y="30" font-size="14" fill="#5d53a2">DRAFT — NOT APPROVED</text><text x="24" y="65" font-size="24">${esc((data.project?.name || 'Untitled project').slice(0, 95))}</text><text x="24" y="92" font-size="13">${esc(unsaved ? 'Includes unsaved edits; validation requires saving.' : 'Saved draft snapshot.')} ${esc(new Date().toLocaleString())}</text>${ticks}${rows.map((r, i) => {
    const y = top + i * rowHeight
    const bar = r.start !== null && r.end !== null && bounds.start !== null ? `<rect x="${position(r.start)}" y="${y + 8}" width="${Math.max(2, (r.end - r.start + DAY) / DAY / bounds.days * track)}" height="${r.heading ? 12 : 22}" rx="3" fill="${r.color}" opacity="${r.heading || r.summary ? '.5' : '.9'}"/>` : `<text x="${left}" y="${y + 23}" font-size="12" fill="#8c342a">No valid dates</text>`
    return `<g><title>${esc(r.label)} — ${esc(spanLabel(r.start, r.end))}</title><rect x="16" y="${y}" width="${width - 32}" height="${rowHeight}" fill="${r.heading ? '#f2f4f9' : '#fff'}"/><text x="${r.heading ? 24 : 40}" y="${y + 24}" font-size="${r.heading ? 15 : 13}" font-weight="${r.heading ? 'bold' : 'normal'}">${esc(r.label.length > 58 ? r.label.slice(0, 55) + '…' : r.label)}</text>${bar}</g>`
  }).join('')}<text x="24" y="${height - 18}" font-size="12">Summary spans are not additional effort. Full task names and descriptions are available in the printable report.</text></g></svg>`
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function downloadDraftChart(data: DraftData, detail: 'overview' | 'all', format: 'svg' | 'png', unsaved: boolean) {
  const svg = draftGanttSvg(data, detail, unsaved), blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const name = (data.project?.name || 'project').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 70) + `-draft-${detail}`
  if (format === 'svg') { download(blob, name + '.svg'); return }
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not render the diagram. Try SVG instead.')); image.src = url })
    const scale = Math.min(1.5, 8192 / image.height, Math.sqrt(16000000 / (image.width * image.height)))
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PNG export is unavailable. Try SVG instead.')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!png) throw new Error('Could not export PNG. Try SVG instead.')
    download(png, name + '.png')
  } finally { URL.revokeObjectURL(url) }
}
