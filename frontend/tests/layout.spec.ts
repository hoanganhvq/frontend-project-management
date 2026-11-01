import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    const data = path === '/api/auth/me'
      ? { id: 1, name: 'Alice', email: 'alice@example.test', role: 'USER', position: 'Developer', photo: null }
      : path === '/api/notifications'
        ? { content: [], totalElements: 0, totalPages: 0, page: 0, size: 4, unreadCount: 0 }
        : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
})

test('desktop keeps one search and project branding without the unused workspace switcher', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/notifications')
  await expect(page).toHaveTitle('Quản lý dự án phần mềm tích hợp AI')
  await expect(page.locator('.sidebar .brand-name')).toContainText('Quản lý dự án')
  await expect(page.locator('.sidebar-search, .workspace-switcher')).toHaveCount(0)
  await expect(page.getByText('OrbitAI', { exact: true })).toHaveCount(0)
  const search = page.getByRole('textbox', { name: 'Search anything', exact: true })
  await expect(search).toBeVisible()
  await search.click()
  await page.getByRole('searchbox', { name: 'Search projects, tasks, and pages' }).fill('Projects')
  await page.getByRole('option').filter({ hasText: 'Browse all projects' }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Search anything', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('desktop-navigation.png'), fullPage: true })
})

test('mobile navigation and single search remain accessible', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/notifications')
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Primary navigation', exact: true })
  await expect.poll(() => navigation.evaluate((element) => Math.round(element.getBoundingClientRect().x))).toBe(0)
  await expect(navigation.locator('.brand-name')).toContainText('Quản lý dự án')
  await expect(navigation.locator('.sidebar-search, .workspace-switcher')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('mobile-navigation.png'), fullPage: true })
  await navigation.getByRole('button', { name: 'Close navigation', exact: true }).click()
  await page.getByRole('button', { name: 'Search anything', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: 'Search projects, tasks, and pages' })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('login uses project branding and fits a narrow screen', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await expect(page.getByRole('link', { name: 'Quản lý dự án phần mềm tích hợp AI', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Orbit')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
