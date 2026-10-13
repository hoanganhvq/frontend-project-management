import type { ProjectStatus, TaskPriority, TaskStatus } from '../types/domain'

// Request and response fields mirror the existing Spring DTOs. Dates use ISO date strings.
export type ProjectRequest = { name: string; description: string; startDate: string | null; endDate: string | null; ownerId: number }
export type ProjectUpdateRequest = { name: string; description: string; startDate: string | null; endDate: string | null; status: ProjectStatus }
export type ProjectResponse = { id: number; name: string; description: string; startDate: string | null; endDate: string | null; owner: unknown; status: ProjectStatus; createdAt: string }
export type ProjectMemberProject = { id: number; name: string; ownerId: number; ownerName: string; canManageMembers: boolean; canAssignLeader: boolean }
export type ProjectMember = { id: number | null; projectName: string; projectId: number; userId: number; userName: string; email: string; photo: string | null; position: string | null; roleId: number | null; roleName: 'OWNER' | 'LEADER' | 'MEMBER'; joinedAt: string | null; projectOwner: boolean }
export type ProjectMemberCandidate = { id: number; name: string; email: string; position: string | null; photo: string | null }
export type ProjectMemberMutation = { userId: number; roleName: 'LEADER' | 'MEMBER' }
export type ProjectMemberRoleUpdate = { roleName: 'LEADER' | 'MEMBER' }

export type TaskRequest = { projectId: number; groupId: number | null; parentTaskId: number | null; title: string; description: string; startDate: string | null; endDate: string | null; progress: number; priority: TaskPriority; status: TaskStatus; createdById: number }
export type TaskUpdateRequest = Omit<TaskRequest, 'projectId' | 'createdById'>
export type TaskResponse = { id: number; projectId: number; groupId: number | null; parentTaskId: number | null; parentTaskTitle: string | null; title: string; description: string; startDate: string | null; endDate: string | null; progress: number; priority: TaskPriority; status: TaskStatus; createdById: number; createdByName: string; createdAt: string }

export type LoginRequest = { email: string; password: string }
export type RegisterRequest = { name: string; email: string; password: string }

export type SavePendingScheduleRequest = { leaderId: number; sessionId: string; scheduleData: Record<string, unknown> }
export type SavePendingScheduleResponse = { scheduleId: number }
export type ApproveScheduleRequest = { scheduleId: number; leaderId: number }
export type ApproveScheduleResponse = { success: boolean; projectId: number; totalTasksInserted: number; message: string }
export type RejectScheduleRequest = { scheduleId: number; reason: string }
export type RejectScheduleResponse = { success: boolean; message: string }
