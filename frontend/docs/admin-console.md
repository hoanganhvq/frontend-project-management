# Admin console

Routes: `/admin` (overview), `/admin/users` (accounts), `/admin/projects` (project inspection and explicit ownership transfer), `/admin/audit-logs` (read-only administration history), `/admin/ai-jobs` (AI processing monitor).

The main sidebar exposes **Quản trị hệ thống** only when `/api/auth/me` returns `role: "ADMIN"`. Direct access by a USER shows an access-denied page without requesting admin data; BE independently checks every admin API. Admin is never an assignable project role.

The administration layout has its own navigation and does not mount the regular workspace loader, notification poller or chatbot. Visiting admin pages does not fetch every project/task in the system. **Về không gian làm việc** restores the ordinary app layout.

## Features

- Overview: real aggregate counts and status distributions, including Review separately from Done.
- Users: server-side search (300 ms debounce), role/active filters, pagination, detail and work references; create, edit, confirm role changes, disable/enable and eligible deletion. Mutations refresh the current list only. Self edits refresh authentication; self demotion exits admin access.
- Projects: server-side name/owner search, status filter, pagination and member/task aggregates. Detail is loaded on demand and shows description, dates, owner, members, groups, tasks and assignees without edit controls. The workspace link appears only when the viewer owns or belongs to that project; original BE project rules still apply there.
- Layout supports mobile, keyboard navigation, native accessible dialogs and loading/error/empty states. Wide tables scroll within their container on narrow screens.

Start BE first after its schema update, then run `npm run dev` and sign in using a system ADMIN account. No additional frontend env variables or hardcoded credentials are required.

`tests/admin.spec.ts` covers route access, absence of eager workspace loading, CRUD and account state/role mutations, conflicts, read-only project inspection, and mobile overflow. Screenshots are saved under ignored `test-results`. API responses are mocked in browser tests; BE integration tests cover persistence/security separately.

## Phase 2

- `/admin/audit-logs`: paginated read-only history with text/action/date filters and actor/target snapshots.
- `/admin/projects`: explicit **Chuyển Owner** action with active-member search, reason and final confirmation. A stale current-owner value is rejected by BE; owner-only rights move to the recipient, while the former owner remains a Leader.
- `/admin/ai-jobs`: paginated generation metadata, filters and a 10-second refresh while visible. UNKNOWN is shown separately from failure; the UI never links an admin to another user's private draft.
- PDF generation now uses authenticated `POST /api/ai-jobs` and polls its own job endpoint. Navigation aborts only browser polling, not BE processing. A successful job opens its exact verified schedule ID instead of loading whichever draft happens to be latest.
- Backend n8n URL and upload limits are documented in `project-management/docs/admin-phase2.md`. Start/restart BE with those settings before testing generation. No new FE secrets are required.

`tests/admin-phase2.spec.ts` covers audit filters, transfers/conflicts, live job statuses and generation polling with mocked APIs.
