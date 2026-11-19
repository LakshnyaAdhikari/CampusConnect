import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const indexConfig = JSON.parse(await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8'))
const key = index => JSON.stringify({
  collectionGroup: index.collectionGroup,
  queryScope: index.queryScope,
  fields: index.fields,
})

test('active Space count and discovery query indexes exist without duplicates', () => {
  const keys = indexConfig.indexes.map(key)
  assert.equal(new Set(keys).size, keys.length, 'index configuration contains duplicate definitions')

  const hasIndex = fieldPaths => indexConfig.indexes.some(index => (
    index.collectionGroup === 'spaces'
      && index.queryScope === 'COLLECTION'
      && index.fields.map(field => `${field.fieldPath}:${field.order || field.arrayConfig}`).join(',') === fieldPaths
  ))

  assert.equal(hasIndex('visibility:ASCENDING,isActive:ASCENDING,__name__:ASCENDING'), true)
  assert.equal(hasIndex('visibility:ASCENDING,campus:ASCENDING,isActive:ASCENDING,__name__:ASCENDING'), true)
})
