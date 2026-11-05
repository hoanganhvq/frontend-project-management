import { apiRequest } from './client'

export type ChatResponse = { answer: string; relatedTaskIds: string[]; relatedProjectIds: string[] }
export const chatApi = {
  send: (message: string, projectId: number | null, previousQuestions: string[]) => apiRequest<ChatResponse>('/api/chat/messages', {
    method: 'POST', body: JSON.stringify({ message, projectId, previousQuestions }),
  }),
}
import type { AppNotification, NotificationPageResponse } from './models'

export const notificationsApi = {
  list: (page = 0, size = 20, unreadOnly = false) => apiRequest<NotificationPageResponse>(`/api/notifications?page=${page}&size=${size}&unreadOnly=${unreadOnly}`, { cache: 'no-store' }),
  markRead: (id: number) => apiRequest<AppNotification>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest<void>('/api/notifications/read-all', { method: 'PATCH' }),
}
import type { AiScheduleMember, AiScheduleResponse, AiScheduleSummary, ApproveScheduleRequest, ApproveScheduleResponse, GenerateAiScheduleResponse, GroupMember, LoginRequest, ProjectGroup, ProjectGroupRequest, ProjectMember, ProjectMemberCandidate, ProjectMemberMutation, ProjectMemberProject, ProjectMemberRoleUpdate, ProjectRequest, ProjectResponse, ProjectUpdateRequest, RegisterRequest, RejectScheduleRequest, RejectScheduleResponse, SavePendingScheduleRequest, SavePendingScheduleResponse, TaskAssignee, TaskDependency, TaskRequest, TaskResponse, TaskScheduleBatchUpdateRequest, TaskUpdateRequest, UpdatePendingScheduleRequest, UserResponse, UserUpdateRequest } from './models'

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
  skillCatalog: () => apiRequest<Array<{ id: number; name: string; category: string | null }>>('/api/skills', { cache: 'no-store' }),
  mySkills: () => apiRequest<import('./models').MemberSkill[]>('/api/users/me/skills', { cache: 'no-store' }),
  saveMySkills: (skills: Array<{ skillId: number; level: string }>) => apiRequest<import('./models').MemberSkill[]>('/api/users/me/skills', { method: 'PUT', body: JSON.stringify({ skills }) }),
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
  generateFromPdf: async (file: File, _leaderId: number, assignmentMode?: 'AUTO', signal?: AbortSignal): Promise<GenerateAiScheduleResponse> => {
    const body = new FormData()
    body.set('file', file)
    if (assignmentMode === 'AUTO') body.set('assignmentMode', assignmentMode)
    type Job = import('./models').AiGenerationJob
    let job = await apiRequest<Job>('/api/ai-jobs', { method: 'POST', body, signal })
    const deadline = Date.now() + 90 * 60 * 1000
    while (job.status === 'QUEUED' || job.status === 'RUNNING') {
      if (Date.now() > deadline) throw new Error(`Tracking timed out for job ${job.id}. Check pending drafts before submitting again.`)
      await new Promise(resolve => window.setTimeout(resolve, 3000))
      job = await apiRequest<Job>(`/api/ai-jobs/${job.id}`, { cache: 'no-store', signal })
    }
    if (job.status !== 'SUCCEEDED' || !job.scheduleId) throw new Error(`${job.message || 'The workflow did not confirm a saved draft.'} (Job: ${job.id})`)
    return { success: true, action: 'pending', scheduleId: job.scheduleId, message: job.message ?? undefined }
  },
  savePending: (body: SavePendingScheduleRequest) => apiRequest<SavePendingScheduleResponse>('/api/ai-schedules/pending', { method: 'POST', body: JSON.stringify(body) }),
  approve: (body: ApproveScheduleRequest) => apiRequest<ApproveScheduleResponse>('/api/ai-schedules/approve', { method: 'POST', body: JSON.stringify(body) }),
  reject: (body: RejectScheduleRequest) => apiRequest<RejectScheduleResponse>('/api/ai-schedules/reject', { method: 'POST', body: JSON.stringify(body) }),
}
