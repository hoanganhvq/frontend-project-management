import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { navigate } from '../../app/router'
import { APP_SHORT_NAME } from '../../app/branding'
import { groupsApi, projectMembersApi, projectsApi, tasksApi } from '../../api/services'
import { ApiError } from '../../api/client'
import type { ProjectGroup, ProjectMember, ProjectResponse, TaskResponse } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Dialog } from '../../components/ui/Dialog'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate, taskTone } from '../../lib/format'
import { taskStatusLabel } from '../../types/domain'
import { adminApi, type AdminOverview, type AdminUser, type AdminUserDetail, type AdminUserInput, type AdminPageResult, type AdminProject } from './adminApi'
import './AdminPage.css'
import { Feedback, Pager, useSearch } from './AdminUi'
import { AdminReports } from './AdminReports'
import { SettingsPage } from '../profile/SettingsPage'
import { ProfilePage } from '../profile/ProfilePage'
import { TransferOwnerDialog } from './TransferOwnerDialog'

export type AdminSection = 'overview' | 'users' | 'projects' | 'audit-logs' | 'ai-jobs' | 'settings' | 'profile'
const sections = [{ id: 'overview', name: 'Tổng quan', path: '/admin', icon: 'grid' }, { id: 'users', name: 'Người dùng', path: '/admin/users', icon: 'users' }, { id: 'projects', name: 'Dự án', path: '/admin/projects', icon: 'folder' }, { id: 'audit-logs', name: 'Nh\u1eadt k\u00fd qu\u1ea3n tr\u1ecb', path: '/admin/audit-logs', icon: 'list' }, { id: 'ai-jobs', name: 'Theo d\u00f5i AI', path: '/admin/ai-jobs', icon: 'sparkles' }, { id: 'settings', name: 'C\u00e0i \u0111\u1eb7t', path: '/admin/settings', icon: 'settings' }, { id: 'profile', name: 'H\u1ed3 s\u01a1', path: '/admin/profile', icon: 'users' }] as const
const statusName: Record<string, string> = { in_progress: 'Đang thực hiện', completed: 'Hoàn tất', cancelled: 'Đã hủy', todo: 'Cần làm', review: 'Chờ duyệt', done: 'Hoàn tất', canceled: 'Đã hủy' }
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.'

export function AdminPage({ section }: { section: AdminSection }) {
  const { user, logout } = useAuth()
  if (user?.role !== 'ADMIN') return <main className="admin-denied"><Icon name="shield" /><h1>Không có quyền truy cập</h1><p>Khu vực này chỉ dành cho quản trị viên hệ thống.</p><Button onClick={() => navigate('/dashboard')}>Về không gian làm việc</Button></main>
  return <div className="admin-layout">
    <a className="skip-link" href="#admin-main">Đến nội dung</a>
    <aside className="admin-sidebar">
      <div className="admin-brand"><span><Icon name="shield" /></span><div><strong>{APP_SHORT_NAME}</strong><small>Quản trị hệ thống</small></div></div>
      <p className="admin-nav-label">QUẢN TRỊ</p>
      <nav aria-label="Quản trị hệ thống">{sections.map(item => <button key={item.id} type="button" aria-current={section === item.id ? 'page' : undefined} onClick={() => navigate(item.path)}><Icon name={item.icon} />{item.name}</button>)}</nav>
      <div className="admin-sidebar-bottom"><span>ADMIN · {user.name}</span><button className="sign-out-button" type="button" onClick={() => void logout()}><Icon name="logout" /><span>Đăng xuất</span></button></div>
    </aside>
    <div className="admin-body"><header className="admin-topbar"><span>Hệ thống / <strong>{sections.find(item => item.id === section)?.name}</strong></span></header>
      <main id="admin-main" className="admin-content">{section === 'settings' ? <SettingsPage /> : section === 'profile' ? <ProfilePage /> : section === 'overview' ? <Overview /> : section === 'users' ? <Users /> : section === 'projects' ? <Projects /> : <AdminReports kind={section === 'audit-logs' ? 'audit' : 'jobs'} />}</main>
    </div>
  </div>
}

function Overview() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => { let active = true; setError(''); adminApi.overview().then(value => { if (active) setData(value) }).catch(e => { if (active) setError(message(e)) }); return () => { active = false } }, [retry])
  return <><div className="admin-heading"><div><p>GÓC NHÌN TOÀN HỆ THỐNG</p><h1>Tổng quan</h1><span>Theo dõi tài khoản, dự án và tình trạng công việc.</span></div><StatusBadge tone="purple">System admin</StatusBadge></div>
    <Feedback error={error} retry={() => setRetry(value => value + 1)} />
    {!data && !error && <p role="status">Đang tải thống kê…</p>}
    {data && <><div className="admin-metrics">{[{ title: 'Người dùng', value: data.users, note: `${data.activeUsers} tài khoản đang hoạt động`, path: '/admin/users', icon: 'users' as const }, { title: 'Quản trị viên', value: data.admins, note: 'Admin đang hoạt động', path: '/admin/users', icon: 'shield' as const }, { title: 'Dự án', value: data.projects, note: 'Tất cả dự án trong hệ thống', path: '/admin/projects', icon: 'folder' as const }, { title: 'Công việc', value: data.tasks, note: 'Bao gồm các trạng thái', path: '/admin/projects', icon: 'board' as const }].map(metric => <button className="admin-metric" type="button" key={metric.title} onClick={() => navigate(metric.path)}><Icon name={metric.icon} /><span>{metric.title}</span><strong>{metric.value}</strong><small>{metric.note}</small></button>)}</div>
      <div className="admin-summary-grid">{[{ title: 'Trạng thái dự án', values: data.projectStatuses }, { title: 'Trạng thái công việc', values: data.taskStatuses }].map(group => <section className="admin-panel" key={group.title}><h2>{group.title}</h2>{Object.entries(group.values).map(([key, count]) => <div className="admin-summary-row" key={key}><span>{statusName[key] ?? key}</span><strong>{count}</strong></div>)}{!Object.keys(group.values).length && <p>Chưa có dữ liệu.</p>}</section>)}</div>
      <div className="admin-info"><Icon name="shield" /><p>Quyền Admin áp dụng ở cấp hệ thống. Quyền sửa dự án và công việc vẫn theo vai trò Owner, Leader hoặc Member trong từng dự án.</p></div></>}
  </>
}

function Users() {
  const { user: currentUser, refresh: refreshAuth } = useAuth()
  const { query, setQuery, term } = useSearch()
  const [role, setRole] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState<AdminPageResult<AdminUser> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailError, setDetailError] = useState('')
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  const [form, setForm] = useState<AdminUserInput>({ name: '', email: '', password: '', position: '', role: 'USER' })
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<{ target: AdminUser; action: 'role' | 'active' | 'delete'; role?: string } | null>(null)
  useEffect(() => { setPage(0) }, [term, role, active])
  useEffect(() => {
    let live = true; setLoading(true); setError('')
    adminApi.users(term, role, active, page, size).then(result => { if (live) { if (page > 0 && page >= result.totalPages) setPage(Math.max(0, result.totalPages - 1)); else setData(result) } }).catch(e => { if (live) setError(message(e)) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [term, role, active, page, size, revision])
  useEffect(() => {
    if (detailId === null) return
    let live = true; setSelected(null); setDetailError('')
    adminApi.detail(detailId).then(result => { if (live) setSelected(result) }).catch(e => { if (live) setDetailError(message(e)) })
    return () => { live = false }
  }, [detailId, revision])
  function edit(target: AdminUser | 'new') {
    setEditing(target); setFormError(''); setDetailId(null)
    setForm(target === 'new' ? { name: '', email: '', position: '', password: '', role: 'USER' } : { name: target.name, email: target.email, position: target.position ?? '', password: '', role: target.role })
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editing) return
    setBusy(true); setFormError('')
    try {
      if (editing === 'new') await adminApi.create(form)
      else await adminApi.edit(editing.id, { name: form.name, email: form.email, position: form.position })
      setNotice(editing === 'new' ? 'Đã tạo tài khoản.' : 'Đã cập nhật tài khoản.'); setEditing(null); setRevision(v => v + 1)
      if (editing !== 'new' && editing.id === currentUser?.id) await refreshAuth()
    } catch (e) { setFormError(message(e)) } finally { setBusy(false) }
  }
  async function confirm() {
    if (!confirmation) return
    setBusy(true); setFormError('')
    try {
      const { target, action } = confirmation
      if (action === 'delete') await adminApi.remove(target.id)
      if (action === 'role') await adminApi.role(target.id, confirmation.role!)
      if (action === 'active') await adminApi.active(target.id, !target.active)
      setConfirmation(null); setNotice('Đã cập nhật tài khoản.'); setRevision(v => v + 1)
      if (action === 'delete') setDetailId(null)
      if (target.id === currentUser?.id) await refreshAuth()
    } catch (e) { setFormError(message(e)) } finally { setBusy(false) }
  }
  const relationNames: Record<string, string> = { ownedProjects: 'Dự án sở hữu', createdTasks: 'Task đã tạo', projectMemberships: 'Thành viên dự án', groupMemberships: 'Thành viên nhóm', taskAssignments: 'Task được giao', aiSchedules: 'AI schedule đã tạo', aiJobs: 'Lần xử lý AI' }
  return <><div className="admin-heading"><div><p>QUẢN LÝ TÀI KHOẢN</p><h1>Người dùng</h1><span>Quản lý hồ sơ, quyền hệ thống và trạng thái truy cập.</span></div><Button icon={<Icon name="plus" />} onClick={() => edit('new')}>Thêm người dùng</Button></div>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="admin-filters"><Input id="admin-user-search" label="Tìm người dùng" placeholder="Tên hoặc email" value={query} maxLength={150} onChange={e => setQuery(e.target.value)} /><Select id="admin-role-filter" label="Quyền hệ thống" value={role} onChange={e => setRole(e.target.value)} options={[{ value: '', label: 'Tất cả quyền' }, { value: 'USER', label: 'USER' }, { value: 'ADMIN', label: 'ADMIN' }]} /><Select id="admin-active-filter" label="Trạng thái" value={active} onChange={e => setActive(e.target.value)} options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Đã khóa' }]} /></div>
    <Feedback error={error} retry={() => setRevision(v => v + 1)} />
    {loading && <p role="status">Đang tải người dùng…</p>}
    <div className="admin-table-wrap" aria-busy={loading}><table className="admin-table"><caption className="sr-only">Danh sách người dùng</caption><thead><tr><th>Người dùng</th><th>Vị trí</th><th>System role</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data?.content.map(person => <tr key={person.id}><td><div className="admin-person"><span>{person.name.charAt(0).toUpperCase()}</span><div><strong>{person.name}{person.id === currentUser?.id ? ' (Bạn)' : ''}</strong><small>{person.email}</small></div></div></td><td>{person.position || '—'}</td><td><StatusBadge tone={person.role === 'ADMIN' ? 'purple' : 'gray'}>{person.role}</StatusBadge></td><td><StatusBadge tone={person.active ? 'green' : 'gray'}>{person.active ? 'Hoạt động' : 'Đã khóa'}</StatusBadge></td><td><Button size="sm" variant="secondary" onClick={() => setDetailId(person.id)} aria-label={`Chi tiết ${person.name}`}>Chi tiết</Button></td></tr>)}</tbody></table>{!loading && !error && !data?.content.length && <p className="admin-empty">Không tìm thấy người dùng phù hợp.</p>}</div>
    <Pager data={data} page={page} onPage={setPage} loading={loading} size={size} onSize={value => { setSize(value); setPage(0) }} />
    <Dialog open={detailId !== null} title="Chi tiết người dùng" onClose={() => { if (!busy) setDetailId(null) }} actions={<Button variant="secondary" onClick={() => setDetailId(null)}>Đóng</Button>}>
      <Feedback error={detailError} retry={() => setRevision(v => v + 1)} />{!selected && !detailError && <p role="status">Đang tải hồ sơ…</p>}
      {selected && <div className="admin-detail"><h3>{selected.user.name}</h3><p>{selected.user.email}</p><p>{selected.user.position || 'Chưa cập nhật vị trí'} · {selected.user.role} · {selected.user.active ? 'Hoạt động' : 'Đã khóa'}</p><p>Ngày tạo: {formatDate(selected.user.createdAt)}</p>
        <div className="admin-related">{Object.entries(selected.relatedData).map(([key, value]) => <div key={key}><span>{relationNames[key] ?? key}</span><strong>{value}</strong></div>)}</div>
        <div className="admin-detail-actions"><Button variant="secondary" onClick={() => edit(selected.user)}>Sửa hồ sơ</Button><Button variant="secondary" onClick={() => { setFormError(''); setConfirmation({ target: selected.user, action: 'active' }) }}>{selected.user.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</Button></div>
        <Select id="admin-change-role" label="Đổi quyền hệ thống" value={selected.user.role} onChange={e => { setFormError(''); setConfirmation({ target: selected.user, action: 'role', role: e.target.value }) }} options={[{ value: 'USER', label: 'USER' }, { value: 'ADMIN', label: 'ADMIN' }]} />
        {!selected.canDelete && <p className="admin-info">{selected.deleteBlockedReason}</p>}<Button variant="danger" disabled={!selected.canDelete} onClick={() => { setFormError(''); setConfirmation({ target: selected.user, action: 'delete' }) }}>Xóa tài khoản</Button>
      </div>}
    </Dialog>
    <Dialog open={editing !== null} title={editing === 'new' ? 'Thêm người dùng' : 'Sửa hồ sơ người dùng'} onClose={() => { if (!busy) setEditing(null) }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Hủy</Button><Button type="submit" form="admin-user-form" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu tài khoản'}</Button></>}>
      <form id="admin-user-form" className="admin-form" onSubmit={event => void save(event)}><Input id="admin-user-name" label="Họ tên" value={form.name} required maxLength={100} onChange={e => setForm({ ...form, name: e.target.value })} /><Input id="admin-user-email" label="Email" type="email" value={form.email} required maxLength={150} onChange={e => setForm({ ...form, email: e.target.value })} /><Input id="admin-user-position" label="Vị trí" value={form.position} maxLength={100} onChange={e => setForm({ ...form, position: e.target.value })} />{editing === 'new' && <><Input id="admin-user-password" label="Mật khẩu ban đầu" type="password" autoComplete="new-password" value={form.password} required minLength={8} maxLength={128} onChange={e => setForm({ ...form, password: e.target.value })} /><Select id="admin-user-role" label="Quyền hệ thống" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'USER' | 'ADMIN' })} options={[{ value: 'USER', label: 'USER' }, { value: 'ADMIN', label: 'ADMIN' }]} /></>}<Feedback error={formError} /></form>
    </Dialog>
    <Dialog open={confirmation !== null} title={confirmation?.action === 'delete' ? 'Xóa tài khoản?' : confirmation?.action === 'role' ? 'Thay đổi quyền hệ thống?' : confirmation?.target.active ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'} onClose={() => { if (!busy) setConfirmation(null) }} actions={<><Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Hủy</Button><Button variant={confirmation?.action === 'delete' ? 'danger' : 'primary'} disabled={busy} onClick={() => void confirm()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button></>}>
      <p><strong>{confirmation?.target.name}</strong> · {confirmation?.target.email}</p><p>{confirmation?.action === 'role' ? `Quyền mới: ${confirmation.role}. Các request sau đó sẽ áp dụng quyền mới.` : confirmation?.action === 'delete' ? 'Tài khoản sẽ bị xóa vĩnh viễn. Hệ thống kiểm tra dữ liệu liên quan trước khi xóa.' : confirmation?.target.active ? 'Tài khoản sẽ không thể đăng nhập hoặc tiếp tục dùng phiên hiện tại. Dữ liệu công việc được giữ lại.' : 'Tài khoản có thể truy cập trở lại.'}</p><Feedback error={formError} />
    </Dialog>
  </>
}

function Projects() {
  const { query, setQuery, term } = useSearch()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState<AdminPageResult<AdminProject> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [transfer, setTransfer] = useState<AdminProject | null>(null)
  useEffect(() => { setPage(0) }, [term, status])
  useEffect(() => {
    let live = true; setLoading(true); setError('')
    adminApi.projects(term, status, page, size).then(result => { if (live) { if (page > 0 && page >= result.totalPages) setPage(Math.max(0, result.totalPages - 1)); else setData(result) } }).catch(e => { if (live) setError(message(e)) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [term, status, page, size, revision])
  return <><div className="admin-heading"><div><p>GIÁM SÁT DỰ ÁN</p><h1>Dự án toàn hệ thống</h1><span>Xem tình trạng và nguồn lực. Quyền Admin không thay thế vai trò trong dự án.</span></div></div>
    <div className="admin-filters"><Input id="admin-project-search" label="Tìm dự án" placeholder="Tên dự án hoặc Owner" value={query} maxLength={150} onChange={e => setQuery(e.target.value)} /><Select id="admin-project-status" label="Trạng thái" value={status} onChange={e => setStatus(e.target.value)} options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'in_progress', label: 'Đang thực hiện' }, { value: 'completed', label: 'Hoàn tất' }, { value: 'cancelled', label: 'Đã hủy' }]} /></div>
    <Feedback error={error} retry={() => setRevision(v => v + 1)} />{loading && <p role="status">Đang tải dự án…</p>}
    <div className="admin-table-wrap" aria-busy={loading}><table className="admin-table"><caption className="sr-only">Dự án toàn hệ thống</caption><thead><tr><th>Dự án</th><th>Owner</th><th>Thành viên</th><th>Tiến độ task</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data?.content.map(project => <tr key={project.id}><td><strong>{project.name}</strong><small>{formatDate(project.startDate ?? '')} — {formatDate(project.endDate ?? '')}</small></td><td>{project.ownerName}</td><td>{project.memberCount}</td><td><div className="admin-progress"><progress max={Math.max(1, project.actionableTasks)} value={project.completedTasks} aria-label={`Tiến độ ${project.name}`} /><small>{project.completedTasks}/{project.actionableTasks} hoàn tất · {project.taskCount} task</small></div></td><td>{statusName[project.status] ?? project.status}</td><td><div className="admin-detail-actions"><Button size="sm" variant="secondary" onClick={() => setSelected(project.id)}>Xem chi tiết</Button><Button size="sm" variant="ghost" onClick={() => setTransfer(project)}>{'Chuy\u1ec3n Owner'}</Button></div></td></tr>)}</tbody></table>{!loading && !error && !data?.content.length && <p className="admin-empty">Không tìm thấy dự án phù hợp.</p>}</div>
    <Pager data={data} page={page} onPage={setPage} loading={loading} size={size} onSize={value => { setSize(value); setPage(0) }} /><ProjectPreview id={selected} onClose={() => setSelected(null)} /><TransferOwnerDialog project={transfer} onClose={() => setTransfer(null)} onTransferred={() => { setTransfer(null); setRevision(v => v + 1) }} />
  </>
}

function ProjectPreview({ id, onClose }: { id: number | null; onClose: () => void }) {
  const [data, setData] = useState<{ project: ProjectResponse; members: ProjectMember[]; groups: ProjectGroup[]; tasks: TaskResponse[] } | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (id === null) return
    let live = true; setData(null); setError('')
    Promise.all([projectsApi.getById(id), projectMembersApi.getByProject(id), groupsApi.getByProject(id), tasksApi.getByProject(id)])
      .then(([project, members, groups, tasks]) => { if (live) setData({ project, members, groups, tasks }) }).catch(e => { if (live) setError(e instanceof ApiError && e.status === 403 ? 'Không có quyền xem dự án này.' : message(e)) })
    return () => { live = false }
  }, [id, revision])
  return <Dialog open={id !== null} title={data?.project.name ?? 'Chi tiết dự án'} onClose={onClose} actions={<Button variant="secondary" onClick={onClose}>Đóng</Button>}>
    <Feedback error={error} retry={() => setRevision(v => v + 1)} />{!data && !error && <p role="status">Đang tải dự án…</p>}
    {data && <div className="admin-project-preview"><p className="admin-info">Chế độ giám sát · chỉ đọc</p><p>{data.project.description || 'Chưa có mô tả.'}</p><p>Owner: <strong>{data.project.owner.name}</strong> · {statusName[data.project.status] ?? data.project.status}</p><p>{formatDate(data.project.startDate ?? '')} — {formatDate(data.project.endDate ?? '')}</p>
      <h3>Thành viên ({data.members.length})</h3><ul>{data.members.map(person => <li key={person.userId}>{person.userName} <span>· {person.roleName}</span></li>)}</ul>
      <h3>Nhóm ({data.groups.length})</h3><ul>{data.groups.map(group => <li key={group.id}>{group.name}</li>)}</ul>{!data.groups.length && <p>Chưa có nhóm.</p>}
      <h3>Công việc ({data.tasks.length})</h3><ul className="admin-task-list">{data.tasks.map(task => <li key={task.id}><div><strong>{task.title}</strong><small>{formatDate(task.startDate ?? '')} — {formatDate(task.endDate ?? '')} · {task.assignees?.map(person => person.userName).join(', ') || 'Chưa phân công'}</small></div><StatusBadge tone={taskTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge></li>)}</ul>{!data.tasks.length && <p>Chưa có task.</p>}
    </div>}
  </Dialog>
}
