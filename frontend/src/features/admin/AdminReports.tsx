import { useEffect, useState } from 'react'
import { adminApi, type AdminPageResult, type AuditRow } from './adminApi'
import type { AiGenerationJob } from '../../api/models'
import { Feedback, Pager, useSearch } from './AdminUi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AiJobDetail } from './AiJobDetail'

const actions: Record<string, string> = { USER_CREATED: 'Tạo tài khoản', USER_UPDATED: 'Sửa hồ sơ', USER_DISABLED: 'Khóa tài khoản', USER_ENABLED: 'Mở khóa tài khoản', USER_DELETED: 'Xóa tài khoản', ROLE_CHANGED_USER_TO_ADMIN: 'Cấp quyền Admin', ROLE_CHANGED_ADMIN_TO_USER: 'Hạ quyền Admin', PROJECT_OWNER_TRANSFERRED: 'Chuyển Owner' }
const states: Record<string, string> = { QUEUED: 'Đang chờ', RUNNING: 'Đang xử lý', SUCCEEDED: 'Thành công', FAILED: 'Thất bại', UNKNOWN: 'Chưa xác định' }
const stamp = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
const duration = (job: AiGenerationJob) => {
  const ms = job.durationMs ?? (job.startedAt && job.status === 'RUNNING' ? Date.now() - new Date(job.startedAt).getTime() : null)
  if (ms === null) return '—'
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`
}

export function AdminReports({ kind }: { kind: 'audit' | 'jobs' }) {
  const { query, setQuery, term } = useSearch()
  const [filter, setFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState<AdminPageResult<AuditRow> | AdminPageResult<AiGenerationJob> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  useEffect(() => { setPage(0) }, [term, filter, from, to])
  useEffect(() => {
    if (kind !== 'jobs') return
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(value => value + 1) }
    const timer = window.setInterval(refresh, 10_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [kind])
  useEffect(() => {
    if (from && to && from > to) { setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return }
    let live = true; setLoading(true); setError('')
    const request = kind === 'audit' ? adminApi.audits(term, filter, from, to, page, size) : adminApi.jobs(term, filter, page, size)
    request.then(result => { if (live) { if (page > 0 && page >= result.totalPages) setPage(Math.max(0, result.totalPages - 1)); else setData(result) } }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [kind, term, filter, from, to, page, size, revision])
  const audit = kind === 'audit'
  return <>
    <div className="admin-heading"><div><p>{audit ? 'LỊCH SỬ THAO TÁC' : 'GIÁM SÁT XỬ LÝ TÀI LIỆU'}</p><h1>{audit ? 'Nhật ký quản trị' : 'Theo dõi xử lý AI'}</h1><span>{audit ? 'Tra cứu các thay đổi tài khoản và quyền sở hữu dự án.' : 'Trạng thái do BE ghi nhận. Danh sách cập nhật mỗi 10 giây khi tab đang hiển thị.'}</span></div><Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Làm mới</Button></div>
    <div className="admin-filters"><Input id="admin-report-search" label={audit ? 'Tìm hành động hoặc người liên quan' : 'Tìm file hoặc người yêu cầu'} value={query} maxLength={150} onChange={event => setQuery(event.target.value)} /><Select id="admin-report-filter" label={audit ? 'Hành động' : 'Trạng thái job'} value={filter} onChange={event => setFilter(event.target.value)} options={[{ value: '', label: 'Tất cả' }, ...Object.entries(audit ? actions : states).map(([value, label]) => ({ value, label }))]} />{audit && <><Input id="admin-audit-from" label="Từ ngày" type="date" value={from} onChange={event => setFrom(event.target.value)} /><Input id="admin-audit-to" label="Đến ngày" type="date" value={to} onChange={event => setTo(event.target.value)} /></>}</div>
    <Feedback error={error} retry={() => setRevision(value => value + 1)} />{loading && !data && <p role="status">Đang tải dữ liệu…</p>}
    <div className="admin-table-wrap" aria-busy={loading}><table className="admin-table"><caption className="sr-only">{audit ? 'Nhật ký quản trị' : 'Các lần xử lý AI'}</caption><thead><tr>{(audit ? ['Thời điểm', 'Người thao tác', 'Hành động', 'Đối tượng', 'Chi tiết'] : ['Tài liệu / Job ID', 'Người yêu cầu', 'Trạng thái', 'Thời gian', 'Kết quả']).map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>
      {audit ? (data?.content as AuditRow[] | undefined)?.map(event => <tr key={event.id}><td>{stamp(event.createdAt)}</td><td>{event.actorName ?? `User #${event.actorId}`}<small>#{event.actorId}</small></td><td>{actions[event.action] ?? event.action}</td><td>{event.projectName ?? event.targetName ?? `User #${event.targetUserId}`}<small>{event.projectId ? `Project #${event.projectId}` : `User #${event.targetUserId}`}</small></td><td className="admin-preserve-lines">{event.previousOwnerId && <small>Owner cũ #{event.previousOwnerId} → Owner mới #{event.targetUserId}</small>}{event.reason || '—'}</td></tr>)
        : (data?.content as AiGenerationJob[] | undefined)?.map(job => <tr key={job.id}><td><Button variant="ghost" onClick={() => setSelectedJob(job.id)} aria-label={`Chi ti\u1ebft job ${job.filename}`}>{job.filename}</Button><small className="admin-job-id">{job.id}</small><small>{job.assignmentMode}</small></td><td>{job.requesterName}<small>User #{job.requesterId}</small></td><td><StatusBadge tone={job.status === 'SUCCEEDED' ? 'green' : job.status === 'FAILED' ? 'red' : job.status === 'UNKNOWN' ? 'amber' : job.status === 'RUNNING' ? 'blue' : 'gray'}>{states[job.status] ?? job.status}</StatusBadge></td><td>{stamp(job.createdAt)}<small>Bắt đầu: {stamp(job.startedAt)}</small><small>Kết thúc: {stamp(job.finishedAt)}</small><small>Xử lý: {duration(job)}</small></td><td>{job.scheduleId ? `Draft #${job.scheduleId}` : job.errorCode || '—'}<small className="admin-job-message">{job.message}</small></td></tr>)}
    </tbody></table>{!loading && !error && !data?.content.length && <p className="admin-empty">{audit ? 'Chưa có thao tác phù hợp.' : 'Chưa có job phù hợp. Các lần gửi qua BE mới sẽ xuất hiện tại đây.'}</p>}</div>
    {!audit && <p className="admin-info">“Chưa xác định” nghĩa là BE chưa xác nhận được kết quả, ví dụ mất kết nối hoặc gián đoạn xử lý. Hãy kiểm tra draft đã lưu trước khi gửi lại để tránh tạo trùng.</p>}
    <Pager data={data} page={page} onPage={setPage} loading={loading} size={size} onSize={value => { setSize(value); setPage(0) }} />
    {selectedJob && <AiJobDetail key={selectedJob} id={selectedJob} onClose={() => setSelectedJob(null)} onUpdated={() => setRevision(value => value + 1)} />}
  </>
}
