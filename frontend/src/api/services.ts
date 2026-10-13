import { apiRequest } from './client'
import type { ApproveScheduleRequest, ApproveScheduleResponse, LoginRequest, ProjectMember, ProjectMemberCandidate, ProjectMemberMutation, ProjectMemberProject, ProjectMemberRoleUpdate, ProjectRequest, ProjectResponse, ProjectUpdateRequest, RegisterRequest, RejectScheduleRequest, RejectScheduleResponse, SavePendingScheduleRequest, SavePendingScheduleResponse, TaskRequest, TaskResponse, TaskUpdateRequest } from './models'

export const authApi = {
  login: (body: LoginRequest) => apiRequest<string>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterRequest) => apiRequest<string>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: <T>() => apiRequest<T>('/api/auth/me'),
  logout: () => apiRequest<unknown>('/api/auth/logout'),
}

export const projectsApi = {
  create: (body: ProjectRequest) => apiRequest<ProjectResponse>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  getById: (id: number) => apiRequest<ProjectResponse>(`/api/projects/${id}`),
  update: (id: number, body: ProjectUpdateRequest) => apiRequest<ProjectResponse>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => apiRequest<ProjectResponse>(`/api/projects/${id}`, { method: 'DELETE' }),
  // The current backend has no project collection/list endpoint.
}

export const projectMembersApi = {
  getVisibleProjects: () => apiRequest<ProjectMemberProject[]>('/api/projects/mine/memberships'),
  getByProject: (projectId: number) => apiRequest<ProjectMember[]>(`/api/projects/${projectId}/members`),
  searchCandidates: (projectId: number, search: string) => apiRequest<ProjectMemberCandidate[]>(`/api/projects/${projectId}/member-candidates?search=${encodeURIComponent(search)}`),
  add: (projectId: number, body: ProjectMemberMutation) => apiRequest<ProjectMember>(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (projectId: number, memberId: number, body: ProjectMemberRoleUpdate) => apiRequest<ProjectMember>(`/api/projects/${projectId}/members/${memberId}/role`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (projectId: number, memberId: number) => apiRequest<void>(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),
}

export const tasksApi = {
  create: (body: TaskRequest) => apiRequest<TaskResponse>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: TaskUpdateRequest) => apiRequest<TaskResponse>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getById: (id: number) => apiRequest<TaskResponse>(`/api/tasks/${id}`),
  getByProject: (projectId: number) => apiRequest<TaskResponse[]>(`/api/tasks/project/${projectId}`),
  delete: (id: number) => apiRequest<string>(`/api/tasks/${id}`, { method: 'DELETE' }),
}

export const aiSchedulesApi = {
  savePending: (body: SavePendingScheduleRequest) => apiRequest<SavePendingScheduleResponse>('/api/ai-schedules/pending', { method: 'POST', body: JSON.stringify(body) }),
  approve: (body: ApproveScheduleRequest) => apiRequest<ApproveScheduleResponse>('/api/ai-schedules/approve', { method: 'POST', body: JSON.stringify(body) }),
  reject: (body: RejectScheduleRequest) => apiRequest<RejectScheduleResponse>('/api/ai-schedules/reject', { method: 'POST', body: JSON.stringify(body) }),
  // There is no generation endpoint or pending-schedule retrieval endpoint.
}
