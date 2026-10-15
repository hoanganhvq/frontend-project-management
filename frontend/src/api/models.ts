import type { ProjectStatus, TaskPriority, TaskStatus } from '../types/domain'

// Request and response fields mirror the existing Spring DTOs. Dates use ISO date strings.
export type ProjectRequest = { name: string; description: string; startDate: string | null; endDate: string | null; ownerId: number }
export type ProjectUpdateRequest = { name: string; description: string; startDate: string | null; endDate: string | null; status: ProjectStatus }
export type UserResponse = { id: number; name: string; email: string; position: string | null; role: string; photo: string | null }
export type ProjectResponse = { id: number; name: string; description: string | null; startDate: string | null; endDate: string | null; owner: UserResponse; status: string; createdAt: string }
export type ProjectMember = { id: number; projectName: string; projectId: number; userId: number; userName: string; roleId: number; roleName: string; joinedAt: string }
export type ProjectMemberRequest = { projectId: number; userId: number; roleId: number; groupId?: number | null }
export type ProjectMemberRoleUpdate = { roleId: number }
export type RoleResponse = { id: number; name: string; description: string | null }
export type GroupResponse = { id: number; projectId: number; projectName: string; name: string; description: string | null; createdAt: string }
export type GroupRequest = { projectId: number; name: string; description: string }
export type TaskAssignee = { id: number; taskId: number; taskTitle: string; userId: number; userName: string; userEmail: string; assignedAt: string }

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
