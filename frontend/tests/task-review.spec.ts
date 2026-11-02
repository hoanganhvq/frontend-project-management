import { test, expect } from '@playwright/test'

test('review persists on the board, stays open in dashboard, and is available in forms and filters', async ({ page }) => {
  const tasks = [
    { id: 7, title: 'Implement API', status: 'todo' },
    { id: 8, title: 'Check permissions', status: 'review' },
    { id: 9, title: 'Completed task', status: 'done' },
  ].map(task => ({ ...task, projectId: 4, groupId: null, parentTaskId: null, description: '', startDate: null,
    endDate: null, priority: 'medium', progress: task.status === 'done' ? 100 : 50, assignees: [], createdAt: '' }))
  const updates: unknown[] = []
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let body: unknown = []
    if (path === '/api/auth/me') body = { id: 1, name: 'Alice', email: 'alice@example.test', role: 'USER' }
    if (path === '/api/projectmembers/projects') body = [{ id: 4 }]
    if (path === '/api/projects/4') body = { id: 4, name: 'Review project', owner: { id: 1 }, status: 'in_progress' }
    if (path === '/api/tasks/project/4') body = tasks
    if (path === '/api/tasks/7' && route.request().method() === 'PUT') {
      const change = route.request().postDataJSON()
      updates.push(change)
      Object.assign(tasks[0], change)
      body = tasks[0]
    }
    if (path === '/api/notifications') body = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 4, unreadCount: 0 }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/tasks')
  const review = page.locator('.kanban-column--purple')
  await expect(review.getByRole('heading', { name: 'Review', exact: true })).toBeVisible()
  await expect(review.locator('.task-card')).toHaveCount(1)
  await page.getByRole('combobox', { name: 'Move Implement API to column' }).selectOption('review')
  await expect(review.locator('.task-card')).toHaveCount(2)
  expect(updates[0]).toMatchObject({ status: 'review', progress: 50 })
  await page.reload()
  await expect(review.locator('.task-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Add task to Review', exact: true }).click()
  await expect(page.locator('#task-status')).toHaveValue('review')
  await page.keyboard.press('Escape')
  await page.goto('/dashboard')
  await expect(page.locator('.metric-card').filter({ has: page.getByText('Open tasks', { exact: true }) }).locator('strong')).toHaveText('2')
  await expect(page.locator('.metric-card').filter({ hasText: 'Completed tasks' }).locator('strong')).toHaveText('1')
  await page.goto('/projects/4')
  await page.locator('#project-task-status').selectOption('review')
  await expect(page.getByRole('row', { name: /Implement API.*Review/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Check permissions.*Review/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Completed task/ })).toHaveCount(0)
})
