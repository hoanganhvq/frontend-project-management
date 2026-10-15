import { apiRequest } from './client'
import type { ApproveScheduleRequest, ApproveScheduleResponse, GroupRequest, GroupResponse, LoginRequest, ProjectMember, ProjectMemberRequest, ProjectMemberRoleUpdate, ProjectRequest, ProjectResponse, ProjectUpdateRequest, RegisterRequest, RejectScheduleRequest, RejectScheduleResponse, RoleResponse, SavePendingScheduleRequest, SavePendingScheduleResponse, TaskAssignee, TaskRequest, TaskResponse, TaskUpdateRequest, UserResponse } from './models'

export const authApi = {
  login: (body: LoginRequest) => apiRequest<string>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterRequest) => apiRequest<string>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: <T>() => apiRequest<T>('/api/auth/me'),
  logout: () => apiRequest<unknown>('/api/auth/logout'),
}

export const projectsApi = {
  getAll: () => apiRequest<ProjectResponse[]>('/api/projects'),
  create: (body: ProjectRequest) => apiRequest<ProjectResponse>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  getById: (id: number) => apiRequest<ProjectResponse>(`/api/projects/${id}`),
  update: (id: number, body: ProjectUpdateRequest) => apiRequest<ProjectResponse>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => apiRequest<ProjectResponse>(`/api/projects/${id}`, { method: 'DELETE' }),
}

export const projectMembersApi = {
  getByProject: (projectId: number) => apiRequest<ProjectMember[]>(`/api/projectmembers/project/${projectId}`),
  add: (body: ProjectMemberRequest) => apiRequest<ProjectMember>('/api/projectmembers', { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (memberId: number, body: ProjectMemberRoleUpdate) => apiRequest<ProjectMember>(`/api/projectmembers/${memberId}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (memberId: number) => apiRequest<void>(`/api/projectmembers/${memberId}`, { method: 'DELETE' }),
}

export const groupsApi = {
  getByProject: (projectId: number) => apiRequest<GroupResponse[]>(`/api/group/by-project/${projectId}`),
  create: (body: GroupRequest) => apiRequest<GroupResponse>('/api/group', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: GroupRequest) => apiRequest<GroupResponse>(`/api/group/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => apiRequest<GroupResponse>(`/api/group/${id}`, { method: 'DELETE' }),
}

export const rolesApi = {
  getAll: () => apiRequest<RoleResponse[]>('/api/roles'),
}

export const usersApi = {
  search: (keyword: string) => apiRequest<UserResponse[]>(`/api/users/search?keyword=${encodeURIComponent(keyword)}`),
}

export const tasksApi = {
  create: (body: TaskRequest) => apiRequest<TaskResponse>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: TaskUpdateRequest) => apiRequest<TaskResponse>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getById: (id: number) => apiRequest<TaskResponse>(`/api/tasks/${id}`),
  getByProject: (projectId: number) => apiRequest<TaskResponse[]>(`/api/tasks/project/${projectId}`),
  delete: (id: number) => apiRequest<string>(`/api/tasks/${id}`, { method: 'DELETE' }),
  getAssignees: (taskId: number) => apiRequest<TaskAssignee[]>(`/api/tasks/${taskId}/assignees`),
  assign: (taskId: number, userId: number) => apiRequest<TaskAssignee>(`/api/tasks/assignments?taskId=${taskId}&userId=${userId}`, { method: 'POST' }),
  unassign: (taskId: number, userId: number) => apiRequest<TaskAssignee>(`/api/tasks/assignments?taskId=${taskId}&userId=${userId}`, { method: 'DELETE' }),
}

export const aiSchedulesApi = {
  savePending: (body: SavePendingScheduleRequest) => apiRequest<SavePendingScheduleResponse>('/api/ai-schedules/pending', { method: 'POST', body: JSON.stringify(body) }),
  approve: (body: ApproveScheduleRequest) => apiRequest<ApproveScheduleResponse>('/api/ai-schedules/approve', { method: 'POST', body: JSON.stringify(body) }),
  reject: (body: RejectScheduleRequest) => apiRequest<RejectScheduleResponse>('/api/ai-schedules/reject', { method: 'POST', body: JSON.stringify(body) }),
  // There is no generation endpoint or pending-schedule retrieval endpoint.
}
