import { test, expect, type Page } from '@playwright/test'

async function mockAdmin(page: Page, systemRole = 'ADMIN') {
  const state = {
    users: [
      { id: 1, name: 'Admin', email: 'admin@example.test', position: 'Manager', role: 'ADMIN', active: true, photo: null, createdAt: '2026-11-01' },
      { id: 2, name: 'Alice', email: 'alice@example.test', position: 'Developer', role: 'USER', active: true, photo: null, createdAt: '2026-11-01' },
    ],
    requests: [] as string[],
    roleChanges: [] as string[],
  }
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    state.requests.push(`${route.request().method()} ${path}`)
    let body: unknown = []
    if (path === '/api/auth/me') body = { ...state.users[0], role: systemRole }
    if (path === '/api/notifications') body = { content: [], unreadCount: 0, totalElements: 0, totalPages: 0, page: 0, size: 4 }
    if (path === '/api/admin/overview') body = { users: state.users.length, activeUsers: 2, admins: 1, projects: 1, tasks: 2, projectStatuses: { in_progress: 1 }, taskStatuses: { review: 1, done: 1 } }
    if (path === '/api/admin/users') {
      if (route.request().method() === 'POST') {
        const { password: _password, ...input } = route.request().postDataJSON()
        const created = { id: 3, ...input, active: true, photo: null, createdAt: '2026-11-03' }
        state.users.push(created)
        body = created
      } else {
        const term = url.searchParams.get('query')?.toLowerCase() ?? ''
        const rows = state.users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(term)
          && (!url.searchParams.get('role') || user.role === url.searchParams.get('role'))
          && (!url.searchParams.get('active') || String(user.active) === url.searchParams.get('active')))
        body = { content: rows, totalElements: rows.length, totalPages: rows.length ? 1 : 0, page: 0, size: 20 }
      }
    }
    const userMatch = path.match(/^\/api\/admin\/users\/(\d+)(?:\/(role|active))?$/)
    if (userMatch) {
      const user = state.users.find(row => row.id === Number(userMatch[1]))!
      if (route.request().method() === 'DELETE') {
        state.users = state.users.filter(row => row.id !== user.id)
        return route.fulfill({ status: 204 })
      }
      if (userMatch[2] === 'role' && user.id === 1) return route.fulfill({ status: 409, body: 'The last active administrator cannot be disabled, demoted or deleted' })
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        Object.assign(user, route.request().postDataJSON())
        if (userMatch[2] === 'role') state.roleChanges.push(user.role)
        body = user
      } else body = { user, relatedData: { ownedProjects: user.id === 1 ? 1 : 0 }, canDelete: user.id !== 1, deleteBlockedReason: user.id === 1 ? 'This account owns projects.' : null }
    }
    if (path === '/api/admin/projects') body = { content: [{ id: 4, name: 'Project sample', ownerId: 2, ownerName: 'Alice', status: 'in_progress', startDate: null, endDate: null, memberCount: 1, taskCount: 2, completedTasks: 1, actionableTasks: 2 }], totalElements: 1, totalPages: 1, page: 0, size: 20 }
    if (path === '/api/projects/4') body = { id: 4, name: 'Project sample', description: 'Read-only project', owner: { id: 2, name: 'Alice' }, status: 'in_progress' }
    if (path === '/api/projectmembers/project/4') body = [{ id: 2, userId: 2, userName: 'Alice', roleName: 'OWNER' }]
    if (path === '/api/group/project/4') body = [{ id: 1, name: 'Backend' }]
    if (path === '/api/tasks/project/4') body = [{ id: 7, title: 'Review API', status: 'review', assignees: [] }]
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })
  return state
}

test('only system admin sees administration and direct USER navigation does not request admin data', async ({ page }) => {
  const state = await mockAdmin(page, 'USER')
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible()
  expect(state.requests.some(path => path.includes('/api/admin/'))).toBe(false)
  await page.getByRole('button', { name: 'Về không gian làm việc' }).click()
  await expect(page.getByRole('button', { name: 'Quản trị hệ thống' })).toHaveCount(0)
})

test('admin overview and navigation do not eagerly load the whole workspace', async ({ page }, testInfo) => {
  const state = await mockAdmin(page)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Tổng quan', exact: true })).toBeVisible()
  await expect(page.locator('.admin-metric')).toHaveCount(4)
  expect(await page.locator('.admin-sidebar nav svg').first().evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(24)
  await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible()
  expect(state.requests.some(path => path.includes('/api/projectmembers/projects'))).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('admin-overview-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Người dùng', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Người dùng', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('admin-users-mobile.png'), fullPage: true })
})

test('admin sidebar keeps identity visible while a long user list scrolls', async ({ page }) => {
  const state = await mockAdmin(page)
  state.users.push(...Array.from({ length: 18 }, (_, index) => ({ ...state.users[1], id: index + 3, name: `Member ${index}`, email: `member${index}@example.test` })))
  await page.setViewportSize({ width: 1440, height: 720 })
  await page.goto('/admin/users')
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(20)
  const footer = page.locator('.admin-sidebar-bottom')
  const before = await footer.boundingBox()
  expect(before!.y + before!.height).toBeLessThanOrEqual(720)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect.poll(async () => Math.round((await footer.boundingBox())!.y)).toBe(Math.round(before!.y))
  await expect(footer.getByText('ADMIN · Admin', { exact: true })).toBeInViewport()
  await expect(footer.getByRole('button')).toHaveCount(0)
})

test('admin can create, edit, lock, unlock, change system role and delete an unused user', async ({ page }) => {
  const state = await mockAdmin(page)
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Thêm người dùng', exact: true }).click()
  await page.locator('#admin-user-name').fill('New User')
  await page.locator('#admin-user-email').fill('new@example.test')
  await page.locator('#admin-user-password').fill('strong-password')
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Chi tiết New User' })).toBeVisible()
  await page.getByRole('button', { name: 'Chi tiết New User' }).click()
  await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click()
  await page.locator('#admin-user-name').fill('Updated User')
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click()
  await page.getByRole('button', { name: 'Chi tiết Updated User' }).click()
  await page.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mở khóa tài khoản', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mở khóa tài khoản', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.locator('#admin-change-role')).toBeVisible()
  await page.locator('#admin-change-role').selectOption('ADMIN')
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect.poll(() => state.roleChanges).toEqual(['ADMIN'])
  await expect(page.getByRole('button', { name: 'Xóa tài khoản', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Xóa tài khoản', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Chi tiết Updated User' })).toHaveCount(0)
})

test('linked accounts cannot be deleted and last-admin conflict is visible', async ({ page }) => {
  await mockAdmin(page)
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Chi tiết Admin', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Xóa tài khoản', exact: true })).toBeDisabled()
  await page.locator('#admin-change-role').selectOption('USER')
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('last active administrator')
})

test('admin can inspect projects without editing actions or owner privileges', async ({ page }) => {
  await mockAdmin(page)
  await page.goto('/admin/projects')
  await page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Project sample', exact: true })
  await expect(dialog.getByText('Review API', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Backend', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Mở trong không gian làm việc' })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /Delete|Edit|Assign/ })).toHaveCount(0)
})


test('admin signs in to administration even with a workspace redirect and preference', async ({ page }) => {
  const state = await mockAdmin(page)
  await page.addInitScript(() => localStorage.setItem('orbitai.settings.v1', JSON.stringify({ startPage: 'projects' })))
  await page.goto('/login?redirect=%2Fdashboard')
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.locator('.admin-metric')).toHaveCount(4)
  expect(state.requests.some(path => path.includes('/api/projectmembers/projects'))).toBe(false)
})

test('admin settings reuse account preferences without loading workspace data', async ({ page }) => {
  const state = await mockAdmin(page)
  await page.goto('/admin/settings')
  await expect(page.locator('#settings-display-name')).toHaveValue('Admin')
  await expect(page.locator('#settings-start-page')).toHaveCount(0)
  await page.locator('#settings-tab-appearance').click()
  await page.locator('.settings-theme-option--dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await page.locator('#settings-tab-appearance').click()
  await expect(page.locator('.settings-theme-option--dark')).toHaveAttribute('aria-pressed', 'true')
  expect(state.requests.some(path => path.includes('/api/projectmembers/projects'))).toBe(false)
})


test('admin workspace URLs return to administration without requesting workspace data', async ({ page }) => {
  const state = await mockAdmin(page)
  for (const path of ['/dashboard', '/', '/projects', '/tasks', '/ai-planner']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('.admin-metric')).toHaveCount(4)
  }
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/admin\/settings$/)
  await expect(page.locator('#settings-display-name')).toHaveValue('Admin')
  expect(state.requests.some(path => path.includes('/api/projectmembers/projects'))).toBe(false)
  await expect(page.locator('.admin-sidebar-bottom button')).toHaveCount(0)
})
