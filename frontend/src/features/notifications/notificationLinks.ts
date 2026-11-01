import type { AppNotification } from '../../api/models'

export function notificationPath(notification: AppNotification): string {
  if (notification.taskId) return `/tasks/${notification.taskId}`
  if (notification.scheduleId) return `/ai-planner?scheduleId=${notification.scheduleId}`
  if (notification.projectId) return `/projects/${notification.projectId}`
  return '/notifications'
}

export function notificationTone(notification: AppNotification): string {
  if (notification.type === 'TASK_COMPLETED') return 'green'
  if (notification.type.startsWith('AI_')) return 'purple'
  return 'blue'
}
