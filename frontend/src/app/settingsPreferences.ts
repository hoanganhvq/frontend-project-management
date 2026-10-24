export type SettingsLanguage = 'en' | 'vi' | 'ja'
export type SettingsTheme = 'light' | 'dark' | 'system'
export type SettingsAccent = 'violet' | 'blue' | 'teal'
export type SettingsDateFormat = 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd'
export type SettingsStartPage = 'dashboard' | 'projects' | 'my-tasks' | 'timeline' | 'ai-planner'
export type SettingsProjectView = 'list' | 'cards'

export type SettingsPreferences = {
  language: SettingsLanguage
  theme: SettingsTheme
  accent: SettingsAccent
  compact: boolean
  sidebarCollapsed: boolean
  dateFormat: SettingsDateFormat
  timeFormat: '12-hour' | '24-hour'
  timeZone: string
  numberLocale: 'en-US' | 'vi-VN' | 'ja-JP'
  weekStartsOn: 'monday' | 'sunday'
  startPage: SettingsStartPage
  defaultTaskStatus: 'todo' | 'in_progress' | 'done' | 'canceled'
  defaultProjectView: SettingsProjectView
  workspaceName: string
  workspaceDescription: string
  workspaceLogoDataUrl: string
  notificationInApp: boolean
  notificationAssignments: boolean
  notificationTaskUpdates: boolean
  notificationCommentsMentions: boolean
  notificationProjectUpdates: boolean
  notificationAiPlanner: boolean
  notificationEmail: boolean
  notificationDoNotDisturb: boolean
  weeklySummary: boolean
}

const STORAGE_KEY = 'orbitai.settings.v1'

export const defaultSettings: SettingsPreferences = {
  language: 'en', theme: 'light', accent: 'violet', compact: false, sidebarCollapsed: false,
  dateFormat: 'dd-mm-yyyy', timeFormat: '24-hour',
  timeZone: typeof Intl === 'undefined' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  numberLocale: 'en-US', weekStartsOn: 'monday', startPage: 'dashboard', defaultTaskStatus: 'todo',
  defaultProjectView: 'list', workspaceName: 'My workspace', workspaceDescription: '', workspaceLogoDataUrl: '',
  notificationInApp: true, notificationAssignments: true, notificationTaskUpdates: true,
  notificationCommentsMentions: true, notificationProjectUpdates: true, notificationAiPlanner: true,
  notificationEmail: true, notificationDoNotDisturb: false, weeklySummary: false,
}

export function getSettingsPreferences(): SettingsPreferences {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Record<string, unknown> | null
    const value = raw as Partial<SettingsPreferences> | null
    const validLanguage = value?.language === 'vi' || value?.language === 'ja' ? value.language : 'en'
    let timeZone = defaultSettings.timeZone
    try {
      if (typeof value?.timeZone === 'string') {
        new Intl.DateTimeFormat('en-US', { timeZone: value.timeZone })
        timeZone = value.timeZone
      }
    } catch { /* Ignore an invalid stored time zone. */ }
    const oldDateFormat = raw?.dateFormat as string | undefined
    const dateFormat: SettingsDateFormat = oldDateFormat === 'month-first' ? 'mm-dd-yyyy'
      : oldDateFormat === 'iso' ? 'yyyy-mm-dd'
        : oldDateFormat === 'dd-mm-yyyy' || oldDateFormat === 'mm-dd-yyyy' || oldDateFormat === 'yyyy-mm-dd' ? oldDateFormat : 'dd-mm-yyyy'
    const storedStartPage = raw?.startPage as string | undefined
    const startPage = storedStartPage === 'tasks' ? 'my-tasks'
      : storedStartPage === 'projects' || storedStartPage === 'my-tasks' || storedStartPage === 'timeline' || storedStartPage === 'ai-planner' ? storedStartPage : 'dashboard'
    return {
      ...defaultSettings, ...value, language: validLanguage, dateFormat, timeZone, startPage,
      timeFormat: value?.timeFormat === '12-hour' ? '12-hour' : '24-hour',
      numberLocale: value?.numberLocale === 'vi-VN' || value?.numberLocale === 'ja-JP' ? value.numberLocale : 'en-US',
      defaultTaskStatus: value?.defaultTaskStatus === 'in_progress' || value?.defaultTaskStatus === 'done' || value?.defaultTaskStatus === 'canceled' ? value.defaultTaskStatus : 'todo',
      defaultProjectView: value?.defaultProjectView === 'cards' ? 'cards' : 'list',
      workspaceName: typeof value?.workspaceName === 'string' ? value.workspaceName : defaultSettings.workspaceName,
      workspaceDescription: typeof value?.workspaceDescription === 'string' ? value.workspaceDescription : '',
      workspaceLogoDataUrl: typeof value?.workspaceLogoDataUrl === 'string' ? value.workspaceLogoDataUrl : '',
      notificationInApp: value?.notificationInApp ?? true,
      notificationAssignments: value?.notificationAssignments ?? true,
      notificationTaskUpdates: value?.notificationTaskUpdates ?? (typeof raw?.taskUpdates === 'boolean' ? raw.taskUpdates : true),
      notificationCommentsMentions: value?.notificationCommentsMentions ?? true,
      notificationProjectUpdates: value?.notificationProjectUpdates ?? true,
      notificationAiPlanner: value?.notificationAiPlanner ?? true,
      notificationEmail: value?.notificationEmail ?? true,
      notificationDoNotDisturb: value?.notificationDoNotDisturb ?? false,
      sidebarCollapsed: value?.sidebarCollapsed ?? false,
    }
  } catch {
    return defaultSettings
  }
}

export function saveSettingsPreferences(preferences: SettingsPreferences): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  applySettingsPreferences(preferences)
  window.dispatchEvent(new CustomEvent('app:settings-changed', { detail: preferences }))
}

export function applySettingsPreferences(preferences = getSettingsPreferences()): void {
  const root = document.documentElement
  root.dataset.themePreference = preferences.theme
  root.dataset.theme = preferences.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preferences.theme
  root.dataset.accent = preferences.accent
  root.dataset.density = preferences.compact ? 'compact' : 'comfortable'
  root.lang = preferences.language
  root.dataset.dateFormat = preferences.dateFormat
}

export function getDefaultLandingPath(): string {
  const startPage = getSettingsPreferences().startPage
  return {
    dashboard: '/dashboard', projects: '/projects', 'my-tasks': '/tasks',
    timeline: '/timeline', 'ai-planner': '/ai-planner',
  }[startPage]
}
