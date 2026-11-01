import { test, expect, type Page } from '@playwright/test'

type Notice = { id: number; type: string; title: string; message: string; actorId: number | null; projectId: number | null; taskId: number | null; scheduleId: number | null; createdAt: string; readAt: string | null }

function notice(id: number, overrides: Partial<Notice> = {}): Notice {
  return { id, type: 'TASK_ASSIGNED', title: `Assignment ${id}`, message: 'Review the login implementation.', actorId: 2, projectId: 4, taskId: 7, scheduleId: null, createdAt: new Date(2026, 9, 29, 12, 0, id).toISOString(), readAt: null, ...overrides }
}

async function mockApi(page: Page, notices: Notice[]) {
  const state = { notices, failRead: false, projectAccessible: false }
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    const method = route.request().method()
    const json = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    if (path === '/api/auth/me') return json({ id: 1, name: 'Alice', email: 'alice@example.test', role: 'USER', position: 'Developer', photo: null })
    if (path === '/api/projects/4') {
      if (!state.projectAccessible) return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
      return json({ id: 4, name: 'Newly joined project', description: 'Membership was granted after login.', owner: { id: 2, name: 'Owner' }, status: 'active', startDate: null, endDate: null })
    }
    if (path === '/api/notifications/read-all') {
      state.notices.forEach((item) => { item.readAt ??= new Date().toISOString() })
      return route.fulfill({ status: 204 })
    }
    const read = path.match(/^\/api\/notifications\/(\d+)\/read$/)
    if (read && method === 'PATCH') {
      if (state.failRead) return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      const item = state.notices.find((item) => item.id === Number(read[1]))!
      item.readAt ??= new Date().toISOString()
      return json(item)
    }
    if (path === '/api/notifications') {
      const size = Number(url.searchParams.get('size') || 20)
      const pageIndex = Number(url.searchParams.get('page') || 0)
      const filtered = state.notices.filter((item) => url.searchParams.get('unreadOnly') !== 'true' || !item.readAt).sort((a, b) => b.id - a.id)
      return json({ content: filtered.slice(pageIndex * size, (pageIndex + 1) * size), totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size), page: pageIndex, size, unreadCount: state.notices.filter((item) => !item.readAt).length })
    }
    if (path === '/api/ai-schedules/8') return json({ id: 8, status: 'pending', sessionId: 'session', createdAt: new Date().toISOString(), scheduleData: { project: { name: 'Orbit draft' }, newGroups: [{ tempId: 'be', name: 'Backend', memberIds: [] }], tasks: [{ title: 'Login', groupTempId: 'be', assigneeIds: [] }] } })
    return json([])
  })
  return state
}

test('bell and page share unread state and read-all survives reload', async ({ page }) => {
  await mockApi(page, [notice(1), notice(2), notice(3, { readAt: new Date().toISOString() })])
  await page.goto('/notifications')
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Notifications, 2 unread', exact: true }).click()
  const popover = page.getByRole('dialog', { name: 'Recent notifications' })
  await expect(popover).toContainText('Assignment 2')
  await popover.getByRole('button', { name: 'Mark all read', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread', exact: true })).toBeVisible()
  await expect(page.locator('.notifications-item--unread')).toHaveCount(0)
})

test('unread filter removes a read item and pagination loads the next page', async ({ page }) => {
  await mockApi(page, Array.from({ length: 23 }, (_, index) => notice(index + 1)))
  await page.goto('/notifications')
  await expect(page.locator('.notifications-item')).toHaveCount(20)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.locator('.notifications-item')).toHaveCount(3)
  await page.getByRole('button', { name: 'Unread', exact: true }).click()
  const item = page.locator('.notifications-item').filter({ hasText: 'Assignment 23' })
  await item.getByRole('button', { name: 'Mark read', exact: true }).click()
  await expect(item).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Notifications, 22 unread', exact: true })).toBeVisible()
})

test('ready-draft notification opens the exact draft in AI Planner', async ({ page }) => {
  await mockApi(page, [notice(1, { type: 'AI_DRAFT_READY', title: 'AI draft is ready', projectId: null, taskId: null, scheduleId: 8 })])
  await page.goto('/notifications')
  await page.locator('.notifications-item__open').click()
  await expect(page).toHaveURL(/\/ai-planner\?scheduleId=8$/)
  await expect(page.locator('#ai-project-name')).toHaveValue('Orbit draft')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread', exact: true })).toBeVisible()
})

test('failed mark-read keeps notification unread and displays retry feedback', async ({ page }) => {
  const state = await mockApi(page, [notice(1)])
  state.failRead = true
  await page.goto('/notifications')
  await page.getByRole('button', { name: 'Mark read', exact: true }).click()
  await expect(page.getByText('The service could not complete this request. Please try again.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread', exact: true })).toBeVisible()
  state.failRead = false
  await page.getByRole('button', { name: 'Mark read', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread', exact: true })).toBeVisible()
})

test('poll refreshes unread count while the page is visible', async ({ page }) => {
  await page.clock.install()
  const state = await mockApi(page, [notice(1)])
  await page.goto('/notifications')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread', exact: true })).toBeVisible()
  state.notices.push(notice(2))
  await page.clock.fastForward(30_000)
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread', exact: true })).toBeVisible()
})

test('mobile notifications fit the viewport and remain usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page, [notice(1, { title: 'Deadline and priority changed', message: 'A longer notification message that should wrap within the screen without causing horizontal scrolling.' })])
  await page.goto('/notifications')
  await expect(page.locator('.notifications-item')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('notifications-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Mark read', exact: true }).click()
  await expect(page.locator('.notifications-item--unread')).toHaveCount(0)
})

for (const entry of ['page', 'bell'] as const) {
  test(`new project membership opens from the ${entry} without reloading a stale workspace`, async ({ page }) => {
    const state = await mockApi(page, [])
    let documentLoads = 0
    page.on('request', (request) => { if (request.resourceType() === 'document') documentLoads += 1 })
    await page.goto('/notifications')
    await expect(page.getByText('No notifications yet', { exact: true })).toBeVisible()
    // The initial visible-project list is empty, and stays empty in the mock to catch cache-only lookups.
    state.projectAccessible = true
    state.notices.push(notice(1, { type: 'PROJECT_MEMBER_ADDED', title: 'Added to a project', taskId: null }))
    if (entry === 'page') {
      await page.getByRole('button', { name: 'Refresh', exact: true }).click()
      await page.locator('.notifications-item__open').click()
    } else {
      await page.getByRole('button', { name: 'Notifications, 0 unread', exact: true }).click()
      await page.getByRole('dialog', { name: 'Recent notifications' }).getByRole('button').filter({ hasText: 'Added to a project' }).click()
    }
    await expect(page).toHaveURL(/\/projects\/4$/)
    await expect(page.getByRole('heading', { name: 'Newly joined project', exact: true })).toBeVisible()
    await expect(page.getByText('Project unavailable', { exact: true })).toHaveCount(0)
    expect(documentLoads).toBe(1)
    await page.getByRole('button', { name: 'All projects', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Newly joined project/ })).toBeVisible()
  })
}

test('missing cached project still requires backend permission and supports retry', async ({ page }) => {
  const state = await mockApi(page, [notice(1, { type: 'PROJECT_MEMBER_ADDED', title: 'Added to a project', taskId: null })])
  await page.goto('/notifications')
  await page.locator('.notifications-item__open').click()
  await expect(page.getByText('Your account does not have permission for this action.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Newly joined project', exact: true })).toHaveCount(0)
  state.projectAccessible = true
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Newly joined project', exact: true })).toBeVisible()
})
