import { apiRequest } from '../../api/client'

export type AdminUser = { id: number; name: string; email: string; position: string | null; photo: string | null; role: 'USER' | 'ADMIN'; active: boolean; createdAt: string }
export type AdminUserDetail = { user: AdminUser; relatedData: Record<string, number>; canDelete: boolean; deleteBlockedReason: string | null }
export type AdminProject = { id: number; name: string; ownerId: number; ownerName: string; status: string; startDate: string | null; endDate: string | null; memberCount: number; taskCount: number; completedTasks: number; actionableTasks: number }
export type AdminPageResult<T> = { content: T[]; totalElements: number; totalPages: number; page: number; size: number }
export type AdminOverview = { users: number; activeUsers: number; admins: number; projects: number; tasks: number; projectStatuses: Record<string, number>; taskStatuses: Record<string, number> }
export type AdminUserInput = { name: string; email: string; position: string; password: string; role: 'USER' | 'ADMIN' }
export type AuditRow = { id: number; actorId: number; actorName: string | null; targetUserId: number | null; targetName: string | null; projectId: number | null; projectName: string | null; previousOwnerId: number | null; action: string; reason: string | null; createdAt: string }

export const adminApi = {
  job: (id: string) => apiRequest<import('../../api/models').AiGenerationJob>(`/api/admin/ai-jobs/${encodeURIComponent(id)}`, { cache: 'no-store' }),
  reconcileJob: (id: string) => apiRequest<import('../../api/models').AiGenerationJob>(`/api/admin/ai-jobs/${encodeURIComponent(id)}/reconcile`, { method: 'POST' }),
  audits: (query: string, action: string, from: string, to: string, page: number, size = 20) => {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) })
    if (action) params.set('action', action)
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString())
    if (to) { const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1); params.set('to', end.toISOString()) }
    return apiRequest<AdminPageResult<AuditRow>>(`/api/admin/audit-logs?${params}`, { cache: 'no-store' })
  },
  jobs: (query: string, status: string, page: number, size = 20) => {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) })
    if (status) params.set('status', status)
    return apiRequest<AdminPageResult<import('../../api/models').AiGenerationJob>>(`/api/admin/ai-jobs?${params}`, { cache: 'no-store' })
  },
  ownerCandidates: (projectId: number, query: string, page: number, size = 20) => apiRequest<AdminPageResult<AdminUser>>(`/api/admin/projects/${projectId}/owner-candidates?${new URLSearchParams({ query, page: String(page), size: String(size) })}`, { cache: 'no-store' }),
  transferOwner: (projectId: number, newOwnerId: number, expectedOwnerId: number, reason: string) => apiRequest(`/api/admin/projects/${projectId}/owner`, { method: 'POST', body: JSON.stringify({ newOwnerId, expectedOwnerId, reason }) }),
  overview: () => apiRequest<AdminOverview>('/api/admin/overview', { cache: 'no-store' }),
  users: (query: string, role: string, active: string, page: number, size = 20) => {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) })
    if (role) params.set('role', role)
    if (active) params.set('active', active)
    return apiRequest<AdminPageResult<AdminUser>>(`/api/admin/users?${params}`, { cache: 'no-store' })
  },
  detail: (id: number) => apiRequest<AdminUserDetail>(`/api/admin/users/${id}`, { cache: 'no-store' }),
  create: (body: AdminUserInput) => apiRequest<AdminUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  edit: (id: number, body: Pick<AdminUserInput, 'name' | 'email' | 'position'>) => apiRequest<AdminUser>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  role: (id: number, role: string) => apiRequest<AdminUser>(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  active: (id: number, active: boolean) => apiRequest<AdminUser>(`/api/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  remove: (id: number) => apiRequest<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  projects: (query: string, status: string, page: number, size = 20) => {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) })
    if (status) params.set('status', status)
    return apiRequest<AdminPageResult<AdminProject>>(`/api/admin/projects?${params}`, { cache: 'no-store' })
  },
}
