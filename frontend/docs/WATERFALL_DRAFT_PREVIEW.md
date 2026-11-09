# Draft plan preview

Available in AI Planner for Waterfall drafts, including previously saved drafts.
The preview uses the current editor data; opening or exporting it does not save,
generate or approve anything. Backend validation and warning acceptance remain
authoritative at approval.

- By phase: five ordered phases with expandable task rows, dates, duration,
  assignees and deliverables. Summary containers are separated from executable
  counts/effort. Unphased or invalid-phase executable tasks remain visible in a
  needs-assignment section. Empty phases remain visible.
- Gantt: read-only dates, phase expansion, day/week/month scale and horizontal
  scrolling. All rows remain accessible, including tasks with invalid dates.
  Click a row/bar to open task details; no drag-to-change scheduling.
- Task side panel: changes the shared draft through the existing patch handler,
  including title-reference updates. Shows the saved task's validation and marks
  it stale after edits. Save persists normally; closing keeps local changes.
  Recalculate plan dates uses the existing deterministic planner, without AI.
  Hierarchy and priority editing remain in the full editor.
- Print / Save PDF: opens a separate print document with all phase/task details,
  summaries, validation, assumptions, export time and Draft/not-approved marking.
  Uses browser printing; it is not a server-generated PDF download. Pop-up
  blocking produces an actionable error. Source text is escaped, not rendered
  as HTML.
- SVG/PNG: export phase overview or every task independently of UI expansion.
  Uses local SVG/canvas, without an external export service. Full names are in
  SVG title metadata; long visible labels are abbreviated. Printable reports
  keep complete names/descriptions. PNG resolution is bounded for browser memory;
  SVG is preferable for very large plans.

Files reflect the current draft, including unsaved edits. Validation in exports
describes the last saved draft and is marked accordingly when there are edits.
Summary date spans include waiting, not extra work effort. Preview never repairs
or recalculates dates automatically.

Validation on 2026-11-09: frontend build and 13 Waterfall Playwright tests passed,
including shared edits, title-reference preservation, full collapsed report,
escaped HTML, invalid/unphased rows, mobile layout, SVG parsing and PNG download.
Two focused regression checks passed after extracting the shared recalculate
handler and refining the side panel. Test-only Vite on 5187 requires manual stop
in this Windows environment for runner teardown; application ports are unaffected.

Live FE/BE smoke used test-user13 draft103, stayed pending, preserved exact saved
data, produced PDF/SVG/PNG and raised no page errors. Existing user drafts were
not edited or approved. n8n v4.4.6 and backend require no preview changes.
