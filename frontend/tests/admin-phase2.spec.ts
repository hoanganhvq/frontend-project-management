import { test, expect, type Page } from '@playwright/test'

async function fixture(page: Page, role = 'ADMIN') {
  const state = { ownerId: 2, ownerName: 'Alice', transfer: null as unknown, failTransfer: false, auditRequests: [] as string[], jobReads: 0, jobState: 'RUNNING', upload: false, checks: 0, recover: true, failCheck: false }
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ id: 1, name: 'Admin', email: 'admin@example.test', role })
    if (path === '/api/notifications') return json({ content: [], unreadCount: 0, totalElements: 0, totalPages: 0, page: 0, size: 4 })
    if (path === '/api/admin/audit-logs') { state.auditRequests.push(url.search); return json({ content: [{ id: 1, actorId: 1, actorName: 'Admin', targetUserId: 3, targetName: 'Deleted user', projectId: 4, projectName: 'Project', previousOwnerId: 2, action: 'PROJECT_OWNER_TRANSFERRED', reason: 'Owner leaving', createdAt: '2026-11-03T01:00:00Z' }], totalElements: 1, totalPages: 1, page: 0, size: 20 }) }
    if (path === '/api/admin/projects') return json({ content: [{ id: 4, name: 'Project', ownerId: state.ownerId, ownerName: state.ownerName, status: 'in_progress', startDate: null, endDate: null, memberCount: 3, taskCount: 0, actionableTasks: 0, completedTasks: 0 }], totalElements: 1, totalPages: 1, page: 0, size: 20 })
    if (path === '/api/admin/projects/4/owner-candidates') return json({ content: [{ id: 3, name: 'Bob', email: 'bob@example.test', role: 'USER', active: true }], totalElements: 1, totalPages: 1, page: 0, size: 20 })
    if (path === '/api/admin/projects/4/owner') {
      state.transfer = route.request().postDataJSON()
      if (state.failTransfer) return route.fulfill({ status: 409, body: 'Owner changed. Refresh the project before transferring ownership.' })
      state.ownerId = 3; state.ownerName = 'Bob'; return json({ projectId: 4, ownerId: 3, previousOwnerId: 2, ownerName: 'Bob' })
    }
    const job = { id: '88888888-8888-8888-8888-888888888888', requesterId: 1, requesterName: 'Admin', filename: 'SRS.pdf', assignmentMode: 'UNASSIGNED', status: state.jobState, createdAt: '2026-11-03T01:00:00Z', startedAt: '2026-11-03T01:00:01Z', finishedAt: null, durationMs: null, scheduleId: state.jobState === 'SUCCEEDED' ? 8 : null, errorCode: null, message: null }
    if (path === `/api/admin/ai-jobs/${job.id}`) return json(job)
    if (path === `/api/admin/ai-jobs/${job.id}/reconcile`) {
      state.checks++
      if (state.failCheck) return json({ message: 'Check unavailable' }, 503)
      if (state.recover) state.jobState = 'SUCCEEDED'
      return json({ ...job, status: state.jobState, scheduleId: state.jobState === 'SUCCEEDED' ? 8 : null })
    }
    if (path === '/api/admin/ai-jobs') { state.jobReads++; return json({ content: [job], totalElements: 1, totalPages: 1, page: 0, size: 20 }) }
    if (path === '/api/ai-jobs') { state.upload = route.request().headers()['content-type'].includes('multipart/form-data'); return json({ ...job, status: 'QUEUED' }, 202) }
    if (path.startsWith('/api/ai-jobs/')) return json({ ...job, status: 'SUCCEEDED', scheduleId: 8 })
    if (path === '/api/ai-schedules/8') return json({ id: 8, status: 'pending', sessionId: 'session', createdAt: '2026-11-03', scheduleData: { project: { name: 'Exact generated draft' }, newGroups: [{ tempId: 'be', name: 'Backend', memberIds: [] }], tasks: [{ title: 'Login', groupTempId: 'be', assigneeIds: [] }] } })
    return json([])
  })
  return state
}

test('audit log filters include dates and display recorded ownership details without editing controls', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/audit-logs')
  await expect(page.getByRole('heading', { name: 'Nhật ký quản trị', exact: true })).toBeVisible()
  await expect(page.locator('.admin-table tbody')).toContainText('Owner leaving')
  await page.locator('#admin-report-filter').selectOption('PROJECT_OWNER_TRANSFERRED')
  await page.locator('#admin-audit-from').fill('2026-11-01')
  await page.locator('#admin-audit-to').fill('2026-11-03')
  await expect.poll(() => state.auditRequests.at(-1)).toContain('from=')
  await expect.poll(() => state.auditRequests.at(-1)).toContain('to=')
  await expect(page.getByRole('button', { name: /Xóa nhật ký|Sửa nhật ký/ })).toHaveCount(0)
})

test('ownership transfer confirms active member, expected owner and reason then refreshes the project', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/projects')
  await page.getByRole('button', { name: 'Chuyển Owner', exact: true }).click()
  await page.getByRole('radio', { name: /Bob/ }).check()
  await page.locator('#transfer-reason').fill('Owner leaving')
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Xác nhận chuyển Owner?' })).toContainText('Alice → Bob')
  await page.getByRole('button', { name: 'Xác nhận chuyển quyền', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Chuyển quyền sở hữu dự án', exact: true })).not.toBeVisible()
  expect(state.transfer).toEqual({ newOwnerId: 3, expectedOwnerId: 2, reason: 'Owner leaving' })
  await expect(page.locator('.admin-table tbody')).toContainText('Bob')
})

test('stale owner conflict is shown and does not close transfer confirmation', async ({ page }) => {
  const state = await fixture(page); state.failTransfer = true
  await page.goto('/admin/projects')
  await page.getByRole('button', { name: 'Chuyển Owner', exact: true }).click()
  await page.getByRole('radio', { name: /Bob/ }).check()
  await page.locator('#transfer-reason').fill('Owner leaving')
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận chuyển quyền', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Xác nhận chuyển Owner?' }).getByRole('alert')).toContainText('Owner changed')
})

test('AI job monitoring refreshes actual status and does not link to another users draft', async ({ page }) => {
  const state = await fixture(page)
  await page.clock.install()
  await page.goto('/admin/ai-jobs')
  await expect(page.locator('.admin-table tbody')).toContainText('Đang xử lý')
  state.jobState = 'SUCCEEDED'
  await page.clock.fastForward(10_000)
  await expect(page.locator('.admin-table tbody')).toContainText('Thành công')
  await expect(page.locator('.admin-table tbody')).toContainText('Draft #8')
  expect(state.jobReads).toBeGreaterThan(1)
  await expect(page.locator('.admin-table tbody a')).toHaveCount(0)
})

test('PDF generation submits authenticated BE job and opens the exact confirmed draft', async ({ page }) => {
  const state = await fixture(page, 'USER')
  await page.clock.install()
  await page.goto('/ai-planner')
  await page.locator('#srs-file').setInputFiles({ name: 'SRS.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })
  await page.getByRole('button', { name: 'Generate schedule', exact: true }).click()
  await expect.poll(() => state.upload).toBe(true)
  await page.clock.runFor(3100)
  await expect(page.locator('#ai-project-name')).toHaveValue('Exact generated draft')
})


test('admin opens job details and reconciles an unknown job without generating again', async ({ page }) => {
  const state = await fixture(page); state.jobState = 'UNKNOWN'
  await page.goto('/admin/ai-jobs')
  await page.getByRole('button', { name: 'Chi ti\u1ebft job SRS.pdf' }).click()
  const dialog = page.getByRole('dialog', { name: 'Chi ti\u1ebft AI job' })
  await expect(dialog).toContainText('88888888-8888-8888-8888-888888888888')
  await expect(dialog).toContainText('UNKNOWN')
  await dialog.getByRole('button', { name: 'Ki\u1ec3m tra l\u1ea1i k\u1ebft qu\u1ea3' }).click()
  await expect(dialog).toContainText('SUCCEEDED')
  await expect(dialog).toContainText('Draft #8')
  await expect(dialog.getByRole('button', { name: 'Ki\u1ec3m tra l\u1ea1i k\u1ebft qu\u1ea3' })).toHaveCount(0)
  await expect(page.locator('.admin-table tbody')).toContainText('Draft #8')
  expect(state.checks).toBe(1); expect(state.upload).toBe(false)
})

test('unmatched jobs stay unknown and check errors keep details open', async ({ page }) => {
  const state = await fixture(page); state.jobState = 'UNKNOWN'; state.recover = false
  await page.goto('/admin/ai-jobs')
  await page.getByRole('button', { name: 'Chi ti\u1ebft job SRS.pdf' }).click()
  const dialog = page.getByRole('dialog', { name: 'Chi ti\u1ebft AI job' })
  await dialog.getByRole('button', { name: 'Ki\u1ec3m tra l\u1ea1i k\u1ebft qu\u1ea3' }).click()
  await expect(dialog.getByRole('status')).toContainText('Job v\u1eabn ch\u01b0a x\u00e1c \u0111\u1ecbnh')
  state.failCheck = true
  await dialog.getByRole('button', { name: 'Ki\u1ec3m tra l\u1ea1i k\u1ebft qu\u1ea3' }).click()
  await expect(dialog.getByRole('alert')).toContainText('The service could not complete this request.')
  await expect(dialog).toBeVisible(); expect(state.upload).toBe(false)
})
