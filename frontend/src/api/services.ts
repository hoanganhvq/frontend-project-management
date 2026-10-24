import { apiRequest } from './client'
import type { ApproveScheduleRequest, ApproveScheduleResponse, GroupMember, LoginRequest, ProjectGroup, ProjectGroupRequest, ProjectMember, ProjectMemberCandidate, ProjectMemberMutation, ProjectMemberProject, ProjectMemberRoleUpdate, ProjectRequest, ProjectResponse, ProjectUpdateRequest, RegisterRequest, RejectScheduleRequest, RejectScheduleResponse, SavePendingScheduleRequest, SavePendingScheduleResponse, TaskRequest, TaskResponse, TaskUpdateRequest } from './models'

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
  getVisibleProjects: () => apiRequest<ProjectMemberProject[]>('/api/projectmembers/projects'),
  getByProject: (projectId: number) => apiRequest<ProjectMember[]>(`/api/projectmembers/project/${projectId}`),
  searchCandidates: (projectId: number, search: string) => apiRequest<ProjectMemberCandidate[]>(`/api/projectmembers/candidates?projectId=${projectId}&search=${encodeURIComponent(search)}`),
  add: (projectId: number, body: ProjectMemberMutation) => apiRequest<ProjectMember>('/api/projectmembers', { method: 'POST', body: JSON.stringify({ ...body, projectId }) }),
  updateRole: (_projectId: number, memberId: number, body: ProjectMemberRoleUpdate) => apiRequest<ProjectMember>(`/api/projectmembers/${memberId}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (_projectId: number, memberId: number) => apiRequest<void>(`/api/projectmembers/${memberId}`, { method: 'DELETE' }),
}

export const groupsApi = {
  getByProject: (projectId: number) => apiRequest<ProjectGroup[]>(`/api/group/project/${projectId}`),
  create: (body: ProjectGroupRequest) => apiRequest<ProjectGroup>('/api/group', { method: 'POST', body: JSON.stringify(body) }),
  update: (groupId: number, body: ProjectGroupRequest) => apiRequest<ProjectGroup>(`/api/group/${groupId}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (groupId: number) => apiRequest<ProjectGroup>(`/api/group/${groupId}`, { method: 'DELETE' }),
}

export const groupMembersApi = {
  getByGroup: (groupId: number) => apiRequest<GroupMember[]>(`/api/groupmember/group/${groupId}`),
  add: (groupId: number, userId: number) => apiRequest<GroupMember>('/api/groupmember', { method: 'POST', body: JSON.stringify({ groupId, userId }) }),
  remove: (groupId: number, userId: number) => apiRequest<GroupMember>(`/api/groupmember?groupId=${groupId}&userId=${userId}`, { method: 'DELETE' }),
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
