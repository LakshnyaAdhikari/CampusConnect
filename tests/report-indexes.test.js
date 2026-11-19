import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const indexes = JSON.parse(await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8'))
const service = await readFile(new URL('../src/features/admin/service.js', import.meta.url), 'utf8')
const reportsPanel = await readFile(new URL('../src/features/admin/components/ReportsModerationPanel.jsx', import.meta.url), 'utf8')

const indexKey = index => JSON.stringify({
  collectionGroup: index.collectionGroup,
  queryScope: index.queryScope,
  fields: index.fields,
})

const reportsIndex = fields => indexes.indexes.some(index => (
  index.collectionGroup === 'reports'
  && index.queryScope === 'COLLECTION'
  && index.fields.map(field => `${field.fieldPath}:${field.order || field.arrayConfig}`).join(',') === fields
))

test('Reports indexes cover every filter shape used by the paginated Reports query', () => {
  const keys = indexes.indexes.map(indexKey)
  assert.equal(new Set(keys).size, keys.length, 'Firestore index configuration contains duplicate definitions')

  assert.equal(reportsIndex('createdAt:DESCENDING,__name__:ASCENDING'), true, 'All statuses query')
  assert.equal(reportsIndex('category:ASCENDING,createdAt:DESCENDING,__name__:ASCENDING'), true, 'category and date filters')
  assert.equal(reportsIndex('status:ASCENDING,createdAt:DESCENDING,__name__:ASCENDING'), true, 'status and date filters')
  assert.equal(reportsIndex('status:ASCENDING,category:ASCENDING,createdAt:DESCENDING,__name__:ASCENDING'), true, 'status, category, and date filters')

  assert.match(service, /if \(filters\.status\)[\s\S]*where\('status', '==', filters\.status\)/)
  assert.match(service, /if \(filters\.category\)[\s\S]*where\('category', '==', filters\.category\)/)
  assert.match(service, /withDateBounds\(constraints, filters\.startDate, filters\.endDate\)/)
  assert.match(service, /orderBy\('createdAt', 'desc'\), orderBy\(documentId\(\)\), limit\(pageSize \+ 1\)/)
  assert.match(service, /startAfter\(Timestamp\.fromMillis\(cursor\.value\), cursor\.id\)/)
  assert.match(reportsPanel, /status: ''/)
})
