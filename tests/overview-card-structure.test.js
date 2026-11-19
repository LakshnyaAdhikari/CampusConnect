import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const overview = await readFile(new URL('../src/features/admin/components/OverviewPanel.jsx', import.meta.url), 'utf8')
const adminService = await readFile(new URL('../src/features/admin/service.js', import.meta.url), 'utf8')
const moderationPanel = await readFile(new URL('../src/features/admin/components/ReportsModerationPanel.jsx', import.meta.url), 'utf8')

test('Overview omits only the Under Review metric while retaining the other report cards', () => {
  assert.doesNotMatch(overview, /underReviewReports|title="Under review"/)
  assert.doesNotMatch(adminService, /underReviewReports/)
  assert.match(overview, /title="Pending reports"/)
  assert.match(overview, /title="Resolved reports"/)
  assert.match(overview, /title="Dismissed reports"/)
  assert.match(moderationPanel, /Mark under review/)
})
