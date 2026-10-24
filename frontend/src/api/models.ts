import type { ProjectStatus, TaskPriority, TaskStatus } from '../types/domain'

// Request and response fields mirror the existing Spring DTOs. Dates use ISO date strings.
export type ProjectRequest = { name: string; description: string; startDate: string | null; endDate: string | null; ownerId: number }
export type ProjectUpdateRequest = { name: string; description: string; startDate: string | null; endDate: string | null; status: ProjectStatus }
export type UserResponse = { id: number; name: string; email: string; position: string | null; role: string; photo: string | null }
export type UserUpdateRequest = { name?: string; email?: string; position?: string | null }
export type ProjectResponse = { id: number; name: string; description: string | null; startDate: string | null; endDate: string | null; owner: UserResponse; status: string; createdAt: string }
export type ProjectMemberProject = { id: number; name: string; ownerId: number; ownerName: string; canManageMembers: boolean; canAssignLeader: boolean }
export type ProjectMember = { id: number | null; projectName: string; projectId: number; userId: number; userName: string; email: string; photo: string | null; position: string | null; roleId: number | null; roleName: 'OWNER' | 'LEADER' | 'MEMBER'; joinedAt: string | null; projectOwner: boolean }
export type ProjectMemberCandidate = { id: number; name: string; email: string; position: string | null; photo: string | null }
export type ProjectMemberMutation = { userId: number; roleName: 'LEADER' | 'MEMBER' }
export type ProjectMemberRoleUpdate = { roleName: 'LEADER' | 'MEMBER' }
export type ProjectGroup = { id: number; projectId: number; projectName: string; name: string; description: string | null; createdAt: string }
export type GroupMember = { id: number; groupId: number; groupName: string; memberId: number; memberName: string; memberEmail: string; joinedAt: string }
export type ProjectGroupRequest = { projectId: number; name: string; description: string }
export type TaskAssignee = { id: number; taskId: number; taskTitle: string; userId: number; userName: string; userEmail: string; assignedAt: string }
export type TaskDependency = { id: number; taskId: number; taskTitle: string; dependsOnTaskId: number; dependsOnTaskTitle: string }

export type TaskRequest = { projectId: number; groupId: number | null; parentTaskId: number | null; title: string; description: string; startDate: string | null; endDate: string | null; progress: number; priority: TaskPriority; status: TaskStatus; createdById: number }
export type TaskUpdateRequest = Omit<TaskRequest, 'projectId' | 'createdById'>
export type TaskResponse = { id: number; projectId: number; groupId: number | null; parentTaskId: number | null; parentTaskTitle: string | null; title: string; description: string; startDate: string | null; endDate: string | null; progress: number; priority: TaskPriority; status: TaskStatus; createdById: number; createdByName: string; createdAt: string }

export type LoginRequest = { email: string; password: string }
export type RegisterRequest = { name: string; email: string; password: string }

export type SavePendingScheduleRequest = { leaderId: number; sessionId: string; scheduleData: Record<string, unknown> }
export type SavePendingScheduleResponse = { scheduleId: number }
export type UpdatePendingScheduleRequest = { scheduleData: Record<string, unknown> }
export type N8nScheduleChatRequest = { action: 'chat'; message: string; leaderId: number; scheduleId: number }
export type N8nScheduleChatResponse = { success?: boolean; action?: string; message?: string; [key: string]: unknown }
export type AiScheduleMember = { id: number; name: string; position: string | null }
export type AiScheduleTaskPreview = { title: string; description?: string; priority?: string; startDate?: string; endDate?: string; parentTitle?: string | null; groupTempId?: string; assigneeIds?: number[]; dependsOnTitles?: string[] }
export type AiScheduleResponse = {
  id: number
  status: string
  sessionId: string | null
  createdAt: string
  scheduleData: {
    project?: { name?: string; description?: string; startDate?: string; endDate?: string }
    newGroups?: Array<{ tempId: string; name: string; memberIds?: number[] }>
    tasks?: AiScheduleTaskPreview[]
    summary?: { totalTasks?: number; totalGroups?: number; estimatedStart?: string; estimatedEnd?: string; totalSubTasks?: number; totalParentTasks?: number; employeesInvolved?: number[] }
    aiNote?: string
  }
}
export type AiScheduleSummary = { id: number; status: string; sessionId: string | null; createdAt: string; projectName: string; totalGroups: number; totalTasks: number }
export type ApproveScheduleRequest = { scheduleId: number; leaderId: number }
export type ApproveScheduleResponse = { success: boolean; projectId: number; totalTasksInserted: number; message: string }
export type RejectScheduleRequest = { scheduleId: number; reason: string }
export type RejectScheduleResponse = { success: boolean; message: string }
export type GenerateAiScheduleResponse = { success: boolean; action: string; message?: string; scheduleId?: number }
