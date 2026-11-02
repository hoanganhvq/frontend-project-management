import { test, expect } from '@playwright/test'

test('chat sends project scope and history, and restores questions after a failed request', async ({ page }) => {
  const messages: Array<{ message: string; projectId: number | null; previousQuestions: string[] }> = []
  let fail = false
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let body: unknown = []
    if (path === '/api/auth/me') body = { id: 1, name: 'Alice', email: 'alice@example.test', role: 'USER' }
    if (path === '/api/projectmembers/projects') body = [{ id: 4 }]
    if (path === '/api/projects/4') body = { id: 4, name: 'Chat project', owner: { id: 1 }, status: 'in_progress' }
    if (path === '/api/notifications') body = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 4, unreadCount: 0 }
    if (path === '/api/chat/messages') {
      messages.push(route.request().postDataJSON())
      if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      body = { answer: 'Start with the dependencies.', relatedTaskIds: [], relatedProjectIds: ['4'] }
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Open project help', exact: true }).click()
  const chat = page.getByRole('dialog', { name: 'Project help', exact: true })
  const question = chat.locator('#chat-message')
  await question.fill('What should I do first?')
  await question.press('Enter')
  await expect(chat.locator('.chat-widget__message--assistant')).toContainText('Start with the dependencies.')
  expect(messages[0]).toEqual({ message: 'What should I do first?', projectId: null, previousQuestions: [] })
  await question.fill('Why?')
  await question.press('Enter')
  await expect(chat.locator('.chat-widget__message--assistant')).toHaveCount(2)
  expect(messages[1].previousQuestions).toEqual(['What should I do first?'])
  await chat.locator('#chat-project').selectOption('4')
  await expect(chat.locator('.chat-widget__message')).toHaveCount(0)
  fail = true
  await question.fill('Check this project')
  await question.press('Enter')
  await expect(chat.getByRole('alert')).toBeVisible()
  await expect(question).toHaveValue('Check this project')
  await expect(chat.locator('.chat-widget__message')).toHaveCount(0)
  fail = false
  await question.press('Enter')
  await expect(chat.locator('.chat-widget__message--assistant')).toHaveCount(1)
  expect(messages.at(-1)).toEqual({ message: 'Check this project', projectId: 4, previousQuestions: [] })
  await chat.getByRole('button', { name: 'Chat project', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/4$/)
})
