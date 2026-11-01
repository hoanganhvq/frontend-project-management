# Notifications

The bell and `/notifications` now read the authenticated user's server notifications. Read state persists on the backend. The page supports All/Unread filters, pagination, mark read, mark all read, and links to the corresponding task, project, or AI draft.

`NotificationProvider` refreshes the four most recent notifications and global unread count every 30 seconds while the tab is visible, on focus, and when opening the bell. Poll failures preserve the last loaded data and expose retry controls. Logging out unmounts the provider; switching users creates a fresh instance.

Draft notifications link to `/ai-planner?scheduleId=<id>`. The planner loads this exact pending draft through the existing owner-protected API. Deleted resources or lost project membership are handled by the destination API's normal error states.

When a project notification points to a project missing from the current workspace snapshot, the detail page fetches that project and its tasks from the protected backend endpoints, then merges them into the workspace. Newly granted membership therefore works without reloading the application. A rejected request displays an error with retry rather than treating the stale snapshot as authoritative.

## Running checks

```powershell
npm install
npm run build
npm run test:notifications
```

The Playwright suite starts its own Vite server on `127.0.0.1:5187`, mocks only root `/api/**` endpoints, and uses installed Microsoft Edge in headless mode. The tests do not call the project's configured backend or n8n. On a machine with a different installed browser, set `PLAYWRIGHT_CHANNEL` before running (for example `chrome`).

Checks cover shared bell/page read state, read-all across reloads, pagination and unread filtering, failed-write feedback and retry, opening the exact draft, polling, and mobile layout. Backend persistence and security tests live in the backend repository; see `project-management/docs/notifications.md`.
