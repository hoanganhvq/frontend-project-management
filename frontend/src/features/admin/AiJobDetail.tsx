import { useEffect, useState } from 'react'
import type { AiGenerationJob } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { adminApi } from './adminApi'

const stamp = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa ghi nhận'
const guidance: Record<string, string> = {
  MISSING_SCHEDULE_ID: 'Workflow chưa trả scheduleId. Kiểm tra bản ghi đã lưu bằng sessionId của job.',
  UNVERIFIED_SCHEDULE: 'Draft trả về chưa khớp người tạo hoặc sessionId. Kiểm tra workflow có giữ nguyên sessionId được BE gửi hay không.',
  WORKFLOW_TIMEOUT: 'BE đã hết thời gian chờ; workflow có thể vẫn chạy. Kiểm tra draft trước khi gửi lại.',
  WORKFLOW_CONNECTION: 'BE không đọc được kết quả từ n8n. Kiểm tra kết nối và execution trong n8n.',
  UNCONFIRMED_RESULT: 'Response chưa xác nhận draft đã lưu. Kiểm tra response cuối của workflow và sessionId.',
}

export function AiJobDetail({ id, onClose, onUpdated }: { id: string; onClose: () => void; onUpdated: () => void }) {
  const [job, setJob] = useState<AiGenerationJob | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let live = true
    setError('')
    adminApi.job(id).then(value => { if (live) setJob(value) }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được job.') })
    return () => { live = false }
  }, [id, revision])
  async function check() {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await adminApi.reconcileJob(id)
      setJob(result)
      setNotice(result.status === 'SUCCEEDED' ? 'Đã xác nhận draft đã lưu. Nhật ký AI đã cập nhật thành công.' : 'Chưa tìm thấy duy nhất một bản ghi khớp sessionId và người tạo. Job vẫn chưa xác định; không có workflow nào được chạy lại.')
      onUpdated()
    } catch (e) { setError(e instanceof Error ? e.message : 'Không kiểm tra được kết quả.') }
    finally { setBusy(false) }
  }
  return <Dialog open title="Chi tiết AI job" onClose={onClose} actions={<>
    <Button variant="secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Làm mới chi tiết</Button>
    {job?.status === 'UNKNOWN' && <Button variant="primary" disabled={busy} onClick={() => void check()}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra lại kết quả'}</Button>}
    <Button variant="secondary" onClick={onClose}>Đóng</Button>
  </>}>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!job && !error && <p role="status">Đang tải chi tiết…</p>}
    {job && <div className="admin-job-detail">
      <dl><dt>Job / Session ID</dt><dd>{job.id}</dd><dt>Tài liệu</dt><dd>{job.filename}</dd>
        <dt>Người yêu cầu</dt><dd>{job.requesterName} · User #{job.requesterId}</dd>
        <dt>Phân công</dt><dd>{job.assignmentMode}</dd><dt>Trạng thái</dt><dd>{job.status}</dd>
        <dt>Draft liên quan</dt><dd>{job.scheduleId ? `Draft #${job.scheduleId}` : 'Chưa xác nhận'}</dd>
        <dt>Mã lỗi</dt><dd>{job.errorCode || 'Không có'}</dd><dt>Thông báo</dt><dd>{job.message || 'Chưa có'}</dd>
        <dt>Thời gian xử lý đã ghi nhận</dt><dd>{job.durationMs == null ? 'Chưa ghi nhận' : `${Math.round(job.durationMs / 1000)} giây`}</dd></dl>
      <h3>Các mốc BE ghi nhận</h3>
      <ol><li>Tiếp nhận: {stamp(job.createdAt)}</li><li>Bắt đầu xử lý: {stamp(job.startedAt)}</li><li>Ghi nhận kết quả: {stamp(job.finishedAt)}</li></ol>
      <p>Đây là thời gian BE ghi nhận, không phải tiến độ từng agent trong n8n.</p>
      {job.errorCode && <p className="admin-info">{guidance[job.errorCode] || 'Kiểm tra execution n8n và cấu hình kết nối BE. Tra cứu bằng sessionId của job để tránh nhầm bản nháp.'}</p>}
      {job.status === 'UNKNOWN' && <p>Kiểm tra lại chỉ đối chiếu dữ liệu đã lưu. Hệ thống không chạy lại workflow và không chọn draft mới nhất thay cho bản ghi khớp job.</p>}
    </div>}
  </Dialog>
}
