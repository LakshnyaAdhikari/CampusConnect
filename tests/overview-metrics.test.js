import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  retryMetricLoader,
  settleMetricLoaders,
  sumMetricResults,
  unavailableMetric,
} from '../src/features/admin/overview-metrics.js'

test('one permission-denied metric does not block successful Overview metrics', async () => {
  const metrics = await settleMetricLoaders({
    discoverableStudents: async () => 8,
    publicSpaces: async () => 2,
    pendingReports: async () => { throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }) },
    resolvedReports: async () => 0,
  })

  assert.deepEqual(metrics.discoverableStudents, { status: 'success', value: 8, metric: 'discoverableStudents' })
  assert.deepEqual(metrics.publicSpaces, { status: 'success', value: 2, metric: 'publicSpaces' })
  assert.deepEqual(metrics.pendingReports, {
    status: 'error', code: 'permission-denied',
    message: 'Missing or insufficient permissions.', metric: 'pendingReports',
  })
  assert.deepEqual(metrics.resolvedReports, { status: 'success', value: 0, metric: 'resolvedReports' })
})

test('settled metrics are published before slower Overview requests finish', async () => {
  let resolveSlow
  const settled = []
  const pending = settleMetricLoaders({
    slowSpaceCount: () => new Promise(resolve => { resolveSlow = resolve }),
    fastStudentCount: async () => 8,
  }, (metric, result) => settled.push([metric, result]))

  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(settled.map(([metric]) => metric), ['fastStudentCount'])
  resolveSlow(2)
  await pending
  assert.deepEqual(settled.map(([metric]) => metric), ['fastStudentCount', 'slowSpaceCount'])
})

test('retry invokes only the failed metric loader', async () => {
  let pendingCalls = 0
  let studentCalls = 0
  const [metric, result] = await retryMetricLoader({
    pendingReports: async () => { pendingCalls += 1; return 3 },
    discoverableStudents: async () => { studentCalls += 1; return 8 },
  }, 'pendingReports')

  assert.equal(metric, 'pendingReports')
  assert.deepEqual(result, { status: 'success', value: 3, metric: 'pendingReports' })
  assert.equal(pendingCalls, 1)
  assert.equal(studentCalls, 0)
})

test('visible Space totals remain unavailable when either component failed', () => {
  const result = sumMetricResults(
    { status: 'success', value: 2, metric: 'publicSpaces' },
    { status: 'error', code: 'permission-denied', message: 'Denied', metric: 'campusSpaces' },
  )
  assert.equal(result.status, 'error')
  assert.equal(result.code, 'permission-denied')
  assert.deepEqual(result.failedMetrics, ['campusSpaces'])
})

test('unsupported schema metrics use an explicit unavailable state', () => {
  assert.deepEqual(unavailableMetric('No active-state field exists.'), {
    status: 'unavailable', reason: 'No active-state field exists.',
  })
})
