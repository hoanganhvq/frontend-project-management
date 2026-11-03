import { test, expect } from '@playwright/test'

test('all admin lists page on the server and reset page when row count changes', async ({ page }) => {
  const requests: Array<{ path: string; page: number; size: number }> = []
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 1, name: 'Admin', email: 'admin@test.dev', role: 'ADMIN' } })
    const current = Number(url.searchParams.get('page') || 0), size = Number(url.searchParams.get('size') || 20)
    requests.push({ path, page: current, size })
    const rows = Array.from({ length: 43 }, (_, index) => ({ id: index + 1, name: `Record ${index + 1}`, email: `user${index}@test.dev`, role: 'USER', active: true,
      ownerId: 2, ownerName: 'Owner', status: path.endsWith('ai-jobs') ? 'UNKNOWN' : 'in_progress', memberCount: 1, taskCount: 0, actionableTasks: 0, completedTasks: 0,
      actorId: 1, actorName: `Actor ${index + 1}`, targetUserId: 2, targetName: 'User', action: 'USER_UPDATED', createdAt: '2026-11-03T00:00:00Z',
      requesterId: 1, requesterName: 'Admin', filename: `File ${index + 1}.pdf`, assignmentMode: 'AUTO', startedAt: null, finishedAt: null, durationMs: null, scheduleId: null, errorCode: null, message: null }))
    await route.fulfill({ json: { content: rows.slice(current * size, (current + 1) * size), totalElements: rows.length, totalPages: Math.ceil(rows.length / size), page: current, size } })
  })
  for (const section of ['users', 'projects', 'audit-logs', 'ai-jobs']) {
    await page.goto(`/admin/${section}`)
    const pager = page.locator('.admin-pagination')
    await expect(page.locator('.admin-table tbody tr')).toHaveCount(20)
    const first = await page.locator('.admin-table tbody tr').first().textContent()
    await pager.getByRole('button', { name: 'Sau', exact: true }).click()
    await expect(pager.getByRole('spinbutton', { name: 'Trang', exact: true })).toHaveValue('2')
    await expect.poll(() => requests.at(-1)?.page).toBe(1)
    await expect(page.locator('.admin-table tbody tr').first()).not.toHaveText(first!)
    await pager.getByRole('combobox').selectOption('10')
    await expect.poll(() => requests.at(-1)?.size).toBe(10)
    expect(requests.at(-1)?.page).toBe(0)
    await expect(page.locator('.admin-table tbody tr')).toHaveCount(10)
    await pager.getByRole('button', { name: 'Trang cu\u1ed1i' }).click()
    await expect(page.locator('.admin-table tbody tr')).toHaveCount(3)
    await expect(pager.getByRole('button', { name: 'Sau', exact: true })).toBeDisabled()
    await pager.getByRole('button', { name: 'Trang \u0111\u1ea7u' }).click()
    await expect(page.locator('.admin-table tbody tr')).toHaveCount(10)
    await pager.getByRole('spinbutton', { name: 'Trang', exact: true }).fill('3')
    await expect.poll(() => requests.at(-1)?.page).toBe(2)
    if (section === 'projects') {
      await page.locator('.admin-table tbody tr').first().getByRole('button', { name: 'Chuy\u1ec3n Owner', exact: true }).click()
      const dialog = page.getByRole('dialog').first()
      await expect(dialog.getByRole('radio')).toHaveCount(20)
      await dialog.locator('.admin-pagination').getByRole('button', { name: 'Sau', exact: true }).click()
      await expect.poll(() => requests.at(-1)?.page).toBe(1)
      await dialog.locator('.admin-pagination').getByRole('combobox').selectOption('50')
      await expect(dialog.getByRole('radio')).toHaveCount(43)
      expect(requests.at(-1)?.size).toBe(50); expect(requests.at(-1)?.page).toBe(0)
      await page.keyboard.press('Escape')
    }
  }
})
