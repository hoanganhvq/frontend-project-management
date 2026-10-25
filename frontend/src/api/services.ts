import { ApiError, apiRequest } from './client'
import type { AiScheduleMember, AiScheduleResponse, AiScheduleSummary, ApproveScheduleRequest, ApproveScheduleResponse, GenerateAiScheduleResponse, GroupMember, LoginRequest, N8nScheduleChatRequest, N8nScheduleChatResponse, ProjectGroup, ProjectGroupRequest, ProjectMember, ProjectMemberCandidate, ProjectMemberMutation, ProjectMemberProject, ProjectMemberRoleUpdate, ProjectRequest, ProjectResponse, ProjectUpdateRequest, RegisterRequest, RejectScheduleRequest, RejectScheduleResponse, SavePendingScheduleRequest, SavePendingScheduleResponse, TaskAssignee, TaskDependency, TaskRequest, TaskResponse, TaskScheduleBatchUpdateRequest, TaskUpdateRequest, UpdatePendingScheduleRequest, UserResponse, UserUpdateRequest } from './models'

export const authApi = {
  login: (body: LoginRequest) => apiRequest<string>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterRequest) => apiRequest<string>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  requestPasswordReset: (email: string) => apiRequest<unknown>('/api/auth/forgotPassword', { method: 'POST', body: JSON.stringify({ email }) }),
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

export const usersApi = {
  search: (keyword: string) => apiRequest<UserResponse[]>(`/api/users/search?keyword=${encodeURIComponent(keyword)}`),
  update: (id: number, body: UserUpdateRequest) => apiRequest<UserResponse>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (id: number, file: File) => {
    const body = new FormData()
    body.set('file', file)
    return apiRequest<UserResponse>(`/api/users/${id}/avatar`, { method: 'PUT', body })
  },
}

export const tasksApi = {
  create: (body: TaskRequest) => apiRequest<TaskResponse>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: TaskUpdateRequest) => apiRequest<TaskResponse>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateSchedules: (body: TaskScheduleBatchUpdateRequest) => apiRequest<TaskResponse[]>('/api/tasks/schedule', { method: 'PUT', body: JSON.stringify(body) }),
  getById: (id: number) => apiRequest<TaskResponse>(`/api/tasks/${id}`),
  getByProject: (projectId: number) => apiRequest<TaskResponse[]>(`/api/tasks/project/${projectId}`),
  delete: (id: number) => apiRequest<string>(`/api/tasks/${id}`, { method: 'DELETE' }),
  getAssignees: (taskId: number) => apiRequest<TaskAssignee[]>(`/api/tasks/${taskId}/assignees`),
  assign: (taskId: number, userId: number) => apiRequest<TaskAssignee>(`/api/tasks/assignments?taskId=${taskId}&userId=${userId}`, { method: 'POST' }),
  unassign: (taskId: number, userId: number) => apiRequest<TaskAssignee>(`/api/tasks/assignments?taskId=${taskId}&userId=${userId}`, { method: 'DELETE' }),
  getDependencies: (taskId: number) => apiRequest<TaskDependency[]>(`/api/tasks/${taskId}/dependencies`),
  getDependents: (taskId: number) => apiRequest<TaskDependency[]>(`/api/tasks/${taskId}/dependents`),
  addDependency: (taskId: number, dependsOnTaskId: number) => apiRequest<TaskDependency>(`/api/tasks/dependencies?taskId=${taskId}&dependsOnTaskId=${dependsOnTaskId}`, { method: 'POST' }),
  removeDependency: (taskId: number, dependsOnTaskId: number) => apiRequest<TaskDependency>(`/api/tasks/dependencies?taskId=${taskId}&dependsOnTaskId=${dependsOnTaskId}`, { method: 'DELETE' }),
}

export const aiSchedulesApi = {
  getLatestPending: () => apiRequest<AiScheduleResponse>('/api/ai-schedules'),
  getPending: () => apiRequest<AiScheduleSummary[]>('/api/ai-schedules/pending'),
  getPendingById: (scheduleId: number) => apiRequest<AiScheduleResponse>(`/api/ai-schedules/${scheduleId}`),
  updatePending: (scheduleId: number, body: UpdatePendingScheduleRequest) => apiRequest<SavePendingScheduleResponse>(`/api/ai-schedules/${scheduleId}`, { method: 'PUT', body: JSON.stringify(body) }),
  getAssignableMembers: (keyword = '') => apiRequest<AiScheduleMember[]>(`/api/ai-schedules/members?keyword=${encodeURIComponent(keyword)}`),
  sendChatAction: async (body: N8nScheduleChatRequest) => {
    let response: Response
    try {
      response = await fetch('/n8n/webhook-test/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw new ApiError('Could not reach the n8n webhook. Check that n8n is running and retry.', 0)
    }

    const responseText = await response.text()
    let payload: unknown
    try {
      payload = JSON.parse(responseText)
    } catch {
      if (!response.ok) throw new ApiError(`The n8n webhook request failed (${response.status}).`, response.status)
      if (!responseText.trim()) return { message: 'The request was sent to n8n.' }
      throw new ApiError('The n8n webhook returned invalid JSON.', response.status)
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError('The n8n webhook returned an unexpected response.', response.status)
    }
    const result = payload as N8nScheduleChatResponse
    if (!response.ok) throw new ApiError(result.message || `The n8n webhook request failed (${response.status}).`, response.status)
    if (result.success === false) throw new ApiError(result.message || 'n8n could not process this schedule action.', response.status)
    return result
  },
  generateFromPdf: async (file: File, leaderId: number, assignmentMode?: 'AUTO') => {
    const body = new FormData()
    body.set('file', file)
    body.set('leaderId', String(leaderId))
    if (assignmentMode === 'AUTO') body.set('assignmentMode', assignmentMode)

    let response: Response
    try {
      response = await fetch('http://localhost:5678/webhook-test/schedule', { method: 'POST', body })
    } catch {
      throw new ApiError('Could not reach the n8n webhook. Check that n8n is running and retry.', 0)
    }

    const responseText = await response.text()
    let payload: unknown
    try {
      payload = JSON.parse(responseText)
    } catch {
      const message = response.status === 404
        ? 'n8n returned 404. Start the webhook test listener in n8n, then submit the PDF again.'
        : response.ok ? 'The n8n webhook returned invalid JSON.' : `The n8n webhook request failed (${response.status}).`
      throw new ApiError(message, response.status)
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError('The n8n webhook returned an unexpected response.', response.status)
    }

    const result = payload as GenerateAiScheduleResponse
    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError('n8n returned 404. Start the webhook test listener in n8n, then submit the PDF again.', response.status)
      }
      throw new ApiError(result.message || `The n8n webhook request failed (${response.status}).`, response.status)
    }
    return result
  },
  savePending: (body: SavePendingScheduleRequest) => apiRequest<SavePendingScheduleResponse>('/api/ai-schedules/pending', { method: 'POST', body: JSON.stringify(body) }),
  approve: (body: ApproveScheduleRequest) => apiRequest<ApproveScheduleResponse>('/api/ai-schedules/approve', { method: 'POST', body: JSON.stringify(body) }),
  reject: (body: RejectScheduleRequest) => apiRequest<RejectScheduleResponse>('/api/ai-schedules/reject', { method: 'POST', body: JSON.stringify(body) }),
  // The Vite /n8n proxy forwards PDF uploads to localhost:5678 in development.
}
