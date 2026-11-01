import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5187',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    env: { VITE_API_BASE_URL: '' },
    reuseExistingServer: true,
  },
})
