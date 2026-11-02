import { test, expect } from '@playwright/test'

test('board uses bundled assignees and updates task without reloading the workspace', async ({ page }) => {
  const requests: string[] = []
  let task = { id: 7, projectId: 4, groupId: null, parentTaskId: null, title: 'Batch assignments', description: '',
    startDate: null, endDate: null, progress: 0, priority: 'medium', status: 'todo', createdAt: '',
    assignees: [{ userId: 2, userName: 'Alice', avatarUrl: '/missing-avatar.png' },
      { userId: 3, userName: 'Bob', avatarUrl: null }, { userId: 4, userName: 'Carol', avatarUrl: null }] }
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    requests.push(`${route.request().method()} ${path}`)
    let body: unknown = []
    if (path === '/api/auth/me') body = { id: 1, name: 'Owner', email: 'owner@example.test', role: 'USER' }
    if (path === '/api/projectmembers/projects') body = [{ id: 4 }]
    if (path === '/api/projects/4') body = { id: 4, name: 'Project', owner: { id: 1 }, status: 'in_progress' }
    if (path === '/api/tasks/project/4') body = [task, { ...task, id: 8, title: 'No assignees', assignees: [] }]
    if (path === '/api/tasks/7' && route.request().method() === 'PUT') {
      task = { ...task, ...route.request().postDataJSON() }
      body = task
    }
    if (path === '/api/notifications') body = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 4, unreadCount: 0 }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/tasks')
  const card = page.locator('.task-card').filter({ hasText: 'Batch assignments' })
  await expect(card.getByRole('group', { name: 'Task assignees' })).toBeVisible()
  const alice = card.getByLabel('Alice', { exact: true })
  await expect(alice).toHaveText('AAlice') // Initials survive an invalid avatar URL.
  await alice.focus()
  await expect(card.locator('.task-assignee-tooltip').filter({ hasText: 'Alice' })).toBeVisible()
  await expect(card.getByLabel('More assignees: Carol')).toContainText('+1')
  await expect(page.locator('.task-card').filter({ hasText: 'No assignees' })).toContainText('Unassigned')
  await card.getByRole('combobox', { name: 'Move Batch assignments to column' }).selectOption('done')
  await expect(page.locator('.kanban-column--green .task-card').filter({ hasText: 'Batch assignments' })).toBeVisible()
  await expect(card.getByLabel('Alice', { exact: true })).toBeVisible()
  expect(requests.filter((request) => /\/assignees$/.test(request))).toHaveLength(0)
  expect(requests.filter((request) => request === 'GET /api/tasks/project/4')).toHaveLength(1)
  expect(requests.filter((request) => request === 'PUT /api/tasks/7')).toHaveLength(1)
})
