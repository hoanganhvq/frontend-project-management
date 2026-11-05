import { test, expect, type Page } from '@playwright/test'

async function fixture(page: Page) {
  const state = { skills: [{ skillId: 1, name: 'Java', category: 'backend', level: 'beginner' }], writes: 0, fail: false }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 7, name: 'Alice', email: 'alice@test.dev', role: 'USER', position: 'Developer' } })
    if (path === '/api/skills') return route.fulfill({ json: [{ id: 1, name: 'Java', category: 'backend' }, { id: 2, name: 'React', category: 'frontend' }] })
    if (path === '/api/users/me/skills') {
      if (route.request().method() === 'PUT') {
        state.writes++
        if (state.fail) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
        state.skills = route.request().postDataJSON().skills.map((s: { skillId: number; level: string }) => ({ ...s, name: s.skillId === 1 ? 'Java' : 'React', category: s.skillId === 1 ? 'backend' : 'frontend' }))
      }
      return route.fulfill({ json: state.skills })
    }
    if (path === '/api/notifications') return route.fulfill({ json: { content: [], unreadCount: 0, totalElements: 0, totalPages: 0, page: 0, size: 4 } })
    return route.fulfill({ json: [] })
  })
  return state
}

test('profile adds skills, updates levels, cancels unsaved edits, reloads and clears saved skills', async ({ page }, testInfo) => {
  const state = await fixture(page)
  await page.goto('/profile')
  const panel = page.locator('.my-skills')
  await expect(panel.locator('li')).toHaveCount(1)
  await panel.locator('#profile-skill-picker').selectOption('2')
  await panel.getByRole('button', { name: 'Th\u00eam k\u1ef9 n\u0103ng' }).click()
  await panel.locator('#profile-skill-level-1').selectOption('advanced')
  await panel.locator('#profile-skill-level-2').selectOption('expert')
  await expect(panel.locator('#profile-skill-picker option[value="2"]')).toHaveCount(0)
  await panel.getByRole('button', { name: 'L\u01b0u k\u1ef9 n\u0103ng' }).click()
  await expect.poll(() => state.skills.map(s => s.level)).toEqual(['advanced', 'expert'])
  await page.reload()
  await expect(panel.locator('#profile-skill-level-2')).toHaveValue('expert')
  await panel.getByRole('button', { name: 'X\u00f3a k\u1ef9 n\u0103ng Java' }).click()
  await panel.getByRole('button', { name: 'H\u1ee7y thay \u0111\u1ed5i' }).click()
  await expect(panel.locator('li')).toHaveCount(2)
  expect(state.writes).toBe(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await panel.scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('profile-skills-mobile.png'), fullPage: true })
  await panel.getByRole('button', { name: 'X\u00f3a k\u1ef9 n\u0103ng Java' }).click()
  await panel.getByRole('button', { name: 'X\u00f3a k\u1ef9 n\u0103ng React' }).click()
  await panel.getByRole('button', { name: 'L\u01b0u k\u1ef9 n\u0103ng' }).click()
  await expect.poll(() => state.skills).toEqual([])
  await page.reload()
  await expect(panel.locator('li')).toHaveCount(0)
})

test('failed save keeps edits and allows retry', async ({ page }) => {
  const state = await fixture(page); state.fail = true
  await page.goto('/profile')
  const panel = page.locator('.my-skills')
  await panel.locator('#profile-skill-level-1').selectOption('expert')
  await panel.getByRole('button', { name: 'L\u01b0u k\u1ef9 n\u0103ng' }).click()
  await expect(panel.getByRole('alert')).toBeVisible()
  await expect(panel.locator('#profile-skill-level-1')).toHaveValue('expert')
  expect(state.skills[0].level).toBe('beginner')
  state.fail = false
  await panel.getByRole('button', { name: 'L\u01b0u k\u1ef9 n\u0103ng' }).click()
  await expect.poll(() => state.skills[0].level).toBe('expert')
})
