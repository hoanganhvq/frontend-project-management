import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { AiScheduleResponse, ScheduleValidationReport } from '../src/api/models'

async function fixture(page: Page) {
  const data = JSON.parse(readFileSync(new URL('./fixtures/waterfall-small.json', import.meta.url), 'utf8')) as AiScheduleResponse['scheduleData']
  const state = { data, validation: { policyVersion: 'waterfall-review-v1', validationState: 'READY', issues: [] } as ScheduleValidationReport, writes: [] as AiScheduleResponse['scheduleData'][], fail: false, approvalRace: false, warningRace: false, approvals: 0, approvalPayloads: [] as Record<string, unknown>[], rejections: 0, taskWrites: [] as Record<string, unknown>[] }
  const tasks = [{ id: 7, projectId: 4, groupId: null, parentTaskId: null, title: 'Implement accounts', description: 'Account scope',
    startDate: '2026-11-12', endDate: '2026-11-15', progress: 0, priority: 'medium', status: 'todo', assignees: [], createdAt: '',
    phase: 'IMPLEMENTATION', deliverable: 'Working accounts', requirementIds: ['FR-AUTH-01'] }]
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    const method = route.request().method()
    let body: unknown = []
    if (path === '/api/auth/me') body = { id: 1, name: 'Alice', email: 'alice@example.test', role: 'USER' }
    if (path === '/api/projectmembers/projects') body = [{ id: 4 }]
    if (path === '/api/projects/4') body = { id: 4, name: 'Waterfall project', owner: { id: 1 }, status: 'in_progress' }
    if (path === '/api/tasks/project/4') body = tasks
    if (path === '/api/tasks/7' && method === 'PUT') {
      const update = route.request().postDataJSON(); state.taskWrites.push(update); Object.assign(tasks[0], update); body = tasks[0]
    }
    if (path === '/api/ai-schedules/pending') body = [{ id: 8, projectName: 'Waterfall draft', totalTasks: 8, totalGroups: 1 }]
    if (path === '/api/ai-schedules/members') body = [{ id: 2, name: 'Bob', position: 'Developer' }, { id: 3, name: 'Carol', position: 'Tester' }]
    if (path === '/api/ai-schedules/8') {
      if (method === 'PUT') {
        if (state.fail) return route.fulfill({ status: 400, json: { message: 'Waterfall: phase overlaps previous phase: TESTING' } })
        state.data = route.request().postDataJSON().scheduleData
        state.writes.push(state.data)
        body = { scheduleId: 8 }
      } else body = { id: 8, status: 'pending', sessionId: 'test-session', scheduleData: state.data, validation: state.validation }
    }
    if (path === '/api/ai-schedules/approve') {
      state.approvals++; state.approvalPayloads.push(route.request().postDataJSON())
      if (state.warningRace) {
        state.validation = { ...state.validation, reviewFingerprint: 'changed-draft' }
        return route.fulfill({ status: 422, json: { code: 'DRAFT_REVIEW_CONFIRMATION_REQUIRED', message: 'The draft changed. Review the latest validation and confirm again.', validation: state.validation } })
      }
      if (state.approvalRace) return route.fulfill({ status: 422, json: { message: 'Draft changed and needs review', validation: { ...state.validation, validationState: 'NEEDS_REVIEW', issues: [{ code: 'TASK_PHASE', message: 'Choose a valid phase.', path: '/tasks/3/phase', taskTitle: 'Implement accounts', requirementIds: [], severity: 'ERROR', blocksApproval: true }] } } })
      body = { success: true, projectId: 4, totalTasksInserted: 8, message: 'Project created' }
    }
    if (path === '/api/ai-schedules/reject') { state.rejections++; body = { success: true, message: 'Schedule rejected' } }
    if (path === '/api/notifications') body = { content: [], unreadCount: 0, totalElements: 0, totalPages: 0, page: 0, size: 4 }
    return route.fulfill({ json: body })
  })
  return state
}

function staffingWarning(): ScheduleValidationReport {
  return { policyVersion: 'waterfall-review-v2', validationState: 'READY', reviewFingerprint: 'reviewed-draft', issues: [{ code: 'UNASSIGNED_TASKS', message: 'Staffing will be completed after approval.', path: '/tasks', taskTitle: null, requirementIds: [], severity: 'WARNING', blocksApproval: false }] }
}

test('phase preview counts executable tasks separately and task panel edits the shared draft', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/ai-planner?scheduleId=8')
  const preview = page.getByRole('region', { name: 'Draft plan preview', exact: true })
  const parents = new Set(state.data.tasks!.map(task => task.parentTitle).filter(Boolean))
  await expect(preview.locator('.draft-preview-metrics > div').first()).toContainText(String(state.data.tasks!.filter(task => !parents.has(task.title)).length))
  await preview.getByRole('button', { name: 'Expand all', exact: true }).click()
  await preview.locator('.draft-preview-task').filter({ hasText: 'Implement accounts' }).click()
  const panel = page.locator('.draft-task-dialog')
  const originalDates = [state.data.tasks![3].startDate, state.data.tasks![3].endDate]
  await panel.getByLabel('Task title', { exact: true }).fill('Accounts revised by PM')
  await panel.getByLabel('Duration (calendar days)', { exact: true }).fill('2')
  await panel.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.data.tasks![3].title).toBe('Accounts revised by PM')
  expect(state.data.tasks![3].estimatedDurationDays).toBe(2)
  expect([state.data.tasks![3].startDate, state.data.tasks![3].endDate]).toEqual(originalDates)
  expect(state.data.tasks!.some(task => task.dependsOnTitles?.includes('Implement accounts'))).toBe(false)
  await panel.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(preview.locator('.draft-preview-task').filter({ hasText: 'Accounts revised by PM' })).toBeVisible()
  await page.reload()
  await preview.getByRole('button', { name: 'Expand all', exact: true }).click()
  await expect(preview.locator('.draft-preview-task').filter({ hasText: 'Accounts revised by PM' })).toBeVisible()
})

test('print report includes every collapsed task and safely renders source text', async ({ page }) => {
  const state = await fixture(page)
  state.data.tasks![3].description = '<img src=x onerror="window.pwned=true"> Mô tả tiếng Việt & scope'
  state.data.tasks![3].deliverable = 'Kết quả đầy đủ'
  await page.goto('/ai-planner?scheduleId=8')
  const preview = page.getByRole('region', { name: 'Draft plan preview', exact: true })
  const popupPromise = page.waitForEvent('popup')
  await preview.getByRole('button', { name: 'Print / Save PDF', exact: true }).click()
  const report = await popupPromise
  await expect(report.locator('article.task')).toHaveCount(state.data.tasks!.length)
  await expect(report.locator('body')).toContainText(state.data.tasks![3].description!)
  await expect(report.locator('body')).toContainText('Kết quả đầy đủ')
  await expect(report.locator('body')).toContainText('Draft — not approved')
  await expect(report.locator('img,script')).toHaveCount(0)
  expect(await report.evaluate(() => (window as Window & { pwned?: boolean }).pwned)).toBeUndefined()
  expect(state.writes).toHaveLength(0)
  await report.close()
})

test('Gantt keeps invalid and unphased work visible and exports complete SVG and PNG', async ({ page }) => {
  const state = await fixture(page)
  state.data.tasks![3].phase = null
  state.data.tasks![3].startDate = 'bad-date'
  state.validation = { policyVersion: 'waterfall-review-v2', validationState: 'NEEDS_REVIEW', issues: [{ code: 'TASK_START', message: 'Choose a valid start date.', path: '/tasks/3/startDate', taskTitle: 'Implement accounts', severity: 'ERROR', blocksApproval: true, requirementIds: [] }] }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/ai-planner?scheduleId=8')
  const preview = page.getByRole('region', { name: 'Draft plan preview', exact: true })
  await expect(preview).toContainText('Needs phase assignment')
  await preview.getByRole('tab', { name: 'Gantt', exact: true }).click()
  await preview.getByRole('button', { name: 'Expand all', exact: true }).click()
  const row = preview.getByRole('button', { name: 'Review Implement accounts', exact: true })
  await expect(row).toContainText('No valid dates')
  await row.click()
  const panel = page.getByRole('dialog', { name: 'Implement accounts', exact: true })
  await expect(panel).toContainText('Choose a valid start date.')
  await expect(panel.getByRole('button', { name: 'Recalculate plan dates', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await panel.getByRole('button', { name: 'Done', exact: true }).click()
  await preview.getByRole('button', { name: 'Collapse all', exact: true }).click()
  const svgPromise = page.waitForEvent('download')
  await preview.getByRole('button', { name: 'Download SVG', exact: true }).click()
  const svg = await svgPromise, contents = readFileSync((await svg.path())!, 'utf8')
  for (const task of state.data.tasks!) expect(contents).toContain(task.title)
  expect(contents).toContain('DRAFT — NOT APPROVED')
  expect(await page.evaluate(text => new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror') === null, contents)).toBe(true)
  const pngPromise = page.waitForEvent('download')
  await preview.getByRole('button', { name: 'Download PNG', exact: true }).click()
  const png = await pngPromise
  expect(readFileSync((await png.path())!).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(state.approvals).toBe(0)
})

test('warnings are separate from blockers and require explicit acceptance for this draft', async ({ page }) => {
  const state = await fixture(page); state.validation = staffingWarning()
  await page.goto('/ai-planner?scheduleId=8')
  const validation = page.getByRole('region', { name: 'Draft validation' })
  await expect(validation).toContainText('Ready with warnings')
  await expect(validation).toContainText('1 warnings')
  await expect(validation).not.toContainText('blocking issues')
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Review warnings before approval' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Accept warnings and approve' })).toBeDisabled()
  expect(state.approvals).toBe(0)
  await dialog.getByRole('button', { name: 'Back to draft' }).click()
  expect(state.approvals).toBe(0)
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Accept warnings and approve' }).click()
  await expect.poll(() => state.approvals).toBe(1)
  expect(state.approvalPayloads[0]).toMatchObject({ acceptWarnings: true, reviewFingerprint: 'reviewed-draft' })
  await expect(page.getByRole('heading', { name: 'Project created', exact: true })).toBeVisible()
})

test('a changed draft cannot reuse warning acceptance and requires a new unchecked confirmation', async ({ page }) => {
  const state = await fixture(page); state.validation = staffingWarning(); state.warningRace = true
  await page.goto('/ai-planner?scheduleId=8')
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Review warnings before approval' })
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Accept warnings and approve' }).click()
  await expect(page.getByRole('alert')).toContainText('draft changed')
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible()
  expect(state.approvals).toBe(1)
  state.warningRace = false
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Accept warnings and approve' }).click()
  await expect.poll(() => state.approvals).toBe(2)
  expect(state.approvalPayloads[1]).toMatchObject({ reviewFingerprint: 'changed-draft', acceptWarnings: true })
})

test('reviewable draft saves and reopens, links errors to fields, and blocks approval', async ({ page }) => {
  const state = await fixture(page)
  state.data.tasks![3].dependsOnTitles = ['Missing task']
  state.data.tasks![3].parentTitle = 'Missing parent'
  state.validation = { policyVersion: 'waterfall-review-v1', validationState: 'NEEDS_REVIEW', issues: [{ code: 'UNKNOWN_DEPENDENCY', message: 'Prerequisite does not exist: Missing task', path: '/tasks/3/dependsOnTitles', taskTitle: 'Implement accounts', requirementIds: [], severity: 'ERROR', blocksApproval: true }] }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/ai-planner?scheduleId=8')
  await page.getByRole('button', { name: /Prerequisite does not exist/ }).click()
  await expect(page.locator('#ai-task-dependencies-3')).toBeFocused()
  await expect(page.locator('#ai-task-parent-3')).toHaveValue('Missing parent')
  await page.locator('#ai-task-dependencies-3').selectOption([])
  await page.locator('#ai-task-parent-3').selectOption('')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Draft validation' })).toContainText('Draft needs review')
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Resolve the validation issues' })).toBeVisible()
  expect(state.approvals).toBe(0)
  state.validation = { policyVersion: 'waterfall-review-v1', validationState: 'READY', issues: [] }
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await expect.poll(() => state.approvals).toBe(1)
})

test('removing a group member requires confirmation and only clears that member in the affected group', async ({ page }) => {
  const state = await fixture(page)
  state.data.newGroups![0].memberIds = [2, 3]
  state.data.tasks![3].assigneeIds = [2, 3]
  state.data.newGroups!.push({ tempId: 'other', name: 'Other group', memberIds: [2] })
  state.data.tasks![6].groupTempId = 'other'
  state.data.tasks![6].assigneeIds = [2]
  await page.goto('/ai-planner?scheduleId=8')
  const member = page.locator('.planner-group-editor').first().getByRole('checkbox').first()
  await expect(member).toBeChecked()
  page.once('dialog', dialog => dialog.dismiss())
  await member.click()
  await expect(member).toBeChecked()
  page.once('dialog', dialog => dialog.accept())
  await member.uncheck()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.data.newGroups![0].memberIds).toEqual([3])
  expect(state.data.tasks![3].assigneeIds).toEqual([3])
  expect(state.data.tasks![6].assigneeIds).toEqual([2])
})

test('simple plan edits duration, recalculates phases and preserves optional source metadata', async ({ page }) => {
  const state = await fixture(page)
  state.data = JSON.parse(readFileSync(new URL('./fixtures/waterfall-simple.json', import.meta.url), 'utf8'))
  await page.goto('/ai-planner?scheduleId=8')
  await expect(page.getByLabel('Requirements covered')).toHaveCount(0)
  await page.getByLabel('View phase').selectOption('IMPLEMENTATION')
  await expect(page.locator('.planner-task-editor')).toHaveCount(2)
  await page.locator('.planner-task-editor').first().locator('summary').click()
  await page.locator('#ai-task-duration-3').fill('2')
  await page.getByRole('button', { name: 'Recalculate dates', exact: true }).click()
  await expect(page.locator('#ai-task-duration-3')).toHaveValue('2')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.data.tasks?.[3].estimatedDurationDays).toBe(2)
  const task = state.data.tasks![3]
  expect((Date.parse(task.endDate!) - Date.parse(task.startDate!)) / 86400000 + 1).toBe(2)
  expect(state.data.tasks?.some(task => task.phase === 'DEPLOYMENT')).toBe(true)
  await page.reload()
  await page.locator('.planner-task-editor').nth(2).locator('summary').click()
  await expect(page.locator('.planner-task-editor').nth(2)).toContainText('This is not work effort')
  await expect(page.getByLabel('Requirements covered')).toHaveCount(0)
})

test('approval race displays authoritative 422 issues and retains draft', async ({ page }) => {
  const state = await fixture(page); state.approvalRace = true
  await page.goto('/ai-planner?scheduleId=8')
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Draft validation' })).toContainText('Choose a valid phase.')
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible()
})

test('Waterfall draft retains metadata across editing, reload and approval', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/ai-planner?scheduleId=8')
  const coverage = page.getByRole('region', { name: 'Waterfall phases' })
  await expect(coverage.locator('.draft-preview-phase-toggle').filter({ hasText: 'Implementation' })).toContainText('2 tasks')
  await expect(page.getByLabel('Requirements covered')).toHaveCount(0)
  await page.locator('.planner-task-editor').nth(3).locator('summary').click()
  await expect(page.locator('#ai-task-phase-3')).toHaveValue('IMPLEMENTATION')
  await page.locator('#ai-task-deliverable-3').fill('Account capability ready for review')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.data.tasks?.[3]).toMatchObject({ phase: 'IMPLEMENTATION', requirementIds: ['FR-AUTH-01'], deliverable: 'Account capability ready for review' })
  expect(state.data.planningModel).toBe('WATERFALL')
  await page.reload()
  await page.locator('.planner-task-editor').nth(3).locator('summary').click()
  await expect(page.locator('#ai-task-deliverable-3')).toHaveValue('Account capability ready for review')
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await expect.poll(() => state.approvals).toBe(1)
})

test('failed validation keeps edits, focuses error and still allows rejection on mobile', async ({ page }, testInfo) => {
  const state = await fixture(page); state.fail = true
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ai-planner?scheduleId=8')
  await page.locator('.planner-task-editor').nth(4).locator('summary').click()
  await page.locator('#ai-task-start-4').fill('2026-11-16')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  const error = page.getByRole('alert').filter({ hasText: 'Waterfall: phase overlaps' })
  await expect(error).toBeFocused()
  await expect(page.locator('#ai-task-start-4')).toHaveValue('2026-11-16')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('waterfall-review-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect.poll(() => state.rejections).toBe(1)
  expect(state.writes).toHaveLength(0)
})

test('task status changes preserve metadata and phase edits reach the API', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/tasks')
  await expect(page.locator('.task-card').getByText('Implementation', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Move Implement accounts to column' }).selectOption('review')
  await expect.poll(() => state.taskWrites.length).toBe(1)
  expect(state.taskWrites[0]).toMatchObject({ phase: 'IMPLEMENTATION', requirementIds: ['FR-AUTH-01'], deliverable: 'Working accounts' })
  await page.getByRole('button', { name: 'Edit Implement accounts', exact: true }).click()
  await expect(page.locator('#task-phase')).toHaveValue('IMPLEMENTATION')
  await page.locator('#task-phase').selectOption('DESIGN')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect.poll(() => state.taskWrites.length).toBe(2)
  expect(state.taskWrites[1]).toMatchObject({ phase: 'DESIGN', requirementIds: ['FR-AUTH-01'] })
  await page.reload()
  await expect(page.locator('.task-card').getByText('Design', { exact: true })).toBeVisible()
})

test('computed dates and task repair explanations remain visible after saving and reopening', async ({ page }) => {
  const state = await fixture(page)
  state.data.planningDiagnostics = {
    version: '4.2.2', repairAttempts: 1, reviewRequired: true,
    dateAdjustments: [
      { taskTitle: 'Account module', startDate: '2026-11-12', endDate: '2026-11-15', newStartDate: '2026-11-12', newEndDate: '2026-11-19', reason: 'SUMMARY_ROLLUP' },
      { taskTitle: null, startDate: '2026-11-09', endDate: '2026-11-19', newStartDate: '2026-11-09', newEndDate: '2026-11-20', reason: 'PROJECT_END_ESTIMATE' },
    ],
    semanticChanges: [{ taskTitle: 'Verify menu', fields: ['requirementIds'], reason: 'Menu verification covers FR-MENU-01 behavior.' }],
  }
  await page.goto('/ai-planner?scheduleId=8')
  const notes = page.locator('details[aria-label="Schedule review notes"]')
  await notes.locator(':scope > summary').click()
  await expect(notes).toContainText('1 AI repair passes')
  await expect(notes.getByRole('status')).toContainText('project date estimate changed')
  await notes.getByText('View date adjustments', { exact: true }).click()
  await expect(notes.getByText('Parent dates now cover child tasks.')).toBeVisible()
  await notes.getByText('View task repairs', { exact: true }).click()
  await expect(notes.getByText('Menu verification covers FR-MENU-01 behavior.')).toBeVisible()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.writes[0].planningDiagnostics?.semanticChanges).toHaveLength(1)
  await page.reload()
  await notes.locator(':scope > summary').click()
  await expect(notes).toContainText('2 date adjustments')
  await page.setViewportSize({ width: 375, height: 812 })
  await notes.getByText('View task repairs', { exact: true }).click()
  await expect(notes.getByText('Menu verification covers FR-MENU-01 behavior.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Approve schedule', exact: true }).click()
  await expect.poll(() => state.approvals).toBe(1)
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
