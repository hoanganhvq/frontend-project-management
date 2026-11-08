import type { ProjectStatus, TaskPriority, TaskStatus, TaskPhase } from '../types/domain'

// Request and response fields mirror the existing Spring DTOs. Dates use ISO date strings.
export type ProjectRequest = { name: string; description: string; startDate: string | null; endDate: string | null; ownerId: number }
export type ProjectUpdateRequest = { name: string; description: string; startDate: string | null; endDate: string | null; status: ProjectStatus }
export type UserResponse = { id: number; name: string; email: string; position: string | null; role: string; photo: string | null }
export type UserUpdateRequest = { name?: string; email?: string; position?: string | null }
export type ProjectResponse = { id: number; name: string; description: string | null; startDate: string | null; endDate: string | null; owner: UserResponse; status: string; createdAt: string }
export type ProjectMemberProject = { id: number; name: string; ownerId: number; ownerName: string; canManageMembers: boolean; canAssignLeader: boolean; canEditSchedule: boolean }
export type MemberSkill = { skillId: number; name: string; category: string | null; level: string }
export type ProjectMember = { id: number | null; projectName: string; projectId: number; userId: number; userName: string; email: string; photo: string | null; position: string | null; roleId: number | null; roleName: 'OWNER' | 'LEADER' | 'MEMBER'; joinedAt: string | null; projectOwner: boolean; skills: MemberSkill[] }
export type ProjectMemberCandidate = { id: number; name: string; email: string; position: string | null; photo: string | null }
export type ProjectMemberMutation = { userId: number; roleName: 'LEADER' | 'MEMBER' }
export type ProjectMemberRoleUpdate = { roleName: 'LEADER' | 'MEMBER' }
export type ProjectGroup = { id: number; projectId: number; projectName: string; name: string; description: string | null; createdAt: string }
export type GroupMember = { id: number; groupId: number; groupName: string; memberId: number; memberName: string; memberEmail: string; joinedAt: string }
export type ProjectGroupRequest = { projectId: number; name: string; description: string }
export type TaskAssignee = { id: number; taskId: number; taskTitle: string; userId: number; userName: string; userEmail: string; assignedAt: string }
export type TaskDependency = { id: number; taskId: number; taskTitle: string; dependsOnTaskId: number; dependsOnTaskTitle: string }

export type TaskRequest = { phase?: TaskPhase | null; deliverable?: string | null; requirementIds?: string[]; projectId: number; groupId: number | null; parentTaskId: number | null; title: string; description: string; startDate: string | null; endDate: string | null; progress: number; priority: TaskPriority; status: TaskStatus; createdById: number }
export type TaskUpdateRequest = Omit<TaskRequest, 'projectId' | 'createdById'>
export type TaskScheduleUpdateRequest = { taskId: number; startDate: string; endDate: string }
export type TaskScheduleBatchUpdateRequest = { projectId: number; tasks: TaskScheduleUpdateRequest[] }
export type TaskResponse = { phase?: TaskPhase | null; deliverable?: string | null; requirementIds?: string[]; assignees?: import('../types/domain').TaskAssigneeSummary[]; id: number; projectId: number; groupId: number | null; parentTaskId: number | null; parentTaskTitle: string | null; title: string; description: string; startDate: string | null; endDate: string | null; progress: number; priority: TaskPriority; status: TaskStatus; createdById: number; createdByName: string; createdAt: string }

export type LoginRequest = { email: string; password: string }
export type RegisterRequest = { name: string; email: string; password: string }

export type SavePendingScheduleRequest = { leaderId: number; sessionId: string; scheduleData: Record<string, unknown> }
export type SavePendingScheduleResponse = { scheduleId: number }
export type UpdatePendingScheduleRequest = { scheduleData: Record<string, unknown> }
export type AiScheduleMember = { id: number; name: string; position: string | null }
export type AiScheduleTaskPreview = { estimatedDurationDays?: number; phase?: TaskPhase | null; deliverable?: string | null; requirementIds?: string[]; title: string; description?: string; priority?: string; startDate?: string; endDate?: string; parentTitle?: string | null; groupTempId?: string; assigneeIds?: number[]; dependsOnTitles?: string[] }
export type ScheduleValidationReport = { policyVersion: string; validationState: 'READY' | 'NEEDS_REVIEW'; issues: Array<{ code: string; message: string; path: string; taskTitle: string | null; requirementIds: string[]; severity: string; blocksApproval: boolean }> }
export type AiScheduleResponse = {
  id: number
  status: string
  sessionId: string | null
  createdAt: string
  validation?: ScheduleValidationReport | null
  scheduleData: {
    planningModel?: 'WATERFALL'
    planningPolicy?: 'WATERFALL_SIMPLE_V1'
    requirementIds?: string[]
    sourceRequirements?: Array<{ sourceRequirementId: string; title?: string; description?: string; type?: string }>
    repairNotes?: Array<{ taskTitle: string; reason: string }>
    planningDiagnostics?: {
      version: string
      repairAttempts: number
      reviewRequired: boolean
      generationIssues?: Array<{ code: string; message: string; taskTitle?: string; requirementIds?: string[] }>
      selectedCandidateAttempt?: number
      dateAdjustments: Array<{ taskTitle: string | null; startDate?: string | null; endDate?: string | null; newStartDate: string; newEndDate: string; reason: string }>
      semanticChanges: Array<{ taskTitle: string; fields: string[]; reason: string }>
    }
    project?: { name?: string; description?: string; startDate?: string; endDate?: string }
    newGroups?: Array<{ tempId: string; name: string; memberIds?: number[] }>
    tasks?: AiScheduleTaskPreview[]
    summary?: { totalTasks?: number; totalGroups?: number; estimatedStart?: string; estimatedEnd?: string; totalSubTasks?: number; totalParentTasks?: number; employeesInvolved?: number[] }
    aiNote?: string
    assignmentAdjustments?: Array<{ taskTitle: string; groupTempId: string; addedMemberIds: number[]; reason: string }>
  }
}
export type AiScheduleSummary = { id: number; status: string; sessionId: string | null; createdAt: string; projectName: string; totalGroups: number; totalTasks: number }
export type ApproveScheduleRequest = { scheduleId: number; leaderId: number }
export type ApproveScheduleResponse = { success: boolean; projectId: number; totalTasksInserted: number; message: string }
export type RejectScheduleRequest = { scheduleId: number; reason: string }
export type RejectScheduleResponse = { success: boolean; message: string }
export type GenerateAiScheduleResponse = { success: boolean; action: string; message?: string; scheduleId?: number }
export type AppNotification = {
  id: number
  type: 'PROJECT_MEMBER_ADDED' | 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'AI_DRAFT_READY' | 'AI_PROJECT_READY'
  title: string
  message: string
  actorId: number | null
  projectId: number | null
  taskId: number | null
  scheduleId: number | null
  createdAt: string
  readAt: string | null
}
export type NotificationPageResponse = { content: AppNotification[]; totalElements: number; totalPages: number; page: number; size: number; unreadCount: number }

export type AiGenerationJob = { id: string; requesterId: number; requesterName: string; filename: string; assignmentMode: string; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN'; createdAt: string; startedAt: string | null; finishedAt: string | null; durationMs: number | null; scheduleId: number | null; errorCode: string | null; message: string | null }
