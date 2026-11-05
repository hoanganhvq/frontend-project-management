import { useEffect, useState } from 'react'
import { adminApi, type AdminProject, type AdminPageResult, type AdminUser } from './adminApi'
import { Feedback, Pager, useSearch } from './AdminUi'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function TransferOwnerDialog({ project, onClose, onTransferred }: { project: AdminProject | null; onClose: () => void; onTransferred: () => void }) {
  const { query, setQuery, term } = useSearch()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState<AdminPageResult<AdminUser> | null>(null)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => { setQuery(''); setPage(0); setSelected(null); setReason(''); setConfirm(false); setError('') }, [project?.id])
  useEffect(() => { setPage(0) }, [term])
  useEffect(() => {
    if (!project) return
    let live = true; setLoading(true); setError('')
    adminApi.ownerCandidates(project.id, term, page, size).then(result => { if (live) { setData(result); if (page > 0 && page >= result.totalPages) setPage(Math.max(0, result.totalPages - 1)) } }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được người nhận.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [project?.id, term, page, size, revision])
  async function transfer() {
    if (!project || !selected) return
    setBusy(true); setError('')
    try { await adminApi.transferOwner(project.id, selected.id, project.ownerId, reason.trim()); onTransferred() }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể chuyển Owner.') }
    finally { setBusy(false) }
  }
  return <>
    <Dialog open={project !== null} title="Chuyển quyền sở hữu dự án" onClose={() => { if (!busy) onClose() }} actions={<><Button variant="secondary" disabled={busy} onClick={onClose}>Hủy</Button><Button type="submit" form="transfer-owner-form" disabled={busy || !selected || !reason.trim()} onClick={() => setError('')}>Tiếp tục</Button></>}>
      <form id="transfer-owner-form" className="admin-form" onSubmit={event => { event.preventDefault(); if (selected && reason.trim()) setConfirm(true) }}>
        <p><strong>{project?.name}</strong> · Owner hiện tại: {project?.ownerName}</p>
        <p className="admin-info">Người nhận phải là thành viên đang hoạt động. Owner cũ được giữ lại với vai trò Leader; quyền hệ thống của hai tài khoản giữ nguyên.</p>
        <Input id="owner-candidate-search" label="Tìm thành viên nhận quyền" value={query} maxLength={150} onChange={event => setQuery(event.target.value)} />
        <Feedback error={confirm ? '' : error} retry={() => setRevision(value => value + 1)} />
        {loading && <p role="status">Đang tải thành viên…</p>}
        <fieldset className="admin-owner-candidates" disabled={loading || busy}><legend>Chọn Owner mới</legend>{data?.content.map(person => <label key={person.id}><input type="radio" name="newOwner" checked={selected?.id === person.id} onChange={() => setSelected(person)} /><span><strong>{person.name}</strong><small>{person.email}</small></span></label>)}</fieldset>
        {!loading && data?.content.length === 0 && <p>Chưa có thành viên đang hoạt động phù hợp. Hãy thêm thành viên vào project trước.</p>}
        <Pager data={data} page={page} onPage={setPage} loading={loading} size={size} onSize={value => { setSize(value); setPage(0) }} />
        <label htmlFor="transfer-reason">Lý do chuyển quyền</label><textarea id="transfer-reason" value={reason} maxLength={500} rows={3} required onChange={event => setReason(event.target.value)} />
      </form>
    </Dialog>
    <Dialog open={project !== null && confirm} title="Xác nhận chuyển Owner?" onClose={() => { if (!busy) setConfirm(false) }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Quay lại</Button><Button disabled={busy} onClick={() => void transfer()}>{busy ? 'Đang chuyển…' : 'Xác nhận chuyển quyền'}</Button></>}>
      <p><strong>{project?.name}</strong></p><p>{project?.ownerName} → <strong>{selected?.name}</strong></p><p className="admin-preserve-lines">{reason}</p><p>Người nhận sẽ có quyền sửa và xóa project. Owner cũ không còn các quyền riêng của Owner. Thao tác được ghi vào nhật ký quản trị.</p><Feedback error={error} />
    </Dialog>
  </>
}
